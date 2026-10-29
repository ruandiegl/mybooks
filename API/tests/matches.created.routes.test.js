import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../src/shared/http/errorHandler.js';

const mocks = vi.hoisted(() => ({ interact: vi.fn() }));
vi.mock('../src/modules/matches/matches.service.js', () => ({ matchesService: { interact: mocks.interact } }));
const { matchesRouter } = await import('../src/modules/matches/matches.routes.js');

const actorId = '10000000-0000-4000-8000-000000000001';
const otherUserId = '20000000-0000-4000-8000-000000000002';
const input = {
  targetBookId: '30000000-0000-4000-8000-000000000003',
  clientActionId: '40000000-0000-4000-8000-000000000004',
  action: 'LIKE'
};
let io;

function app() {
  const instance = express();
  instance.use(express.json());
  instance.set('io', io);
  instance.use((req, _res, next) => { req.currentUser = { id: actorId }; next(); });
  instance.use('/api/v1', matchesRouter);
  instance.use(errorHandler);
  return instance;
}

beforeEach(() => {
  io = { to: vi.fn().mockReturnThis(), emit: vi.fn() };
  mocks.interact.mockReset();
});

describe('POST interactions realtime match notification', () => {
  it('notifies both participants after an active match is persisted', async () => {
    const result = { interaction: { id: 'interaction' }, match: { id: 'match', status: 'ACTIVE', otherUser: { id: otherUserId } } };
    mocks.interact.mockImplementation(async () => {
      expect(io.emit).not.toHaveBeenCalled();
      return result;
    });

    const response = await request(app()).post('/api/v1/interactions').send(input);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(result);
    expect(io.to).toHaveBeenCalledWith(['user:' + actorId, 'user:' + otherUserId]);
    expect(io.emit).toHaveBeenCalledExactlyOnceWith('match:created');
  });

  it('does not notify when no active match is returned', async () => {
    mocks.interact.mockResolvedValue({ interaction: { id: 'interaction' }, match: null });
    expect((await request(app()).post('/api/v1/interactions').send(input)).status).toBe(200);
    expect(io.emit).not.toHaveBeenCalled();
  });
});
