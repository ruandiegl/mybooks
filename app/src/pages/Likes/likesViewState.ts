export type LikesTab = 'received' | 'sent';
export type LikesViewState = 'loading' | 'receivedError' | 'sentError' | 'received' | 'sent';

export function getLikesViewState(tab: LikesTab, isLoading: boolean, isError: boolean): LikesViewState {
  if (isLoading) return 'loading';
  if (isError) return tab === 'received' ? 'receivedError' : 'sentError';
  return tab;
}
