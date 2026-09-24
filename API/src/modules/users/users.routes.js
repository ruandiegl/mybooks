import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { completeBooksOnboarding, getMe, skipProfileOnboarding, updateMe } from './users.controller.js';
import { completeAvatar, deleteAvatar, presignAvatar } from '../media/avatar.controller.js';

export const usersRouter = Router();

usersRouter.get('/me', asyncHandler(getMe));
usersRouter.patch('/me', asyncHandler(updateMe));
usersRouter.post('/me/onboarding/profile/skip', asyncHandler(skipProfileOnboarding));
usersRouter.post('/me/onboarding/books/complete', asyncHandler(completeBooksOnboarding));
usersRouter.post('/me/avatar/presign', asyncHandler(presignAvatar));
usersRouter.post('/me/avatar/complete', asyncHandler(completeAvatar));
usersRouter.delete('/me/avatar', asyncHandler(deleteAvatar));
