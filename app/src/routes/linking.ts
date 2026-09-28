import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';

const appPrefix = typeof window === 'undefined' ? 'mybooks://' : window.location.origin;

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [appPrefix],
  config: {
    screens: {
      Auth: 'auth',
      OnboardingProfile: 'onboarding/profile',
      OnboardingBooks: 'onboarding/books',
      Main: {
        path: '',
        initialRouteName: 'Discover',
        screens: {
          Discover: 'discover',
          Library: 'library',
          Messages: 'messages',
          Profile: 'profile'
        }
      },
      BookCreate: 'books/new',
      BookDetails: 'books/:bookId',
      BookEdit: 'books/:bookId/edit',
      Matches: 'matches',
      Chat: 'chat/:conversationId'
    }
  }
};
