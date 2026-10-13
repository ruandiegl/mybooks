import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createSettingsRouter } from '../src/modules/settings/settings.routes.js';
import { errorHandler } from '../src/shared/http/errorHandler.js';
import { createSettingsService } from '../src/modules/settings/settings.service.js';
function app(repository) {
  const server = express(); server.use(express.json());
  server.use((req, _res, next) => { req.currentUser = { id: 'ana' }; req.requestId = 'test'; next(); });
  server.use(createSettingsRouter({ service: createSettingsService({ repository }) })); server.use(errorHandler); return server;
}
describe('private preference routes', () => {
  it('returns no-store defaults and rejects an owner mismatch before effects', async () => {
    const server = app({ find: async () => null, upsert: async () => { throw Error('must not write'); } });
    const response = await request(server).get('/me/preferences');
    expect(response.status).toBe(200); expect(response.headers['cache-control']).toBe('private, no-store');
    const mismatch = await request(server).patch('/me/preferences').set('X-Settings-Owner', 'other').send({ showLikesBadge: false });
    expect(mismatch.status).toBe(409); expect(mismatch.body.error.code).toBe('SETTINGS_SESSION_CHANGED');
  });
  it('never returns success after a storage failure', async () => {
    const response = await request(app({ upsert: async () => { throw Error('db unavailable'); } })).patch('/me/preferences').send({ showLikesBadge: false });
    expect(response.status).toBe(500); expect(response.body).not.toHaveProperty('data');
  });
});
