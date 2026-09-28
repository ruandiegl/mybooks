import { getStateFromPath } from '@react-navigation/core';
import { describe, expect, it } from 'vitest';
import { linking } from '../linking';

describe('web app deep links', () => {
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
