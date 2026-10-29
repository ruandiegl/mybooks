import { z } from 'zod';
import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { serializeAvatar, serializeAvatarUser } from '../media/avatar.serializer.js';
import { reputationStars } from './reputation.js';

const idSchema = z.uuid();
const reportSchema = z.object({
  reason: z.enum(['HARASSMENT', 'FRAUD', 'INAPPROPRIATE_CONTENT', 'SPAM', 'OTHER']),
  description: z.string().trim().min(10).max(500).optional()
}).strict();

function targetId(viewerId, input) {
  const id = idSchema.parse(input);
  if (id === viewerId) throw new AppError('Esta ação não pode ser feita no próprio perfil.', { statusCode: 422, code: 'SELF_MODERATION' });
  return id;
}

function notFound() {
  return new AppError('Perfil não encontrado.', { statusCode: 404, code: 'USER_NOT_FOUND' });
}

async function withRetry(work) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: 'Serializable' }); }
    catch (error) {
      if (error?.code === 'P2034' || error?.code === 'P2002') {
        if (attempt < 2) continue;
        throw new AppError('A relação mudou durante a operação. Tente novamente.', { statusCode: 409, code: 'RELATIONSHIP_RETRY_REQUIRED' });
      }
      throw error;
    }
  }
}

export const moderationService = {
  async publicProfile(viewerId, input) {
    const id = idSchema.parse(input);
    const [user, reports, blocks, blockedByMe, blockedMe, reportedByMe] = await Promise.all([
      prisma.user.findUnique({ where: { id }, select: { id: true, name: true, bio: true, city: true, avatarUrl: true, avatarStorageKey: true, avatarVersion: true, isActive: true } }),
      prisma.userReport.count({ where: { reportedId: id } }),
      prisma.userBlock.count({ where: { blockedId: id } }),
      prisma.userBlock.count({ where: { blockerId: viewerId, blockedId: id } }),
      prisma.userBlock.count({ where: { blockerId: id, blockedId: viewerId } }),
      prisma.userReport.count({ where: { reporterId: viewerId, reportedId: id } })
    ]);
    if (!user?.isActive || blockedMe) throw notFound();
    return {
      id: user.id, name: user.name, bio: user.bio, city: user.city,
      ...await serializeAvatar(user),
      reputation: { stars: reputationStars(reports, blocks) },
      viewer: { blockedByMe: Boolean(blockedByMe), reportedByMe: Boolean(reportedByMe) }
    };
  },

  async report(viewerId, input, body) {
    const reportedId = targetId(viewerId, input);
    const data = reportSchema.parse(body);
    const user = await prisma.user.findUnique({ where: { id: reportedId }, select: { id: true, isActive: true } });
    if (!user?.isActive) throw notFound();
    try {
      await prisma.userReport.create({ data: { reporterId: viewerId, reportedId, ...data } });
    } catch (error) {
      if (error?.code === 'P2002') throw new AppError('Você já denunciou esta pessoa.', { statusCode: 409, code: 'ALREADY_REPORTED' });
      throw error;
    }
    return { reported: true };
  },

  async block(viewerId, input) {
    const blockedId = targetId(viewerId, input);
    await withRetry(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: blockedId }, select: { id: true, isActive: true } });
      if (!user?.isActive) throw notFound();
      await tx.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId: viewerId, blockedId } },
        create: { blockerId: viewerId, blockedId }, update: {}
      });
    });
    return { blocked: true };
  },

  async unblock(viewerId, input) {
    const blockedId = targetId(viewerId, input);
    await withRetry(tx => tx.userBlock.deleteMany({ where: { blockerId: viewerId, blockedId } }));
    return { blocked: false };
  },

  async listBlocks(viewerId) {
    const rows = await prisma.userBlock.findMany({
      where: { blockerId: viewerId }, include: { blocked: { select: { id: true, name: true, city: true, avatarUrl: true, avatarStorageKey: true, avatarVersion: true } } },
      orderBy: { createdAt: 'desc' }
    });
    const cache = new Map();
    return Promise.all(rows.map(row => serializeAvatarUser(row.blocked, cache)));
  }
};
