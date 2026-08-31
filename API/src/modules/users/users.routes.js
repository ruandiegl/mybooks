import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { getMe, updateMe } from './users.controller.js';

export const usersRouter = Router();

usersRouter.get('/me', asyncHandler(getMe));
usersRouter.patch('/me', asyncHandler(updateMe));
