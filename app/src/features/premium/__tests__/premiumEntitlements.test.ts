import { describe, expect, it } from 'vitest';
import { canSeeReceivedLikeIdentities, getTrialRemainingMs } from '../premiumEntitlements';

const activeStatus = {
  trialState: 'ACTIVE' as const,
  serverNow: '2026-09-24T12:00:00.000Z',
  trialEndsAt: '2026-09-25T12:00:00.000Z'
};

describe('Premium client entitlement presentation', () => {
  it('fails closed when status is missing or the trial is not active', () => {
    expect(canSeeReceivedLikeIdentities(undefined)).toBe(false);
    expect(canSeeReceivedLikeIdentities({ trialState: 'NOT_STARTED' })).toBe(false);
    expect(canSeeReceivedLikeIdentities({ trialState: 'EXPIRED' })).toBe(false);
  });

  it('shows received identities only while the API status is active', () => {
    expect(canSeeReceivedLikeIdentities(activeStatus)).toBe(true);
    expect(canSeeReceivedLikeIdentities({ trialState: 'ACTIVE' })).toBe(false);
  });

  it('hides identities at the exact end instant using server time and monotonic elapsed time', () => {
    expect(getTrialRemainingMs(activeStatus, 86_399_999)).toBe(1);
    expect(getTrialRemainingMs(activeStatus, 86_400_000)).toBe(0);
    expect(getTrialRemainingMs(activeStatus, 86_500_000)).toBe(0);
  });

  it('fails closed when the server timestamp or trial end is invalid', () => {
    expect(getTrialRemainingMs({ ...activeStatus, serverNow: 'invalid' })).toBe(0);
    expect(getTrialRemainingMs({ ...activeStatus, trialEndsAt: null })).toBe(0);
  });
});
