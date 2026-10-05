import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { usersRouter } from '../src/modules/users/users.routes.js';
import { errorHandler } from '../src/shared/http/errorHandler.js';
function app(userId) {
  const server = express();
  server.use(express.json());
  server.use((req, _res, next) => { req.currentUser = { id: userId }; req.requestId = 'avatar-test'; next(); });
  server.use('/api/v1', usersRouter);
  server.use(errorHandler);
  return server;
}
describe('avatar HTTP validation and abuse limits', () => {
  it('returns the sanitized contract when the crop has wrong dimensions', async () => {
    const response = await request(app('avatar-crop-route')).post('/api/v1/me/avatar/presign').send({ protocolVersion: 2, mimeType: 'image/png', size: 100, width: 256, height: 512 });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('AVATAR_CROP_INVALID');
    expect(response.body).not.toHaveProperty('stack');
  });
  it('limits repeated presign attempts for one authenticated account', async () => {
    const server = app('avatar-rate-route');
    for (let n = 0; n < 10; n++) {
      expect((await request(server).post('/api/v1/me/avatar/presign').send({ mimeType: 'image/png', size: 0 })).status).toBe(422);
    }
    const response = await request(server).post('/api/v1/me/avatar/presign').send({ mimeType: 'image/png', size: 0 });
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('RATE_LIMITED');
  });
});
