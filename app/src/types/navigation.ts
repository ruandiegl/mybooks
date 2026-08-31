import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Discover: undefined;
  Library: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  BookCreate: undefined;
  BookDetails: { bookId: string };
  BookEdit: { bookId: string };
  Matches: undefined;
  Chat: { conversationId: string; title: string };
};
