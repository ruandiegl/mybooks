import { serializeAvatarUser } from '../media/avatar.serializer.js';
import { AppError } from '../../shared/errors/AppError.js';
import { storageService } from '../media/storage.service.js';
import { premiumService } from '../premium/premium.service.js';
import { likesRepository } from './likes.repository.js';
import { likesQuerySchema } from './likes.schemas.js';

function compareImages(a, b) {
  if (Number.isInteger(a.sortOrder) && Number.isInteger(b.sortOrder)) {
    return a.sortOrder - b.sortOrder || a.id.localeCompare(b.id);
  }
  if (a.isCover !== b.isCover) return Number(b.isCover) - Number(a.isCover);
  return new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0);
}

async function getCoverDescriptor(images) {
  const image = [...(images ?? [])].sort(compareImages)[0];
  if (!image) return { coverUrl: null, coverUrlExpiresAt: null };
  if (image.storageKey) {
    const signed = await storageService.getPresignedGetUrl(image.storageKey);
    return { coverUrl: signed?.url ?? null, coverUrlExpiresAt: signed?.expiresAt ?? null };
  }
  return { coverUrl: image.url ?? null, coverUrlExpiresAt: null };
}

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

    const cache = new Map();
    return {
      items: await Promise.all(items.map(async interaction => ({
        id: interaction.id,
        actor: await serializeAvatarUser(interaction.actor, cache),
        actorBook: interaction.actor.books?.[0]
          ? {
              id: interaction.actor.books[0].id,
              title: interaction.actor.books[0].title,
              ...await getCoverDescriptor(interaction.actor.books[0].images)
            }
          : null,
        book: {
          id: interaction.targetBook.id,
          title: interaction.targetBook.title,
          ...await getCoverDescriptor(interaction.targetBook.images)
        },
        likedAt: interaction.createdAt
      }))),
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

    const cache = new Map();
    return {
      items: await Promise.all(items.map(async interaction => ({
        id: interaction.id,
        book: {
          id: interaction.targetBook.id,
          title: interaction.targetBook.title,
          ...await getCoverDescriptor(interaction.targetBook.images)
        },
        owner: await serializeAvatarUser(interaction.targetBook.owner, cache),
        likedAt: interaction.createdAt
      }))),
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
