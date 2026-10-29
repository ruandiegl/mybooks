import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../src/shared/http/errorHandler.js';

const mocks = vi.hoisted(() => ({
  gamificationRepository: {
    recordCheckIn: vi.fn(),
    listLeaderboard: vi.fn()
  }
}));

vi.mock('../src/modules/gamification/gamification.repository.js', () => mocks);

const { gamificationRouter } = await import('../src/modules/gamification/gamification.routes.js');
const { createApp } = await import('../src/app.js');
const currentUserId = '10000000-0000-4000-8000-000000000001';

function authenticatedTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.currentUser = { id: currentUserId };
    next();
  });
  app.use('/api/v1/gamification', gamificationRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  mocks.gamificationRepository.recordCheckIn.mockReset().mockResolvedValue({
    dayKey: '2026-10-26',
    currentStreak: 3,
    checkedInToday: true
  });
  mocks.gamificationRepository.listLeaderboard.mockReset().mockResolvedValue({
    currentUser: { currentStreak: 3, rank: 2, email: 'private@example.test' },
    entries: [{ name: 'Reader', avatarUrl: null, avatarUrlExpiresAt: null, avatarVersion: 0, currentStreak: 3, rank: 2, phone: '11999999999', lastActiveDay: '2026-10-26', avatarStorageKey: 'private-key' }]
  });
});

describe('private gamification routes', () => {
  it('requires authentication for check-in and leaderboard', async () => {
    const app = createApp();
    expect((await request(app).post('/api/v1/gamification/check-in')).status).toBe(401);
    expect((await request(app).get('/api/v1/gamification/leaderboard')).status).toBe(401);
    expect(mocks.gamificationRepository.recordCheckIn).not.toHaveBeenCalled();
    expect(mocks.gamificationRepository.listLeaderboard).not.toHaveBeenCalled();
  });

  it('derives check-in identity from the authenticated request and returns the server day', async () => {
    const response = await request(authenticatedTestApp()).post('/api/v1/gamification/check-in');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ dayKey: '2026-10-26', currentStreak: 3, checkedInToday: true });
    expect(mocks.gamificationRepository.recordCheckIn).toHaveBeenCalledWith(currentUserId);
  });

  it('rejects client-supplied user or date fields', async () => {
    const response = await request(authenticatedTestApp())
      .post('/api/v1/gamification/check-in')
      .send({ userId: '20000000-0000-4000-8000-000000000002', dayKey: '2099-01-01' });
    expect(response.status).toBe(422);
    expect(mocks.gamificationRepository.recordCheckIn).not.toHaveBeenCalled();
  });

  it('returns only public leaderboard fields', async () => {
    const response = await request(authenticatedTestApp()).get('/api/v1/gamification/leaderboard');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      currentUser: { currentStreak: 3, rank: 2 },
      entries: [{ name: 'Reader', avatarUrl: null, avatarUrlExpiresAt: null, avatarVersion: 0, currentStreak: 3, rank: 2 }]
    });
    expect(JSON.stringify(response.body)).not.toMatch(/email|phone|lastActiveDay|userId|avatarStorageKey|private-key/i);
    expect(mocks.gamificationRepository.listLeaderboard).toHaveBeenCalledWith({
      currentUserId,
      today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      scope: 'global'
    });
  });

  it('requests the active-match ranking for the authenticated user', async () => {
    const response = await request(authenticatedTestApp()).get('/api/v1/gamification/leaderboard?scope=matches');
    expect(response.status).toBe(200);
    expect(mocks.gamificationRepository.listLeaderboard).toHaveBeenCalledWith({
      currentUserId,
      today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      scope: 'matches'
    });
    expect(JSON.stringify(response.body)).not.toMatch(/email|phone|lastActiveDay|userId|avatarStorageKey|private-key/i);
  });

  it('rejects an unknown ranking scope without querying the database', async () => {
    const response = await request(authenticatedTestApp()).get('/api/v1/gamification/leaderboard?scope=everyone');
    expect(response.status).toBe(422);
    expect(mocks.gamificationRepository.listLeaderboard).not.toHaveBeenCalled();
  });
});
