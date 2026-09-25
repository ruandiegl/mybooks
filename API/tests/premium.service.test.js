import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPremiumService } from '../src/modules/premium/premium.service.js';

const userId = '10000000-0000-4000-8000-000000000001';
const baseNow = new Date('2026-09-24T12:00:00.000Z');
const dayMs = 24 * 60 * 60 * 1000;

function makeUser(overrides = {}) {
  return {
    id: userId,
    emailVerifiedAt: new Date('2026-09-01T00:00:00.000Z'),
    isActive: true,
    premiumTrialStartedAt: null,
    premiumTrialEndsAt: null,
    premiumOfferPromptedAt: null,
    premiumOfferCohort: 'NEW',
    ...overrides
  };
}

function setup(initialUser = makeUser()) {
  let user = initialUser ? { ...initialUser } : null;
  const repository = {
    findById: vi.fn(async () => user ? { ...user } : null),
    activateTrialIfNotStarted: vi.fn(async ({ userId: requestedId, startedAt, endsAt }) => {
      if (!user || user.id !== requestedId || !user.isActive || !user.emailVerifiedAt || user.premiumTrialStartedAt) return false;
      user = { ...user, premiumTrialStartedAt: startedAt, premiumTrialEndsAt: endsAt };
      return true;
    }),
    markOfferPromptedIfEmpty: vi.fn(async ({ userId: requestedId, promptedAt }) => {
      if (!user || user.id !== requestedId || user.premiumOfferPromptedAt) return false;
      user = { ...user, premiumOfferPromptedAt: promptedAt };
      return true;
    })
  };
  const service = createPremiumService({ repository, clock: { now: () => new Date(baseNow) } });
  return { service, repository, current: () => user };
}

describe('premiumService', () => {
  it('reports an eligible new account with its onboarding modal prompt', async () => {
    const { service } = setup();
    await expect(service.getPremiumStatus(userId)).resolves.toMatchObject({
      serverNow: baseNow.toISOString(),
      eligible: true,
      trialState: 'NOT_STARTED',
      promptMode: 'ONBOARDING_MODAL',
      benefits: { seeReceivedLikes: false, unlimitedLikes: false, dailyLikeLimit: 15 }
    });
  });

  it('reports existing eligible accounts with a login modal prompt', async () => {
    const { service } = setup(makeUser({ premiumOfferCohort: 'EXISTING' }));
    await expect(service.getPremiumStatus(userId)).resolves.toMatchObject({
      eligible: true,
      trialState: 'NOT_STARTED',
      promptMode: 'LOGIN_MODAL'
    });
  });

  it('returns active benefits only before the exclusive end timestamp', async () => {
    const startedAt = new Date(baseNow.getTime() - dayMs);
    const endsAt = new Date(baseNow.getTime() + 1);
    const active = setup(makeUser({ premiumTrialStartedAt: startedAt, premiumTrialEndsAt: endsAt }));
    await expect(active.service.getPremiumStatus(userId)).resolves.toMatchObject({
      eligible: false,
      trialState: 'ACTIVE',
      trialEndsAt: endsAt,
      promptMode: null,
      benefits: { seeReceivedLikes: true, unlimitedLikes: true, dailyLikeLimit: null }
    });

    const expired = setup(makeUser({ premiumTrialStartedAt: startedAt, premiumTrialEndsAt: baseNow }));
    await expect(expired.service.getPremiumStatus(userId)).resolves.toMatchObject({
      eligible: false,
      trialState: 'EXPIRED',
      promptMode: null,
      benefits: { seeReceivedLikes: false, unlimitedLikes: false, dailyLikeLimit: 15 }
    });
  });

  it('denies trial eligibility when email is not verified', async () => {
    const { service } = setup(makeUser({ emailVerifiedAt: null, isActive: false }));
    await expect(service.getPremiumStatus(userId)).resolves.toMatchObject({
      eligible: false,
      trialState: 'NOT_STARTED',
      promptMode: null
    });
    await expect(service.activateTrial(userId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'PREMIUM_VERIFICATION_REQUIRED'
    });
  });

  it('starts exactly 30 days from the server clock using compare-and-set', async () => {
    const { service, repository } = setup();
    const result = await service.activateTrial(userId);
    expect(result.trialStartedAt).toEqual(baseNow);
    expect(result.trialEndsAt).toEqual(new Date(baseNow.getTime() + 30 * dayMs));
    expect(repository.activateTrialIfNotStarted).toHaveBeenCalledWith({
      userId,
      startedAt: baseNow,
      endsAt: new Date(baseNow.getTime() + 30 * dayMs)
    });
  });

  it('does not extend an active or expired trial on repeated activation', async () => {
    const startedAt = new Date(baseNow.getTime() - dayMs);
    const endsAt = new Date(baseNow.getTime() + 29 * dayMs);
    const { service, repository } = setup(makeUser({ premiumTrialStartedAt: startedAt, premiumTrialEndsAt: endsAt }));
    const result = await service.activateTrial(userId);
    expect(result.trialEndsAt).toEqual(endsAt);
    expect(repository.activateTrialIfNotStarted).not.toHaveBeenCalled();
  });

  it('serializes concurrent activation attempts to one identical trial window', async () => {
    const { service, repository } = setup();
    const [first, second] = await Promise.all([
      service.activateTrial(userId),
      service.activateTrial(userId)
    ]);
    expect(first.trialStartedAt).toEqual(second.trialStartedAt);
    expect(first.trialEndsAt).toEqual(second.trialEndsAt);
    expect(repository.activateTrialIfNotStarted).toHaveBeenCalledTimes(2);
    expect(service.getPremiumStatus(userId)).resolves.toMatchObject({ trialEndsAt: first.trialEndsAt });
  });

  it('marks first offer presentation without consuming trial eligibility', async () => {
    const { service } = setup();
    const result = await service.markOfferPrompted(userId);
    expect(result).toMatchObject({ eligible: true, trialState: 'NOT_STARTED', promptMode: 'LOGIN_MODAL' });
  });
});
