import { createHash } from 'node:crypto';
import { Router } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { authenticate } from './auth.middleware.js';
import { createAuthController } from './auth.controller.js';
import { cookieSessionGuard, readRefreshCookie } from './auth.web-session.js';

const defaults = {
  register: { windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS, limit: env.AUTH_REGISTER_LIMIT },
  verify: { windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS, limit: env.AUTH_VERIFY_LIMIT },
  resend: { windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS, limit: env.AUTH_RESEND_LIMIT },
  login: { windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS, limit: env.AUTH_LOGIN_LIMIT },
  refresh: { windowMs: env.AUTH_REFRESH_RATE_LIMIT_WINDOW_MS, limit: env.AUTH_REFRESH_LIMIT },
  forgot: { windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS, limit: env.AUTH_FORGOT_PASSWORD_LIMIT },
  reset: { windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS, limit: env.AUTH_RESET_PASSWORD_LIMIT },
  logout: { windowMs: env.AUTH_REFRESH_RATE_LIMIT_WINDOW_MS, limit: env.AUTH_REFRESH_LIMIT }
};

const limitedResponse = (req, res) => res.status(429).json({
  error: {
    code: 'RATE_LIMITED',
    message: 'Muitas tentativas. Aguarde e tente novamente.',
    requestId: req.requestId
  }
});

const rateKey = (scope) => (req) => {
  const ip = ipKeyGenerator(req.ip || '0.0.0.0');
  const subject = req.body?.email || req.body?.refreshToken || readRefreshCookie(req) || '';
  return createHash('sha256').update(`${scope}:${ip}:${String(subject).trim().toLowerCase()}`).digest('hex');
};

const limiter = (scope, options) => rateLimit({
  windowMs: options.windowMs,
  limit: options.limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: rateKey(scope),
  handler: limitedResponse
});

export function createAuthRouter({ service, authenticateMiddleware = authenticate, getMe, limits = {} } = {}) {
  const router = Router();
  const controller = createAuthController({ service, getMe });
  const config = Object.fromEntries(Object.entries(defaults).map(([name, value]) => [name, { ...value, ...limits[name] }]));

  router.post('/register', limiter('register', config.register), asyncHandler(controller.register));
  router.post('/verify-email', cookieSessionGuard, limiter('verify', config.verify), asyncHandler(controller.verifyEmail));
  router.post('/resend-verification', limiter('resend', config.resend), asyncHandler(controller.resendVerification));
  router.post('/login', cookieSessionGuard, limiter('login', config.login), asyncHandler(controller.login));
  router.post('/refresh', cookieSessionGuard, limiter('refresh', config.refresh), asyncHandler(controller.refresh));
  router.post('/logout', cookieSessionGuard, limiter('logout', config.logout), asyncHandler(controller.logout));
  router.post('/forgot-password', limiter('forgot', config.forgot), asyncHandler(controller.forgotPassword));
  router.post('/reset-password', limiter('reset', config.reset), asyncHandler(controller.resetPassword));
  router.post('/logout-all', authenticateMiddleware, asyncHandler(controller.logoutAll));
  router.get('/me', authenticateMiddleware, asyncHandler(controller.me));

  return router;
}

export const authRouter = createAuthRouter();
