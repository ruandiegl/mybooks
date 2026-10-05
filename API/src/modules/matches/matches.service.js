import { serializeAvatarUser } from '../media/avatar.serializer.js';
import { AppError } from '../../shared/errors/AppError.js';
import { likesQuotaService } from '../premium/likesQuota.service.js';
import { booksRepository } from '../books/books.repository.js';
import { matchesRepository } from './matches.repository.js';
import { interactionSchema } from './matches.schemas.js';

async function serializeMatch(match, currentUserId, avatarCache = new Map()) {
  if (!match) return null;
  const otherUser = match.userAId === currentUserId ? match.userB : match.userA;
  return {
    id: match.id,
    status: match.status,
    otherUser: await serializeAvatarUser(otherUser, avatarCache),
    conversationId: match.conversation?.id ?? null,
    createdAt: match.createdAt,
    updatedAt: match.updatedAt
  };
}

export function createMatchesService({
  books = booksRepository,
  matches = matchesRepository,
  quota = likesQuotaService
} = {}) {
  return {
    async interact(actorId, input) {
      const data = interactionSchema.parse(input);
      const targetBook = await books.findById(data.targetBookId);

      if (!targetBook || !targetBook.ownerId || targetBook.availability !== 'AVAILABLE') {
        throw new AppError('Livro indisponível para descoberta.', {
          statusCode: 404,
          code: 'DISCOVERY_BOOK_NOT_FOUND'
        });
      }

      if (targetBook.ownerId === actorId) {
        throw new AppError('Você não pode interagir com o próprio livro.', {
          statusCode: 422,
          code: 'SELF_INTERACTION'
        });
      }

      const interactionData = { actorId, ...data };
      const interaction = data.action === 'LIKE'
        ? await quota.consumeDailyLike(
            actorId,
            data.targetBookId,
            (transactionClient) => matches.upsertInteraction(interactionData, transactionClient)
          )
        : await matches.upsertInteraction(interactionData);

      let match = null;
      if (data.action === 'LIKE') {
        const reverseLike = await matches.findReverseLike(actorId, targetBook.ownerId);
        if (reverseLike) {
          match = await matches.createMatch(actorId, targetBook.ownerId);
        }
      }

      return {
        interaction: {
          id: interaction.id,
          action: interaction.action,
          targetBookId: interaction.targetBookId,
          createdAt: interaction.createdAt
        },
        match: await serializeMatch(match, actorId)
      };
    },

    async list(userId) {
      const items = await matches.listForUser(userId);
      const cache = new Map();
      return Promise.all(items.map((match) => serializeMatch(match, userId, cache)));
    }
  };
}

export const matchesService = createMatchesService();
