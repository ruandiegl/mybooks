import type { PremiumTrialState } from './premium.types';

export function canSeeReceivedLikeIdentities(
  status: {
    trialState: PremiumTrialState;
    serverNow?: string;
    trialEndsAt?: string | null;
  } | undefined,
  locallyExpired = false
) {
  return !locallyExpired && status?.trialState === 'ACTIVE' && getTrialRemainingMs(status) > 0;
}

export function getTrialRemainingMs(
  status: { trialState?: PremiumTrialState; serverNow?: string; trialEndsAt?: string | null } | undefined,
  elapsedSinceStatusMs = 0
) {
  if (status?.trialState !== 'ACTIVE' || !status.serverNow || !status.trialEndsAt) return 0;

  const serverNowMs = Date.parse(status.serverNow);
  const trialEndsAtMs = Date.parse(status.trialEndsAt);
  if (!Number.isFinite(serverNowMs) || !Number.isFinite(trialEndsAtMs)) return 0;

  return Math.max(0, trialEndsAtMs - serverNowMs - Math.max(0, elapsedSinceStatusMs));
}
