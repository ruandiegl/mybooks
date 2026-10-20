import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';

const matchInclude = {
  userA: { select: { id: true, name: true, avatarUrl: true, city: true } },
  userB: { select: { id: true, name: true, avatarUrl: true, city: true } },
  conversation: { select: { id: true, updatedAt: true } }
};

function matchNotFound() {
  return new AppError('Match não encontrado.', { statusCode: 404, code: 'MATCH_NOT_FOUND' });
}

async function serializable(operation, retryCode) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: 'Serializable' });
    } catch (error) {
      // A unique collision can be another request creating the receipt or pair.
      // Start a fresh transaction so the next attempt reads the committed state.
      if (error?.code === 'P2034' || error?.code === 'P2002') {
        if (attempt < 2) continue;
        throw new AppError('A operação mudou durante o envio. Tente novamente.', {
          statusCode: 409, code: retryCode
        });
      }
      if (error?.code === 'P2025' && retryCode === 'MATCH_RETRY_REQUIRED') throw matchNotFound();
      throw error;
    }
  }
}

export const matchesRepository = {
  applyInteraction({ actorId, targetBookId, action, clientActionId }) {
    return serializable(async (tx) => {
      const receipt = await tx.interactionActionReceipt.findUnique({ where: { clientActionId } });
      if (receipt && (receipt.actorId !== actorId || receipt.targetBookId !== targetBookId || receipt.action !== action)) {
        throw new AppError('Identificador de ação já utilizado.', { statusCode: 409, code: 'ACTION_ID_CONFLICT' });
      }
      const where = { actorId_targetBookId: { actorId, targetBookId } };
      if (receipt) {
        // A receipt is authoritative for retries even when the book later changes availability.
        const interaction = await tx.interaction.findUnique({ where });
        let match = null;
        if (action === 'LIKE' && interaction?.action === 'LIKE') {
          const targetBook = await tx.book.findUnique({ where: { id: targetBookId }, select: { ownerId: true } });
          if (targetBook?.ownerId && targetBook.ownerId !== actorId) {
            const [userAId, userBId] = [actorId, targetBook.ownerId].sort();
            const existingMatch = await tx.match.findUnique({
              where: { userAId_userBId: { userAId, userBId } },
              include: matchInclude
            });
            if (existingMatch?.status === 'ACTIVE') match = existingMatch;
          }
        }
        return { interaction, match };
      }
      const targetBook = await tx.book.findUnique({ where: { id: targetBookId } });
      if (!targetBook?.ownerId || targetBook.availability !== 'AVAILABLE') {
        throw new AppError('Livro indisponível para descoberta.', { statusCode: 404, code: 'DISCOVERY_BOOK_NOT_FOUND' });
      }
      if (targetBook.ownerId === actorId) {
        throw new AppError('Você não pode interagir com o próprio livro.', { statusCode: 422, code: 'SELF_INTERACTION' });
      }
      await tx.interactionActionReceipt.create({ data: { actorId, targetBookId, action, clientActionId } });
      const interaction = await tx.interaction.upsert({
        where, create: { actorId, targetBookId, action, clientActionId }, update: { action, clientActionId }
      });
      let match = null;
      if (action === 'LIKE') {
        const reverseLike = await tx.interaction.findFirst({
          where: { actorId: targetBook.ownerId, action: 'LIKE', targetBook: { ownerId: actorId, availability: 'AVAILABLE' } },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
        });
        if (reverseLike) {
          const [userAId, userBId] = [actorId, targetBook.ownerId].sort();
          const bookAId = userAId === actorId ? reverseLike.targetBookId : targetBookId;
          const bookBId = userAId === actorId ? targetBookId : reverseLike.targetBookId;
          const pair = await tx.match.upsert({
            where: { userAId_userBId: { userAId, userBId } },
            create: { userAId, userBId, bookAId, bookBId },
            update: {}
          });
          await tx.conversation.upsert({
            where: { matchId: pair.id },
            create: { matchId: pair.id, members: { create: [{ userId: userAId }, { userId: userBId }] } },
            update: {}
          });
          match = await tx.match.findUnique({ where: { id: pair.id }, include: matchInclude });
        }
      }
      return { interaction, match };
    }, 'INTERACTION_RETRY_REQUIRED');
  },

  remove(actorId, matchId) {
    return serializable(async (tx) => {
      const match = await tx.match.findUnique({ where: { id: matchId }, include: { conversation: { select: { id: true } } } });
      if (!match || ![match.userAId, match.userBId].includes(actorId)) throw matchNotFound();
      await tx.interaction.updateMany({
        where: { action: 'LIKE', OR: [
          { actorId: match.userAId, targetBook: { ownerId: match.userBId } },
          { actorId: match.userBId, targetBook: { ownerId: match.userAId } }
        ] },
        data: { action: 'PASS' }
      });
      await tx.match.delete({ where: { id: matchId } });
      return { matchId, conversationId: match.conversation?.id ?? null, participantIds: [match.userAId, match.userBId] };
    }, 'MATCH_RETRY_REQUIRED');
  },

  listForUser(userId) {
    return prisma.match.findMany({
      where: { status: 'ACTIVE', OR: [{ userAId: userId }, { userBId: userId }] },
      include: matchInclude, orderBy: { updatedAt: 'desc' }
    });
  }
};
