import { getStateFromPath } from '@react-navigation/core';
import { describe, expect, it, vi } from 'vitest';
const platform = vi.hoisted(() => ({ OS: 'web' }));
vi.mock('react-native', () => ({ Platform: platform }));
import { linking } from '../linking';

describe('web app deep links', () => {
  it('keeps the native prefix when React Native defines window without a location', async () => {
    platform.OS = 'ios';
    vi.stubGlobal('window', {});
    vi.resetModules();
    try {
      const native = await import('../linking');
      expect(native.linking.prefixes).toEqual(['mybooks://']);
    } finally {
      platform.OS = 'web';
      vi.unstubAllGlobals();
    }
  });
  it('maps the likes page to the existing Likes tab', () => {
    const state = getStateFromPath('/likes', linking.config);
    expect(state?.routes.at(-1)?.name).toBe('Main');
    expect(state?.routes.at(-1)?.state?.routes.at(-1)).toMatchObject({ name: 'Likes' });
  });
  it('maps direct book URLs to the book details route', () => {
    const state = getStateFromPath('/books/book-42', linking.config);
    expect(state?.routes.at(-1)).toMatchObject({ name: 'BookDetails', params: { bookId: 'book-42' } });
  });

  it('maps chat URLs and main tabs without requiring private data in the URL', () => {
    const chat = getStateFromPath('/chat/conversation-7', linking.config);
    expect(chat?.routes.at(-1)).toMatchObject({ name: 'Chat', params: { conversationId: 'conversation-7' } });

    const discover = getStateFromPath('/discover', linking.config);
    expect(discover?.routes.at(-1)).toMatchObject({ name: 'Main', state: { routes: [{ name: 'Discover' }] } });
  });
});
