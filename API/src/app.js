import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { clerkMiddleware } from '@clerk/express';
import { env } from './config/env.js';
import { healthRouter } from './modules/health/health.routes.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './shared/http/errorHandler.js';
import { requestContext } from './shared/http/requestContext.js';
import { metrics } from './shared/observability/metrics.js';

function corsOrigin(origin, callback) {
  if (!origin || env.CLIENT_ORIGINS.includes(origin)) {
    return callback(null, true);
  }
  return callback(new Error('Origem não autorizada.'));
}

function requestLog(req, res, next) {
  const startedAt = performance.now();
  metrics.increment('httpRequests');
  res.on('finish', () => {
    console.info(JSON.stringify({
      level: 'info',
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(performance.now() - startedAt)
    }));
  });
  next();
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

  if (env.AUTH_MODE === 'clerk') {
    app.use(clerkMiddleware({
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
      authorizedParties: env.CLERK_AUTHORIZED_PARTIES.length
        ? env.CLERK_AUTHORIZED_PARTIES
        : undefined
    }));
  }

  app.use('/health', healthRouter);
  app.use('/api/v1', rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    legacyHeaders: false
  }));
  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
