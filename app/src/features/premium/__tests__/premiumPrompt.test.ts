import { describe, expect, it } from 'vitest';
import { resolvePremiumPrompt } from '../premiumPrompt';

const eligibleNewAccount = {
  eligible: true,
  promptMode: 'ONBOARDING_MODAL' as const
};

describe('premium offer prompting', () => {
  it('waits until onboarding is complete before opening the new account modal', () => {
    expect(resolvePremiumPrompt(eligibleNewAccount, 'books', false)).toBeNull();
    expect(resolvePremiumPrompt(eligibleNewAccount, 'app', false)).toBe('MODAL');
  });

  it('opens a modal bottom sheet for an existing account immediately after login, once per session', () => {
    const existingAccount = { eligible: true, promptMode: 'LOGIN_MODAL' as const };
    expect(resolvePremiumPrompt(existingAccount, 'profile', false)).toBe('MODAL');
    expect(resolvePremiumPrompt(existingAccount, 'app', false)).toBe('MODAL');
    expect(resolvePremiumPrompt(existingAccount, 'app', true)).toBeNull();
  });

  it('does not prompt accounts that cannot activate the trial', () => {
    expect(resolvePremiumPrompt({ eligible: false, promptMode: null }, 'app', false)).toBeNull();
    expect(resolvePremiumPrompt({ eligible: true, promptMode: null }, 'app', false)).toBeNull();
  });
});
