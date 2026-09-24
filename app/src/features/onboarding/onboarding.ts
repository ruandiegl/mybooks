import type { User } from '../../types/api';

export type OnboardingStep = 'auth' | 'profile' | 'books' | 'app';

export type OnboardingState = {
  registrationComplete: boolean;
  emailVerified: boolean;
  profileComplete: boolean;
  booksComplete: boolean;
  nextStep: OnboardingStep;
};

export function deriveOnboardingState(user: User | null): OnboardingState {
  const registrationComplete = Boolean(user);
  const emailVerified = Boolean(user?.emailVerifiedAt && user.isActive);
  const profileComplete = Boolean(user?.profileCompletedAt);
  const booksComplete = Boolean(user?.booksOnboardingCompletedAt);
  const nextStep: OnboardingStep = !registrationComplete || !emailVerified
    ? 'auth'
    : !profileComplete
      ? 'profile'
      : !booksComplete
        ? 'books'
        : 'app';

  return { registrationComplete, emailVerified, profileComplete, booksComplete, nextStep };
}
