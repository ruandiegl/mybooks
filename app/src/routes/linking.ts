import type { LinkingOptions } from '@react-navigation/native';
import { Platform } from 'react-native';
import type { RootStackParamList } from '../types/navigation';

const appPrefix = Platform.OS === 'web' && typeof window !== 'undefined' && window.location
  ? window.location.origin
  : 'mybooks://';

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
          Likes: 'likes',
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
