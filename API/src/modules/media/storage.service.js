import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxImageSize = 8 * 1024 * 1024;

let client;

function assertConfigured() {
  if (
    env.STORAGE_MODE !== 'r2'
    || !env.R2_ACCOUNT_ID
    || !env.R2_ACCESS_KEY_ID
    || !env.R2_SECRET_ACCESS_KEY
    || !env.R2_BUCKET
    || !env.R2_PUBLIC_URL
  ) {
    throw new AppError('O armazenamento de imagens ainda não foi configurado neste ambiente.', {
      statusCode: 503,
      code: 'STORAGE_NOT_CONFIGURED'
    });
  }
}

function getClient() {
  assertConfigured();
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: 'https://' + env.R2_ACCOUNT_ID + '.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY
      }
    });
  }
  return client;
}

function extensionFor(mimeType) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function assertImage({ mimeType, size }) {
  if (!allowedMimeTypes.has(mimeType)) {
    throw new AppError('Envie uma imagem JPEG, PNG ou WebP.', {
      statusCode: 422,
      code: 'IMAGE_TYPE_INVALID'
    });
  }
  if (!Number.isInteger(size) || size <= 0 || size > maxImageSize) {
    throw new AppError('A imagem deve ter no máximo 8 MB.', {
      statusCode: 422,
      code: 'IMAGE_SIZE_INVALID'
    });
  }
}

export const storageService = {
  assertImage,

  async createPresignedUpload({ ownerId, bookId, imageId, mimeType, size }) {
    assertImage({ mimeType, size });
    const storageKey = [
      'books',
      ownerId,
      bookId,
      imageId + '.' + extensionFor(mimeType)
    ].join('/');

    const uploadUrl = await getSignedUrl(
      getClient(),
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: storageKey,
        ContentType: mimeType,
        ContentLength: size
      }),
      { expiresIn: env.R2_PRESIGN_EXPIRES_IN }
    );

    return {
      uploadUrl,
      storageKey,
      expiresIn: env.R2_PRESIGN_EXPIRES_IN,
      headers: {
        'Content-Type': mimeType
      }
    };
  },

  async assertUploaded(storageKey, expected) {
    const result = await getClient().send(new HeadObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: storageKey
    }));

    if (result.ContentType !== expected.mimeType || Number(result.ContentLength) !== expected.size) {
      throw new AppError('O arquivo enviado não corresponde ao upload autorizado.', {
        statusCode: 422,
        code: 'IMAGE_UPLOAD_MISMATCH'
      });
    }
  },

  getPublicUrl(storageKey) {
    assertConfigured();
    return env.R2_PUBLIC_URL.replace(/\/$/, '') + '/' + storageKey;
  },

  async delete(storageKey) {
    if (!storageKey || env.STORAGE_MODE !== 'r2') return;
    await getClient().send(new DeleteObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: storageKey
    }));
  }
};
