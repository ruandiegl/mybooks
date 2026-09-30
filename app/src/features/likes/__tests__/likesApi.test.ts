import type { AxiosResponse } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { api } from '../../../services/api';
import { likesApi } from '../likesApi';

const originalAdapter = api.defaults.adapter;

afterEach(() => {
  api.defaults.adapter = originalAdapter;
});

describe('likesApi', () => {
  it('fetchReceivedLikes forwards params and extracts data', async () => {
    let capturedUrl = '';
    let capturedParams: unknown;

    api.defaults.adapter = async (config): Promise<AxiosResponse> => {
      capturedUrl = config.url || '';
      capturedParams = config.params;
      return {
        data: {
          data: {
            items: [
              {
                id: 'like-1',
                actor: { id: 'u1', name: 'Ana' },
                book: { id: 'b1', title: 'Livro 1' },
                likedAt: '2026-09-24T12:00:00Z'
              }
            ],
            nextCursor: 'cursor-2',
            hasMore: true
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    };

    const result = await likesApi.fetchReceivedLikes({ limit: 10, sort: 'desc', bookId: 'b-xyz' });

    expect(capturedUrl).toBe('/api/v1/likes/received');
    expect(capturedParams).toEqual({ limit: 10, sort: 'desc', bookId: 'b-xyz' });
    expect(result.items[0].id).toBe('like-1');
    expect(result.pageInfo).toEqual({ hasNextPage: true, nextCursor: 'cursor-2' });
  });

  it('fetchReceivedLikesCount calls count endpoint', async () => {
    api.defaults.adapter = async (config): Promise<AxiosResponse> => ({
      data: { data: { count: 7 } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    });

    const result = await likesApi.fetchReceivedLikesCount();
    expect(result).toEqual({ count: 7 });
  });

  it('interact sends POST with action and clientActionId', async () => {
    let capturedBody: unknown;

    api.defaults.adapter = async (config): Promise<AxiosResponse> => {
      capturedBody = JSON.parse(config.data);
      return {
        data: {
          data: {
            interaction: { id: 'int-1' },
            match: null
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    };

    const result = await likesApi.interact({
      targetBookId: 'book-123',
      action: 'LIKE',
      clientActionId: 'uuid-456'
    });

    expect(capturedBody).toEqual({
      targetBookId: 'book-123',
      action: 'LIKE',
      clientActionId: 'uuid-456'
    });
    expect(result.interaction.id).toBe('int-1');
    expect(result.match).toBeNull();
  });
});
