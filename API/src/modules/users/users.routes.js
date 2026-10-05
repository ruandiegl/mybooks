import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { AppError } from '../../shared/errors/AppError.js';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { completeBooksOnboarding, getMe, skipProfileOnboarding, updateMe } from './users.controller.js';
import { completeAvatar, deleteAvatar, presignAvatar } from '../media/avatar.controller.js';

export const usersRouter = Router();
const avatarLimit = (limit) => rateLimit({
  windowMs: 60_000, limit, standardHeaders: 'draft-8', legacyHeaders: false,
  keyGenerator: (req) => req.currentUser?.id ?? ipKeyGenerator(req.ip ?? ''),
  handler: (_req, _res, next) => next(new AppError('Tente novamente em instantes.', { statusCode: 429, code: 'RATE_LIMITED' }))
});

usersRouter.get('/me', asyncHandler(getMe));
usersRouter.patch('/me', asyncHandler(updateMe));
usersRouter.post('/me/onboarding/profile/skip', asyncHandler(skipProfileOnboarding));
usersRouter.post('/me/onboarding/books/complete', asyncHandler(completeBooksOnboarding));
usersRouter.post('/me/avatar/presign', avatarLimit(10), asyncHandler(presignAvatar));
usersRouter.post('/me/avatar/complete', avatarLimit(20), asyncHandler(completeAvatar));
usersRouter.delete('/me/avatar', asyncHandler(deleteAvatar));
