import { AppError } from '../../shared/errors/AppError.js';
import { booksRepository } from '../books/books.repository.js';
import { matchesRepository } from './matches.repository.js';
import { interactionSchema } from './matches.schemas.js';

function serializeMatch(match, currentUserId) {
  if (!match) return null;
  const otherUser = match.userAId === currentUserId ? match.userB : match.userA;
  return {
    id: match.id,
    status: match.status,
    otherUser,
    conversationId: match.conversation?.id ?? null,
    createdAt: match.createdAt,
    updatedAt: match.updatedAt
  };
}

export const matchesService = {
  async interact(actorId, input) {
    const data = interactionSchema.parse(input);
    const targetBook = await booksRepository.findById(data.targetBookId);

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

    const interaction = await matchesRepository.upsertInteraction({
      actorId,
      ...data
    });

    let match = null;
    if (data.action === 'LIKE') {
      const reverseLike = await matchesRepository.findReverseLike(actorId, targetBook.ownerId);
      if (reverseLike) {
        match = await matchesRepository.createMatch(actorId, targetBook.ownerId);
      }
    }

    return {
      interaction: {
        id: interaction.id,
        action: interaction.action,
        targetBookId: interaction.targetBookId,
        createdAt: interaction.createdAt
      },
      match: serializeMatch(match, actorId)
    };
  },

  async list(userId) {
    const matches = await matchesRepository.listForUser(userId);
    return matches.map((match) => serializeMatch(match, userId));
  }
};
