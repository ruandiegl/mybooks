import { AppError } from '../../shared/errors/AppError.js';
import {
  conversationIdSchema,
  messagePaginationSchema,
  messageSchema
} from './chat.schemas.js';
import { chatRepository } from './chat.repository.js';

function serializeMessage(message) {
  return {
    id: message.id,
    clientMessageId: message.clientMessageId,
    conversationId: message.conversationId,
    senderId: message.senderId,
    sender: message.sender,
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
    return rows.map((conversation) => {
      const otherUser = conversation.match.userAId === userId
        ? conversation.match.userB
        : conversation.match.userA;
      return {
        id: conversation.id,
        matchId: conversation.matchId,
        otherUser,
        lastMessage: conversation.messages[0]
          ? serializeMessage(conversation.messages[0])
          : null,
        updatedAt: conversation.updatedAt
      };
    });
  },

  async listMessages(userId, conversationId, query) {
    await assertMember(conversationId, userId);
    const pagination = messagePaginationSchema.parse(query);
    const rows = await chatRepository.listMessages(conversationId, pagination);
    const hasNextPage = rows.length > pagination.limit;
    const selected = hasNextPage ? rows.slice(0, pagination.limit) : rows;

    return {
      items: selected.map(serializeMessage).reverse(),
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
