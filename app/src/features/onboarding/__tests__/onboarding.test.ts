import { describe, expect, it } from 'vitest';
import { deriveOnboardingState } from '../onboarding';
import type { User } from '../../../types/api';

const user = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  name: 'Leitor',
  email: 'reader@example.com',
  emailVerifiedAt: '2026-09-11T12:00:00.000Z',
  interests: [],
  profileCompletedAt: '2026-09-11T12:01:00.000Z',
  booksOnboardingCompletedAt: '2026-09-11T12:02:00.000Z',
  isActive: true,
  ...overrides
});

describe('onboarding guards', () => {
  it('keeps absent and unverified sessions outside the private app', () => {
    expect(deriveOnboardingState(null).nextStep).toBe('auth');
    expect(deriveOnboardingState(user({ emailVerifiedAt: null })).nextStep).toBe('auth');
  });

  it('sends a newly verified user through the two optional steps in order', () => {
    expect(deriveOnboardingState(user({ profileCompletedAt: null, booksOnboardingCompletedAt: null })).nextStep).toBe('profile');
    expect(deriveOnboardingState(user({ booksOnboardingCompletedAt: null })).nextStep).toBe('books');
  });

  it('opens the app after both optional steps are completed or skipped', () => {
    expect(deriveOnboardingState(user()).nextStep).toBe('app');
  });
});
