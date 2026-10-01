import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mediaService: { reorder: vi.fn() }
}));

vi.mock('../src/modules/media/media.service.js', () => ({ mediaService: mocks.mediaService }));

const { mediaRouter } = await import('../src/modules/media/media.routes.js');

describe('media routes', () => {
  const app = express();

  app.use(express.json());
  app.use('/api/v1/books/:bookId/images', (req, _res, next) => {
    req.currentUser = { id: 'owner-id' };
    next();
  }, mediaRouter);

  beforeEach(() => {
    mocks.mediaService.reorder.mockResolvedValue({ id: 'book-id', images: [] });
  });

  it('persiste a ordem das imagens pela rota usada pelo app', async () => {
    const response = await request(app)
      .put('/api/v1/books/book-id/images/order')
      .send({ imageIds: ['image-1', 'image-2'] });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: 'book-id' });
    expect(mocks.mediaService.reorder).toHaveBeenCalledWith(
      'owner-id',
      'book-id',
      { imageIds: ['image-1', 'image-2'] }
    );
  });
});
