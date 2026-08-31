import { prisma } from '../../shared/database/prisma.js';

const conversationInclude = {
  match: {
    include: {
      userA: { select: { id: true, name: true, avatarUrl: true, city: true } },
      userB: { select: { id: true, name: true, avatarUrl: true, city: true } }
    }
  },
  messages: {
    take: 1,
    orderBy: { createdAt: 'desc' },
    include: { sender: { select: { id: true, name: true } } }
  }
};

export const chatRepository = {
  findMembership(conversationId, userId) {
    return prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } }
    });
  },

  listConversations(userId) {
    return prisma.conversation.findMany({
      where: { members: { some: { userId } } },
      include: conversationInclude,
      orderBy: { updatedAt: 'desc' }
    });
  },

  listMessages(conversationId, { cursor, limit }) {
    return prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } }
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });
  },

  async createMessage({ conversationId, senderId, clientMessageId, body }) {
    try {
      return await prisma.$transaction(async (tx) => {
        const message = await tx.message.create({
          data: { conversationId, senderId, clientMessageId, body },
          include: { sender: { select: { id: true, name: true, avatarUrl: true } } }
        });
        await tx.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() }
        });
        return message;
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        return prisma.message.findUnique({
          where: { senderId_clientMessageId: { senderId, clientMessageId } },
          include: { sender: { select: { id: true, name: true, avatarUrl: true } } }
        });
      }
      throw error;
    }
  },

  markRead(conversationId, userId) {
    return prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() }
    });
  }
};
