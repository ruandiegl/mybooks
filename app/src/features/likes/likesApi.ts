import { api } from '../../services/api';
import type { ApiEnvelope, Match, Paginated } from '../../types/api';
import type { LikeBook, ReceivedLike, SentLike } from '../../types/likes';

export type LikesQueryParams = {
  cursor?: string;
  limit?: number;
  sort?: 'desc' | 'asc';
  bookId?: string;
};

export type InteractionInput = {
  targetBookId: string;
  action: 'LIKE' | 'PASS';
  clientActionId: string;
};

export type InteractionResult = {
  interaction: { id: string };
  match: Match | null;
};

const data = <T>(response: { data: ApiEnvelope<T> }) => response.data.data;

type LikesCursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

function toPaginated<T>(page: LikesCursorPage<T>): Paginated<T> {
  return {
    items: page.items,
    pageInfo: { hasNextPage: page.hasMore, nextCursor: page.nextCursor }
  };
}

export const likesApi = {
  async fetchReceivedLikes(params?: LikesQueryParams) {
    const page = data<LikesCursorPage<ReceivedLike>>(
      await api.get('/api/v1/likes/received', { params })
    );
    return toPaginated(page);
  },

  async fetchSentLikes(params?: Omit<LikesQueryParams, 'bookId'>) {
    const page = data<LikesCursorPage<SentLike>>(
      await api.get('/api/v1/likes/sent', { params })
    );
    return toPaginated(page);
  },

  async fetchReceivedLikesCount() {
    return data<{ count: number }>(
      await api.get('/api/v1/likes/received/count')
    );
  },

  async fetchBooksWithLikes() {
    return data<LikeBook[]>(
      await api.get('/api/v1/likes/received/books')
    );
  },

  async interact(input: InteractionInput) {
    return data<InteractionResult>(
      await api.post('/api/v1/interactions', input)
    );
  }
};
