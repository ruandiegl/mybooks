import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import {
  listReceivedLikes,
  listSentLikes,
  getReceivedLikesCount,
  listBooksWithLikes
} from './likes.controller.js';

export const likesRouter = Router();

likesRouter.get('/received', asyncHandler(listReceivedLikes));
likesRouter.get('/sent', asyncHandler(listSentLikes));
likesRouter.get('/received/count', asyncHandler(getReceivedLikesCount));
likesRouter.get('/received/books', asyncHandler(listBooksWithLikes));
