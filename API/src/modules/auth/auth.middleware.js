import { AppError } from '../../shared/errors/AppError.js';
import { verifyAccessToken } from './auth.crypto.js';
import { authRepository } from './auth.repository.js';

const unauthenticated = () => new AppError('Sessão inválida ou expirada.', {
  statusCode: 401,
  code: 'UNAUTHENTICATED'
});

export function createAuthenticate({
  verifyToken = verifyAccessToken,
  findActiveSession = authRepository.findActiveSession.bind(authRepository)
} = {}) {
  return async function authenticateRequest(req, _res, next) {
    try {
      const authorization = req.header('authorization');
      const match = typeof authorization === 'string' ? /^Bearer ([^\s]+)$/.exec(authorization) : null;
      if (!match) return next(unauthenticated());

      const identity = await verifyToken(match[1]);
      const session = await findActiveSession(identity.sessionId, identity.userId, new Date());
      if (!session?.user || session.user.id !== identity.userId) return next(unauthenticated());

      req.identity = identity;
      req.currentUser = session.user;
      return next();
    } catch {
      return next(unauthenticated());
    }
  };
}

export const authenticate = createAuthenticate();

export async function attachCurrentUser(req, _res, next) {
  if (req.currentUser) return next();
  return next(unauthenticated());
}
