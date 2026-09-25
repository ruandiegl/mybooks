import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { REFRESH_TOKEN_TTL_DAYS } from './auth.tokens.js';

export const REFRESH_COOKIE_NAME = 'trocalivros_refresh';
export const SESSION_TRANSPORT_HEADER = 'X-Session-Transport';
const REFRESH_COOKIE_PATH = '/api/v1/auth';
const REFRESH_COOKIE_MAX_AGE_SECONDS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;

export function isCookieSessionRequest(req) {
  return req.get(SESSION_TRANSPORT_HEADER)?.toLowerCase() === 'cookie';
}

export function assertCookieSessionRequest(req) {
  const origin = req.get('origin');
  if (!origin || !env.CLIENT_ORIGINS.includes(origin)) {
    throw new AppError('Origem não autorizada.', { statusCode: 403, code: 'WEB_ORIGIN_NOT_ALLOWED' });
  }

  let parsedOrigin;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    throw new AppError('Origem não autorizada.', { statusCode: 403, code: 'WEB_ORIGIN_NOT_ALLOWED' });
  }

  if (parsedOrigin.protocol !== 'https:') {
    throw new AppError('Sessões web seguras exigem uma origem HTTPS.', {
      statusCode: 400,
      code: 'HTTPS_REQUIRED_FOR_WEB_SESSION'
    });
  }

  if (!req.secure) {
    throw new AppError('Sessões web seguras exigem HTTPS.', {
      statusCode: 400,
      code: 'HTTPS_REQUIRED_FOR_WEB_SESSION'
    });
  }
}

export function cookieSessionGuard(req, _res, next) {
  if (!isCookieSessionRequest(req)) return next();
  try {
    assertCookieSessionRequest(req);
    return next();
  } catch (error) {
    return next(error);
  }
}

export function readRefreshCookie(req) {
  const header = req.get('cookie');
  if (typeof header !== 'string') return null;

  const matches = header.split(';').map((part) => part.trim())
    .filter((part) => part.startsWith(REFRESH_COOKIE_NAME + '='));
  if (matches.length !== 1) return null;

  try {
    const token = decodeURIComponent(matches[0].slice(REFRESH_COOKIE_NAME.length + 1));
    return token.length > 0 && token.length <= 512 ? token : null;
  } catch {
    return null;
  }
}

export function setRefreshCookie(res, refreshToken) {
  const value = encodeURIComponent(refreshToken);
  res.append('Set-Cookie', [
    REFRESH_COOKIE_NAME + '=' + value,
    'Max-Age=' + REFRESH_COOKIE_MAX_AGE_SECONDS,
    'Path=' + REFRESH_COOKIE_PATH,
    'HttpOnly',
    'Secure',
    'SameSite=Strict'
  ].join('; '));
}

export function clearRefreshCookie(res) {
  res.append('Set-Cookie', [
    REFRESH_COOKIE_NAME + '=',
    'Max-Age=0',
    'Path=' + REFRESH_COOKIE_PATH,
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'HttpOnly',
    'Secure',
    'SameSite=Strict'
  ].join('; '));
}

export function webCookieSessionResponse(req, res, statusCode, session) {
  if (!isCookieSessionRequest(req)) return res.status(statusCode).json({ data: session });

  setRefreshCookie(res, session.refreshToken);
  const data = { ...session };
  delete data.refreshToken;
  return res.status(statusCode).json({ data });
}
