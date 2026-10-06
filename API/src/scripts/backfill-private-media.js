import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';
import { prisma } from '../shared/database/prisma.js';
import { backfillLegacyMedia } from '../modules/media/legacyMediaBackfill.js';
import { copyLegacyObjectIfAbsent } from '../modules/media/legacyMediaCopy.js';

const origins = [
  'https://media.podepedirppd.com.br',
  'https://pub-c2dea3d0b5554a8c84e2b523f53c51e7.r2.dev',
];
const apply = process.argv.includes('--apply');
const client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});
const send = command => client.send(command, { abortSignal: AbortSignal.timeout(10000) });

try {
  if (env.STORAGE_MODE !== 'r2' || env.R2_BUCKET !== 'trocalivros' || env.R2_ACCOUNT_ID !== 'dc24d4614b4cdabe6f5a097b88f52092') {
    throw new Error('TARGET_MISMATCH');
  }
  const [users, rows] = await Promise.all([
    prisma.user.findMany({
      where: { avatarStorageKey: null, avatarUrl: { not: null } },
      select: { id: true, avatarUrl: true, avatarVersion: true }, take: 101,
    }),
    prisma.bookImage.findMany({
      where: { storageKey: null, url: { not: null } },
      select: { id: true, url: true, bookId: true, book: { select: { ownerId: true } } }, take: 101,
    }),
  ]);
  if (users.length > 100 || rows.length > 100) throw new Error('BACKFILL_BATCH_TOO_LARGE');
  const result = await backfillLegacyMedia({
    users, images: rows.map(row => ({ ...row, ownerId: row.book.ownerId })),
    origins, dryRun: !apply,
    inspectObject: async key => {
      try {
        const head = await send(new HeadObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
        return { mimeType: head.ContentType, size: Number(head.ContentLength), etag: head.ETag };
      } catch (error) {
        if (error.$metadata?.httpStatusCode === 404) return null;
        throw error;
      }
    },
    copyObject: (source, destination, etag) => copyLegacyObjectIfAbsent({ client, bucket: env.R2_BUCKET, source, destination, etag }),
    // Held intents are never due automatically. Unknown results require reconciliation.
    holdCopy: key => prisma.storageCleanupJob.create({
      data: { storageKey: key, lastError: 'LEGACY_BACKFILL_RECONCILE_REQUIRED', nextAttemptAt: new Date('9999-12-31T00:00:00Z') },
    }),
    releaseCopy: key => prisma.storageCleanupJob.deleteMany({
      where: { storageKey: key, lastError: 'LEGACY_BACKFILL_RECONCILE_REQUIRED' },
    }),
    saveAvatar: async (row, data) => {
      const update = await prisma.user.updateMany({
        where: { id: row.id, avatarUrl: row.avatarUrl, avatarStorageKey: null, avatarVersion: row.avatarVersion }, data,
      });
      return update.count === 1;
    },
    saveBook: async (row, data) => {
      const update = await prisma.bookImage.updateMany({
        where: { id: row.id, url: row.url, storageKey: null, bookId: row.bookId, book: { ownerId: row.ownerId } }, data,
      });
      return update.count === 1;
    },
    enqueueCleanup: key => prisma.storageCleanupJob.upsert({
      where: { storageKey: key }, create: { storageKey: key }, update: { nextAttemptAt: new Date(), lastError: null },
    }),
  });
  console.log('LEGACY_MEDIA_BACKFILL ' + JSON.stringify({ apply, ...result }));
  if (result.blocked.length) process.exitCode = 1;
} catch {
  console.error('LEGACY_MEDIA_BACKFILL_FAILED');
  process.exitCode = 1;
} finally {
  client.destroy();
  await prisma.$disconnect();
}
