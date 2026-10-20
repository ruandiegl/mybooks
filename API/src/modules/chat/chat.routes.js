import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import {
  getExchangeBook,
  listConversations,
  listMessages,
  markRead,
  sendMessage
} from './chat.controller.js';

export const chatRouter = Router();

chatRouter.get('/', asyncHandler(listConversations));
chatRouter.get('/:conversationId/exchange-books/:bookId', asyncHandler(getExchangeBook));
chatRouter.get('/:conversationId/messages', asyncHandler(listMessages));
chatRouter.post('/:conversationId/messages', asyncHandler(sendMessage));
chatRouter.post('/:conversationId/read', asyncHandler(markRead));
