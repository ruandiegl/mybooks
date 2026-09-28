import type { PremiumPromptMode } from './premium.types';

export type PremiumPromptPresentation = 'MODAL';

export function resolvePremiumPrompt(
  status: { eligible: boolean; promptMode: PremiumPromptMode },
  onboardingStep: string,
  alreadyPromptedThisSession: boolean
): PremiumPromptPresentation | null {
  if (!status.eligible || alreadyPromptedThisSession) return null;
  if (status.promptMode === 'ONBOARDING_MODAL') {
    return onboardingStep === 'app' ? 'MODAL' : null;
  }
  if (status.promptMode === 'LOGIN_MODAL') return 'MODAL';
  return null;
}
