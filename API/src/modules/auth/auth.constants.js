import { env } from '../../config/env.js';

export const BCRYPT_ROUNDS = env.BCRYPT_ROUNDS;
export const ACCESS_TOKEN_ALGORITHM = 'HS256';
export const ACCESS_TOKEN_TTL_SECONDS = env.AUTH_ACCESS_TOKEN_TTL_SECONDS;
export const ACCESS_TOKEN_ISSUER = env.AUTH_JWT_ISSUER;
export const ACCESS_TOKEN_AUDIENCE = env.AUTH_JWT_AUDIENCE;
export const PENDING_REGISTRATION_TTL_MS = env.AUTH_PENDING_REGISTRATION_TTL_HOURS * 60 * 60 * 1000;

export const getAuthSecret = (name) => {
  const value = env[name];

  if (!value) throw new Error(`${name} é obrigatório para autenticação própria.`);
  return value;
};
