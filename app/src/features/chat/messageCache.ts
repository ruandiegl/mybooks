import type { InfiniteData } from '@tanstack/react-query';
import type { Message, Paginated } from '../../types/api';

export type MessagePages = InfiniteData<Paginated<Message>, unknown>;

export function upsertMessage(old: MessagePages | undefined, message: Message): MessagePages {
  if (!old) {
    return { pages: [{ items: [message], pageInfo: { hasNextPage: false } }], pageParams: [''] };
  }

  const pages = old.pages.map((page) => ({
    ...page,
    items: page.items.filter((item) => item.clientMessageId !== message.clientMessageId)
  }));
  pages[0] = { ...pages[0], items: [...pages[0].items, message] };
  return { ...old, pages };
}

export function updateMessageStatus(old: MessagePages | undefined, clientMessageId: string, status: NonNullable<Message['localStatus']>): MessagePages | undefined {
  if (!old) return old;
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => item.clientMessageId === clientMessageId ? { ...item, localStatus: status } : item)
    }))
  };
}

export function orderMessagePages(data?: MessagePages) {
  return data?.pages.slice().reverse().flatMap((page) => page.items) || [];
}
