import { AppError } from '../../shared/errors/AppError.js';
import { prisma } from '../../shared/database/prisma.js';
import { visibleMatchFilter } from '../moderation/moderation.visibility.js';

const bookSummarySelect = {
  id: true,
  title: true,
  authors: true,
  availability: true,
  coverExternalUrl: true,
  images: {
    select: { id: true, url: true, storageKey: true, isCover: true, sortOrder: true, createdAt: true },
    orderBy: { sortOrder: 'asc' },
    take: 1
  }
};

const bookDetailsSelect = {
  ...bookSummarySelect,
  subtitle: true,
  publisher: true,
  synopsis: true,
  year: true,
  pageCount: true,
  subjects: true,
  isbn: true,
  isbnStatus: true,
  isbnProvider: true,
  images: {
    select: { id: true, url: true, storageKey: true, isCover: true, sortOrder: true, createdAt: true },
    orderBy: { sortOrder: 'asc' }
  },
  owner: { select: { id: true, name: true, avatarStorageKey: true, avatarVersion: true, avatarUrl: true, city: true } },
  createdAt: true,
  updatedAt: true
};

const conversationInclude = {
  match: {
    select: {
      userAId: true,
      userBId: true,
      userA: { select: { id: true, name: true, avatarStorageKey: true, avatarVersion: true, avatarUrl: true, city: true } },
      userB: { select: { id: true, name: true, avatarStorageKey: true, avatarVersion: true, avatarUrl: true, city: true } },
      bookA: { select: bookSummarySelect },
      bookB: { select: bookSummarySelect }
    }
  },
  messages: {
    take: 1,
    orderBy: { createdAt: 'desc' },
    include: { sender: { select: { id: true, name: true, avatarStorageKey: true, avatarVersion: true, avatarUrl: true } } }
  }
};

function conversationNotFound() {
  return new AppError('Conversa não encontrada ou sem permissão.', { statusCode: 404, code: 'CONVERSATION_NOT_FOUND' });
}

export const chatRepository = {
  findMembership(conversationId, userId) {
    return prisma.conversationMember.findFirst({
      where: { conversationId, userId, conversation: { match: visibleMatchFilter(userId) } }
    });
  },

  listConversations(userId) {
    return prisma.conversation.findMany({
      where: { members: { some: { userId } }, match: visibleMatchFilter(userId) },
      include: conversationInclude,
      orderBy: { updatedAt: 'desc' }
    });
  },

  findExchangeBookContext(conversationId, userId, bookId) {
    return prisma.conversation.findFirst({
      where: {
        id: conversationId,
        members: { some: { userId } },
        match: { OR: [{ bookAId: bookId }, { bookBId: bookId }], ...visibleMatchFilter(userId) }
      },
      select: {
        match: {
          select: {
            bookAId: true,
            bookBId: true,
            bookA: { select: bookDetailsSelect },
            bookB: { select: bookDetailsSelect }
          }
        }
      }
    });
  },

  listMessages(conversationId, userId, { cursor, limit }) {
    return prisma.message.findMany({
      where: { conversationId, conversation: { match: visibleMatchFilter(userId) } },
      include: {
        sender: { select: { id: true, name: true, avatarStorageKey: true, avatarVersion: true, avatarUrl: true } }
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });
  },

  async createMessage({ conversationId, senderId, clientMessageId, body }) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await prisma.$transaction(async (tx) => {
          const membership = await tx.conversationMember.findFirst({
            where: { conversationId, userId: senderId, conversation: { match: visibleMatchFilter(senderId) } }
          });
          if (!membership) throw conversationNotFound();
          const existing = await tx.message.findUnique({
            where: { senderId_clientMessageId: { senderId, clientMessageId } },
            include: { sender: { select: { id: true, name: true, avatarStorageKey: true, avatarVersion: true, avatarUrl: true } } }
          });
          if (existing) {
            if (existing.conversationId !== conversationId) {
              throw new AppError('Identificador de mensagem já utilizado.', { statusCode: 409, code: 'MESSAGE_ID_CONFLICT' });
            }
            return existing;
          }
          const message = await tx.message.create({
            data: { conversationId, senderId, clientMessageId, body },
            include: { sender: { select: { id: true, name: true, avatarStorageKey: true, avatarVersion: true, avatarUrl: true } } }
          });
          await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
          return message;
        }, { isolationLevel: 'Serializable' });
      } catch (error) {
        if (error?.code === 'P2003' || error?.code === 'P2025') throw conversationNotFound();
        if (error?.code === 'P2034' || error?.code === 'P2002') {
          if (attempt < 2) continue;
          throw new AppError('A conversa mudou durante o envio. Tente novamente.', { statusCode: 409, code: 'MESSAGE_RETRY_REQUIRED' });
        }
        throw error;
      }
    }
  },
  markRead(conversationId, userId) {
    return prisma.conversationMember.updateMany({
      where: { conversationId, userId, conversation: { match: visibleMatchFilter(userId) } },
      data: { lastReadAt: new Date() }
    });
  }
};
