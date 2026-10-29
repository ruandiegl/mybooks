// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const queryState = vi.hoisted(() => ({
  detail: {
    data: { id: 'book-a', title: 'Livro removido', authors: [], subjects: [], images: [], availability: 'AVAILABLE' },
    isLoading: false,
    isError: true,
    error: { isAxiosError: true, response: { status: 404 } },
    refetch: vi.fn()
  }
}));

vi.mock('react-native', async () => await import('react-native-web'));
vi.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
vi.mock('@tanstack/react-query', () => ({ useQuery: ({ queryKey }: { queryKey: string[] }) => queryKey[0] === 'exchange-book'
  ? queryState.detail
  : { data: null } }));
vi.mock('../../../features/avatar/useAvatarRefresh', () => ({ useAvatarRefresh: () => vi.fn() }));
vi.mock('../../../features/media/useMediaBinding', () => ({ useMediaBinding: () => null }));
vi.mock('../../../styles/useThemedStyles', () => ({ useThemedStyles: () => ({ page: {}, content: {} }) }));
vi.mock('../../../components/StateView', () => ({ StateView: ({ title }: { title: string }) => <div>{title}</div> }));
vi.mock('../../../components/AppButton', () => ({ AppButton: () => null }));
vi.mock('../../../components/Avatar', () => ({ Avatar: () => null }));
vi.mock('../../../components/ReputationStars', () => ({ ReputationStars: () => null }));
vi.mock('../../../components/BookGallery', () => ({ BookGallery: () => null }));
vi.mock('../../../components/Badge', () => ({ Badge: () => null }));
vi.mock('../../../components/IsbnBadge', () => ({ IsbnBadge: () => null }));

import { BookDetails } from '../index';

afterEach(cleanup);

describe('contextual book details after match removal', () => {
  it('shows the unavailable state when a refetch returns 404 despite cached book data', () => {
    render(<BookDetails
      route={{ params: { conversationId: '22222222-2222-4222-8222-222222222222', bookId: 'book-a' } } as any}
      navigation={{ navigate: vi.fn() } as any}
    />);

    expect(screen.getByText('Detalhes da troca indisponíveis')).toBeTruthy();
    expect(screen.queryByText('Livro removido')).toBeNull();
  });
});
