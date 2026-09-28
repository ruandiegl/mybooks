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
  OnboardingProfile: undefined;
  OnboardingBooks: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  BookCreate: undefined;
  BookDetails: { bookId: string };
  BookEdit: { bookId: string };
  Matches: undefined;
  Chat: { conversationId: string; title: string };
};
