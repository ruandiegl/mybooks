import express from 'express';
import path from 'node:path';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import { healthRouter } from './modules/health/health.routes.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './shared/http/errorHandler.js';
import { requestContext } from './shared/http/requestContext.js';
import { metrics } from './shared/observability/metrics.js';
import { AppError } from './shared/errors/AppError.js';

function corsOrigin(origin, callback) {
  if (!origin || env.CLIENT_ORIGINS.includes(origin)) {
    return callback(null, true);
  }
  return callback(new AppError('Origem não autorizada.', {
    statusCode: 403,
    code: 'WEB_ORIGIN_NOT_ALLOWED'
  }));
}

export function sanitizeRequestPath(originalUrl) {
  if (typeof originalUrl === 'string' && /^\/api\/v1\/isbn\/[^/?#]+/i.test(originalUrl)) {
    return '/api/v1/isbn/:isbn';
  }
  return originalUrl;
}

function requestLog(req, res, next) {
  const startedAt = performance.now();
  metrics.increment('httpRequests');
  res.on('finish', () => {
    console.info(JSON.stringify({
      level: 'info',
      requestId: req.requestId,
      method: req.method,
      path: sanitizeRequestPath(req.originalUrl),
      status: res.statusCode,
      durationMs: Math.round(performance.now() - startedAt)
    }));
  });
  next();
}

function sanitizedErrorHandler(error, req, res, next) {
  const originalUrl = req.originalUrl;
  req.originalUrl = sanitizeRequestPath(originalUrl);
  try {
    return errorHandler(error, req, res, next);
  } finally {
    req.originalUrl = originalUrl;
  }
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestContext);
  app.use(requestLog);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/covers', express.static(path.join(process.cwd(), 'assets', 'covers')));

  app.use('/health', healthRouter);
  app.use('/api/v1', rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    legacyHeaders: false
  }));
  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(sanitizedErrorHandler);
  return app;
}
