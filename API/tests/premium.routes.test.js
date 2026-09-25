import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createPremiumRouter } from '../src/modules/premium/premium.routes.js';

const userId = '10000000-0000-4000-8000-000000000001';

describe('premium routes', () => {
  it('requires the existing native-auth pipeline before exposing premium status', async () => {
    const response = await request(createApp()).get('/api/v1/premium/status');
    expect(response.status).toBe(401);
  });

  it('serves status, offer impression, and activation for the authenticated user', async () => {
    const service = {
      getPremiumStatus: vi.fn().mockResolvedValue({
        eligible: true,
        trialState: 'NOT_STARTED',
        trialStartedAt: null,
        trialEndsAt: null,
        promptMode: 'ONBOARDING_MODAL',
        benefits: { seeReceivedLikes: false, unlimitedLikes: false, dailyLikeLimit: 15 }
      }),
      markOfferPrompted: vi.fn().mockResolvedValue({ eligible: true }),
      activateTrial: vi.fn().mockResolvedValue({ trialState: 'ACTIVE' })
    };
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.currentUser = { id: userId };
      next();
    });
    app.use('/api/v1/premium', createPremiumRouter({ service }));

    const status = await request(app).get('/api/v1/premium/status');
    expect(status.status).toBe(200);
    expect(status.body.data.promptMode).toBe('ONBOARDING_MODAL');
    expect(service.getPremiumStatus).toHaveBeenCalledWith(userId);

    const prompted = await request(app).post('/api/v1/premium/offer/prompted').send({});
    expect(prompted.status).toBe(200);
    expect(service.markOfferPrompted).toHaveBeenCalledWith(userId);

    const activated = await request(app).post('/api/v1/premium/trial/activate').send({});
    expect(activated.status).toBe(200);
    expect(activated.body.data.trialState).toBe('ACTIVE');
    expect(service.activateTrial).toHaveBeenCalledWith(userId);
  });
});
