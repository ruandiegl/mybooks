import { serializeAvatarUser } from '../media/avatar.serializer.js';
import { AppError } from '../../shared/errors/AppError.js';
import {
  conversationIdSchema,
  exchangeBookParamsSchema,
  messagePaginationSchema,
  messageSchema
} from './chat.schemas.js';
import { chatRepository } from './chat.repository.js';
import { serializeBook } from '../books/books.serializer.js';

async function serializeBookSummary(book) {
  if (!book) return null;
  const { id, title, authors, coverUrl, coverUrlExpiresAt, availability } = await serializeBook(book);
  return { id, title, authors, coverUrl, coverUrlExpiresAt, availability };
}

async function serializeMessage(message, avatarCache = new Map()) {
  return {
    id: message.id,
    clientMessageId: message.clientMessageId,
    conversationId: message.conversationId,
    senderId: message.senderId,
    sender: await serializeAvatarUser(message.sender, avatarCache, false),
    body: message.body,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt
  };
}

async function assertMember(conversationId, userId) {
  conversationIdSchema.parse(conversationId);
  const membership = await chatRepository.findMembership(conversationId, userId);
  if (!membership) {
    throw new AppError('Conversa não encontrada ou sem permissão.', {
      statusCode: 404,
      code: 'CONVERSATION_NOT_FOUND'
    });
  }
  return membership;
}

export const chatService = {
  assertMember,

  async listConversations(userId) {
    const rows = await chatRepository.listConversations(userId);
    const cache = new Map();
    return Promise.all(rows.map(async (conversation) => {
      const otherUser = conversation.match.userAId === userId
        ? conversation.match.userB
        : conversation.match.userA;
      const [bookA, bookB] = await Promise.all([
        serializeBookSummary(conversation.match.bookA),
        serializeBookSummary(conversation.match.bookB)
      ]);
      return {
        id: conversation.id,
        matchId: conversation.matchId,
        otherUser: await serializeAvatarUser(otherUser, cache),
        exchangeBooks: bookA || bookB
          ? (conversation.match.userAId === userId
            ? { mine: bookA, theirs: bookB }
            : { mine: bookB, theirs: bookA })
          : null,
        lastMessage: conversation.messages[0]
          ? await serializeMessage(conversation.messages[0], cache)
          : null,
        updatedAt: conversation.updatedAt
      };
    }));
  },

  async getExchangeBook(userId, conversationId, bookId) {
    const params = exchangeBookParamsSchema.parse({ conversationId, bookId });
    const context = await chatRepository.findExchangeBookContext(params.conversationId, userId, params.bookId);
    const match = context?.match;
    const book = match?.bookAId === bookId
      ? match.bookA
      : match?.bookBId === bookId ? match.bookB : null;
    if (!book) {
      throw new AppError('Livro da troca não encontrado.', {
        statusCode: 404,
        code: 'EXCHANGE_BOOK_NOT_FOUND'
      });
    }
    return serializeBook(book);
  },

  async listMessages(userId, conversationId, query) {
    await assertMember(conversationId, userId);
    const pagination = messagePaginationSchema.parse(query);
    const rows = await chatRepository.listMessages(conversationId, userId, pagination);
    const hasNextPage = rows.length > pagination.limit;
    const selected = hasNextPage ? rows.slice(0, pagination.limit) : rows;

    const cache = new Map();
    return {
      items: (await Promise.all(selected.map((message) => serializeMessage(message, cache)))).reverse(),
      pageInfo: {
        hasNextPage,
        nextCursor: hasNextPage ? selected.at(-1)?.id ?? null : null
      }
    };
  },

  async sendMessage(userId, conversationId, input) {
    await assertMember(conversationId, userId);
    const data = messageSchema.parse(input);
    const message = await chatRepository.createMessage({
      conversationId,
      senderId: userId,
      ...data
    });
    return serializeMessage(message);
  },

  async markRead(userId, conversationId) {
    await assertMember(conversationId, userId);
    await chatRepository.markRead(conversationId, userId);
  }
};
