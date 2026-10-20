import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/shared/errors/AppError.js';
import { errorHandler } from '../src/shared/http/errorHandler.js';
const mocks = vi.hoisted(() => ({ matchesRepository: { remove: vi.fn() } }));
vi.mock('../src/modules/matches/matches.repository.js', () => mocks);
const { matchesRouter } = await import('../src/modules/matches/matches.routes.js');
const { createApp } = await import('../src/app.js');
const a = '10000000-0000-4000-8000-000000000001';
const b = '20000000-0000-4000-8000-000000000002';
const id = '30000000-0000-4000-8000-000000000003';
let io;
function app() {
  const instance = express();
  instance.set('io', io);
  instance.use((req, _res, next) => { req.currentUser = { id: a }; next(); });
  instance.use('/api/v1', matchesRouter);
  instance.use(errorHandler);
  return instance;
}
beforeEach(() => {
  io = { to: vi.fn().mockReturnThis(), emit: vi.fn(), in: vi.fn().mockReturnThis(), socketsLeave: vi.fn() };
  mocks.matchesRepository.remove.mockReset().mockResolvedValue({ matchId: id, conversationId: 'conversation', participantIds: [a, b] });
});
describe('DELETE matches', () => {
  it('requires authentication through the API router', async () => {
    const response = await request(createApp()).delete(`/api/v1/matches/${id}`);
    expect(response.status).toBe(401);
    expect(mocks.matchesRepository.remove).not.toHaveBeenCalled();
  });
  it('returns 204 and publishes only the minimal event to both personal rooms after commit', async () => {
    mocks.matchesRepository.remove.mockImplementation(async () => {
      expect(io.emit).not.toHaveBeenCalled();
      expect(io.socketsLeave).not.toHaveBeenCalled();
      return { matchId: id, conversationId: 'conversation', participantIds: [a, b] };
    });
    const response = await request(app()).delete(`/api/v1/matches/${id}`);
    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(io.to).toHaveBeenCalledWith(['user:' + a, 'user:' + b]);
    expect(io.emit).toHaveBeenCalledExactlyOnceWith('match:removed', { matchId: id, conversationId: 'conversation' });
    expect(io.in).toHaveBeenCalledWith('conversation:conversation');
    expect(io.socketsLeave).toHaveBeenCalledWith('conversation:conversation');
  });
  it('validates UUID before persistence', async () => {
    expect((await request(app()).delete('/api/v1/matches/bad')).status).toBe(422);
    expect(mocks.matchesRepository.remove).not.toHaveBeenCalled();
  });
  it.each(['outsider', 'missing'])('returns sanitized 404 and no event for %s', async () => {
    mocks.matchesRepository.remove.mockRejectedValue(new AppError('Match não encontrado.', { statusCode: 404, code: 'MATCH_NOT_FOUND', cause: new Error('private SQL') }));
    const response = await request(app()).delete(`/api/v1/matches/${id}`);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('MATCH_NOT_FOUND');
    expect(JSON.stringify(response.body)).not.toContain('private SQL');
    expect(io.emit).not.toHaveBeenCalled();
    expect(io.socketsLeave).not.toHaveBeenCalled();
  });
  it('does not emit if the transaction fails', async () => {
    mocks.matchesRepository.remove.mockRejectedValue(new AppError('Tente novamente.', { statusCode: 409, code: 'MATCH_RETRY_REQUIRED' }));
    expect((await request(app()).delete(`/api/v1/matches/${id}`)).status).toBe(409);
    expect(io.emit).not.toHaveBeenCalled();
  });
});
