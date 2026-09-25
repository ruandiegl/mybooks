import { AppError } from '../../shared/errors/AppError.js';
import { premiumService } from '../premium/premium.service.js';
import { likesRepository } from './likes.repository.js';
import { likesQuerySchema } from './likes.schemas.js';

export const likesService = {
  async getReceivedLikes(userId, query) {
    const parsedQuery = likesQuerySchema.parse(query || {});
    const { limit } = parsedQuery;
    if (!await premiumService.hasActiveTrial(userId)) {
      throw new AppError('Ver quem curtiu seus livros é um benefício Premium.', {
        statusCode: 403,
        code: 'PREMIUM_REQUIRED'
      });
    }
    const interactions = await likesRepository.findReceivedLikes(userId, parsedQuery);

    const hasMore = interactions.length > limit;
    const items = hasMore ? interactions.slice(0, limit) : interactions;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      items: items.map(interaction => ({
        id: interaction.id,
        actor: {
          id: interaction.actor.id,
          name: interaction.actor.name,
          avatarUrl: interaction.actor.avatarUrl,
          city: interaction.actor.city
        },
        actorBook: interaction.actor.books?.[0]
          ? {
              id: interaction.actor.books[0].id,
              title: interaction.actor.books[0].title,
              coverUrl: interaction.actor.books[0].images?.[0]?.url || null
            }
          : null,
        book: {
          id: interaction.targetBook.id,
          title: interaction.targetBook.title,
          coverUrl: interaction.targetBook.images?.[0]?.url || null
        },
        likedAt: interaction.createdAt
      })),
      nextCursor,
      hasMore
    };
  },

  async getSentLikes(userId, query) {
    const parsedQuery = likesQuerySchema.parse(query || {});
    const { limit } = parsedQuery;
    const interactions = await likesRepository.findSentLikes(userId, parsedQuery);

    const hasMore = interactions.length > limit;
    const items = hasMore ? interactions.slice(0, limit) : interactions;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      items: items.map(interaction => ({
        id: interaction.id,
        book: {
          id: interaction.targetBook.id,
          title: interaction.targetBook.title,
          coverUrl: interaction.targetBook.images?.[0]?.url || null
        },
        owner: interaction.targetBook.owner,
        likedAt: interaction.createdAt
      })),
      nextCursor,
      hasMore
    };
  },

  async getReceivedLikesCount(userId) {
    const count = await likesRepository.countPendingReceivedLikes(userId);
    return { count };
  },

  async getUserBooksWithLikes(userId) {
    if (!await premiumService.hasActiveTrial(userId)) {
      throw new AppError('Filtrar curtidas recebidas é um benefício Premium.', {
        statusCode: 403,
        code: 'PREMIUM_REQUIRED'
      });
    }
    const books = await likesRepository.findUserBooksWithLikes(userId);
    return books;
  }
};
