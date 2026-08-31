import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import {
  listConversations,
  listMessages,
  markRead,
  sendMessage
} from './chat.controller.js';

export const chatRouter = Router();

chatRouter.get('/', asyncHandler(listConversations));
chatRouter.get('/:conversationId/messages', asyncHandler(listMessages));
chatRouter.post('/:conversationId/messages', asyncHandler(sendMessage));
chatRouter.post('/:conversationId/read', asyncHandler(markRead));
