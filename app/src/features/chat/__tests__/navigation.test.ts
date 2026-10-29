import { describe, expect, it } from 'vitest';
import { resolveChatEntryState, shouldNavigateForRemovedMatch, type MatchRemovedEvent } from '../navigation';

const removal: MatchRemovedEvent = {
  matchId: '11111111-1111-4111-8111-111111111111',
  conversationId: '22222222-2222-4222-8222-222222222222'
};

describe('chat removal navigation', () => {
  it('resets only when the removed conversation exists in the current navigation state', () => {
    const state = {
      index: 1,
      routes: [
        { name: 'Main', state: { index: 2, routes: [{ name: 'Discover' }, { name: 'Library' }, { name: 'Messages' }] } },
        { name: 'Chat', params: { conversationId: removal.conversationId } }
      ]
    };
    expect(shouldNavigateForRemovedMatch(state, removal, new Set())).toBe(true);
    expect(shouldNavigateForRemovedMatch(state, removal, new Set([removal.matchId]))).toBe(false);
  });

  it('recognizes a contextual book route nested under the active stack', () => {
    const state = {
      index: 0,
      routes: [{
        name: 'Main',
        state: { routes: [{ name: 'ExchangeBookDetails', params: { conversationId: removal.conversationId, bookId: 'book-1' } }] }
      }]
    };
    expect(shouldNavigateForRemovedMatch(state, removal, new Set())).toBe(true);
  });

  it('does not reset an unrelated chat or screen', () => {
    const state = {
      index: 0,
      routes: [
        { name: 'Chat', params: { conversationId: '33333333-3333-4333-8333-333333333333' } },
        { name: 'Main', state: { routes: [{ name: 'Discover' }] } }
      ]
    };
    expect(shouldNavigateForRemovedMatch(state, removal, new Set())).toBe(false);
  });

  it('does not reset for a matching chat route that is no longer active', () => {
    const state = {
      index: 0,
      routes: [
        { name: 'Main', state: { index: 0, routes: [{ name: 'Discover' }, { name: 'Chat', params: { conversationId: removal.conversationId } }] } },
        { name: 'Chat', params: { conversationId: removal.conversationId } }
      ]
    };
    expect(shouldNavigateForRemovedMatch(state, removal, new Set())).toBe(false);
  });
});

describe('chat entry state', () => {
  it('offers a retry on conversation query failure before deciding membership is missing', () => {
    expect(resolveChatEntryState({ isLoading: false, isError: true, containsConversation: false })).toBe('retry');
  });

  it('reports unavailable only after a successful query excludes the conversation', () => {
    expect(resolveChatEntryState({ isLoading: false, isError: false, containsConversation: false })).toBe('unavailable');
  });
});