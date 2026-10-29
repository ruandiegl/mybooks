import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Discover: undefined;
  Likes: undefined;
  Library: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Auth: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  OnboardingProfile: undefined;
  OnboardingBooks: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  BookCreate: undefined;
  ExchangeBookDetails: { conversationId: string; bookId: string };
  BookDetails: { bookId: string };
  PublicProfile: { userId: string };
  BookEdit: { bookId: string };
  Matches: undefined;
  StreakLeaderboard: undefined;
  Chat: { conversationId: string; title?: string };
};
