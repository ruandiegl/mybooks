import { createHmac, randomInt, randomUUID } from 'node:crypto';
import { ACCESS_TOKEN_TTL_SECONDS, getAuthSecret } from './auth.constants.js';
import { createOpaqueToken, hashOpaqueToken, signAccessToken } from './auth.crypto.js';

export const AUTH_CODE_TTL_MINUTES = 15;
export const AUTH_CODE_MAX_ATTEMPTS = 5;
export const VERIFICATION_RESEND_COOLDOWN_MS = 60_000;
export const REFRESH_TOKEN_TTL_DAYS = 30;

const minutes = (value) => value * 60 * 1000;
const days = (value) => value * 24 * 60 * 60 * 1000;

export const createAuthCodeMaterial = (now) => {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');

  return {
    code,
    stored: {
      codeHash: hashOpaqueToken(code),
      expiresAt: new Date(now.getTime() + minutes(AUTH_CODE_TTL_MINUTES)),
      attempts: 0,
      consumedAt: null,
      lastSentAt: now,
      createdAt: now
    }
  };
};

export const normalizeSessionMeta = (meta = {}) => ({
  userAgent: typeof meta.userAgent === 'string' ? meta.userAgent.slice(0, 255) : null,
  ipHash: typeof meta.ip === 'string' && meta.ip.length > 0
    ? createHmac('sha256', getAuthSecret('AUTH_TOKEN_PEPPER')).update(meta.ip).digest('hex')
    : null
});

export const createSessionMaterial = ({ now, familyId = randomUUID(), meta }) => {
  const refreshToken = createOpaqueToken(48);

  return {
    refreshToken,
    stored: {
      refreshTokenHash: hashOpaqueToken(refreshToken),
      familyId,
      expiresAt: new Date(now.getTime() + days(REFRESH_TOKEN_TTL_DAYS)),
      ...normalizeSessionMeta(meta),
      createdAt: now,
      lastUsedAt: now
    }
  };
};

export const createTokenResponse = async ({ user, session, refreshToken, now }) => ({
  accessToken: await signAccessToken({ userId: user.id, sessionId: session.id }),
  refreshToken,
  expiresAt: new Date(now.getTime() + ACCESS_TOKEN_TTL_SECONDS * 1000)
});
