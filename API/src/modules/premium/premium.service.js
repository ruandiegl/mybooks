import { AppError } from '../../shared/errors/AppError.js';
import { premiumRepository } from './premium.repository.js';

export const PREMIUM_TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const FREE_DAILY_LIKE_LIMIT = 15;

function isVerified(user) {
  return Boolean(user?.isActive && user.emailVerifiedAt);
}

function isActiveTrial(user, now) {
  return Boolean(
    user?.premiumTrialStartedAt
    && user?.premiumTrialEndsAt
    && user.premiumTrialStartedAt <= now
    && now < user.premiumTrialEndsAt
  );
}

function notFound() {
  return new AppError('Conta não encontrada.', {
    statusCode: 404,
    code: 'USER_NOT_FOUND'
  });
}

function verificationRequired() {
  return new AppError('Verifique seu e-mail para ativar o acesso Premium.', {
    statusCode: 403,
    code: 'PREMIUM_VERIFICATION_REQUIRED'
  });
}

export function serializePremiumStatus(user, now) {
  const startedAt = user.premiumTrialStartedAt;
  const endsAt = user.premiumTrialEndsAt;
  const trialState = !startedAt
    ? 'NOT_STARTED'
    : isActiveTrial(user, now)
      ? 'ACTIVE'
      : 'EXPIRED';
  const active = trialState === 'ACTIVE';
  const eligible = isVerified(user) && !startedAt;
  const promptMode = !eligible
    ? null
    : user.premiumOfferCohort === 'NEW' && !user.premiumOfferPromptedAt
      ? 'ONBOARDING_MODAL'
      : 'LOGIN_MODAL';

  return {
    serverNow: new Date(now).toISOString(),
    eligible,
    trialState,
    trialStartedAt: startedAt,
    trialEndsAt: endsAt,
    promptMode,
    benefits: {
      seeReceivedLikes: active,
      unlimitedLikes: active,
      dailyLikeLimit: active ? null : FREE_DAILY_LIKE_LIMIT
    }
  };
}

export function createPremiumService({
  repository = premiumRepository,
  clock = { now: () => new Date() }
} = {}) {
  async function loadUser(userId, client) {
    const user = await repository.findById(userId, client);
    if (!user) throw notFound();
    return user;
  }

  return {
    async getPremiumStatus(userId, at = clock.now()) {
      const user = await loadUser(userId);
      return serializePremiumStatus(user, at);
    },

    async hasActiveTrial(userId, at = clock.now(), client) {
      const user = await repository.findById(userId, client);
      return isActiveTrial(user, at);
    },

    async activateTrial(userId, at = clock.now()) {
      const user = await loadUser(userId);
      if (!isVerified(user)) throw verificationRequired();

      if (!user.premiumTrialStartedAt) {
        const startedAt = new Date(at);
        const endsAt = new Date(startedAt.getTime() + PREMIUM_TRIAL_DURATION_MS);
        await repository.activateTrialIfNotStarted({ userId, startedAt, endsAt });
      }

      const latestUser = await loadUser(userId);
      return serializePremiumStatus(latestUser, at);
    },

    async markOfferPrompted(userId, at = clock.now()) {
      const user = await loadUser(userId);
      if (!isVerified(user)) throw verificationRequired();

      if (!user.premiumTrialStartedAt && !user.premiumOfferPromptedAt) {
        await repository.markOfferPromptedIfEmpty({
          userId,
          promptedAt: new Date(at)
        });
      }

      const latestUser = await loadUser(userId);
      return serializePremiumStatus(latestUser, at);
    }
  };
}

export const premiumService = createPremiumService();
