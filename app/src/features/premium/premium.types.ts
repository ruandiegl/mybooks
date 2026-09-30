export type PremiumPromptMode = 'ONBOARDING_MODAL' | 'LOGIN_MODAL' | null;
export type PremiumTrialState = 'NOT_STARTED' | 'ACTIVE' | 'EXPIRED';

export type PremiumStatus = {
  serverNow: string;
  eligible: boolean;
  trialState: PremiumTrialState;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  promptMode: PremiumPromptMode;
  benefits: {
    seeReceivedLikes: boolean;
    unlimitedLikes: boolean;
    dailyLikeLimit: number | null;
  };
};
