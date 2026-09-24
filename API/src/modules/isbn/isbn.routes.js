import { createHash } from 'node:crypto';
import { Router } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { lookupIsbn } from './isbn.controller.js';

export const isbnRouter = Router();

const limitedResponse = (req, res) => res.status(429).json({
  error: {
    code: 'RATE_LIMITED',
    message: 'Muitas consultas de ISBN. Aguarde e tente novamente.',
    requestId: req.requestId
  }
});

const rateKey = (req) => {
  const subject = req.currentUser?.id
    ? `user:${req.currentUser.id}`
    : `ip:${ipKeyGenerator(req.ip || '0.0.0.0')}`;

  return createHash('sha256').update(`isbn:${subject}`).digest('hex');
};

const isbnLimiter = rateLimit({
  windowMs: env.ISBN_RATE_LIMIT_WINDOW_MS,
  limit: env.ISBN_LOOKUP_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateKey,
  handler: limitedResponse
});

isbnRouter.get('/:isbn', isbnLimiter, asyncHandler(lookupIsbn));
