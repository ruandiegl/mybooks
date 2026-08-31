import { getAuth } from '@clerk/express';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { usersService } from '../users/users.service.js';

export function authenticate(req, _res, next) {
  if (env.AUTH_MODE === 'development') {
    const clerkUserId = req.header('x-dev-user-id');
    if (!clerkUserId) {
      return next(new AppError('Envie x-dev-user-id no modo de desenvolvimento.', {
        statusCode: 401,
        code: 'UNAUTHENTICATED'
      }));
    }
    req.identity = { clerkUserId };
    return next();
  }

  const auth = getAuth(req);
  if (!auth.userId) {
    return next(new AppError('Sessão inválida ou expirada.', {
      statusCode: 401,
      code: 'UNAUTHENTICATED'
    }));
  }

  req.identity = { clerkUserId: auth.userId, sessionId: auth.sessionId };
  return next();
}

export async function attachCurrentUser(req, _res, next) {
  try {
    req.currentUser = await usersService.ensureCurrentUser(req.identity.clerkUserId);
    next();
  } catch (error) {
    next(error);
  }
}
