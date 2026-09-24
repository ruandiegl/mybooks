import bcrypt from 'bcryptjs';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import {
  ACCESS_TOKEN_ALGORITHM,
  ACCESS_TOKEN_AUDIENCE,
  ACCESS_TOKEN_ISSUER,
  ACCESS_TOKEN_TTL_SECONDS,
  BCRYPT_ROUNDS,
  getAuthSecret
} from './auth.constants.js';
import { validatePassword } from './validators.js';

const encoder = new TextEncoder();

const getEncryptionKey = () => {
  const key = Buffer.from(getAuthSecret('AUTH_CPF_ENCRYPTION_KEY'), 'base64');

  if (key.length !== 32) throw new Error('AUTH_CPF_ENCRYPTION_KEY deve conter 32 bytes em base64.');
  return key;
};

const normalizeCpfDigits = (cpf) => String(cpf).replace(/\D/g, '');

const decodeCanonicalBase64url = (value, label) => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} não pode estar vazio.`);
  }

  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(`${label} deve usar base64url canônico.`);
  }

  const decoded = Buffer.from(value, 'base64url');
  if (decoded.length === 0 || decoded.toString('base64url') !== value) {
    throw new Error(`${label} deve usar base64url canônico.`);
  }

  return decoded;
};

const cpfCheckDigit = (digits, factor) => {
  const total = digits.split('').reduce((sum, digit, index) => sum + Number(digit) * (factor - index), 0);
  const remainder = (total * 10) % 11;

  return remainder === 10 ? 0 : remainder;
};

export const hashPassword = async (password) => {
  const result = validatePassword(password);

  if (!result.valid) throw new Error(result.issues.join(' '));
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

export const verifyPassword = async (password, hash) => {
  if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 72) return false;
  return bcrypt.compare(password, hash);
};

export const needsPasswordRehash = (hash) => {
  const match = /^\$2[aby]\$(\d{2})\$/.exec(hash);

  return !match || Number(match[1]) !== BCRYPT_ROUNDS;
};

export const createOpaqueToken = (byteLength = 48) => randomBytes(byteLength).toString('base64url');

export const hashOpaqueToken = (token) => createHash('sha256')
  .update(`${token}${getAuthSecret('AUTH_TOKEN_PEPPER')}`)
  .digest('hex');

export const signAccessToken = async ({ userId, sessionId }) => new SignJWT({ sid: String(sessionId) })
  .setProtectedHeader({ alg: ACCESS_TOKEN_ALGORITHM, typ: 'JWT' })
  .setIssuer(ACCESS_TOKEN_ISSUER)
  .setAudience(ACCESS_TOKEN_AUDIENCE)
  .setSubject(String(userId))
  .setJti(randomUUID())
  .setIssuedAt()
  .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
  .sign(encoder.encode(getAuthSecret('AUTH_JWT_SECRET')));

export const verifyAccessToken = async (token) => {
  const { payload } = await jwtVerify(token, encoder.encode(getAuthSecret('AUTH_JWT_SECRET')), {
    algorithms: [ACCESS_TOKEN_ALGORITHM],
    issuer: ACCESS_TOKEN_ISSUER,
    audience: ACCESS_TOKEN_AUDIENCE
  });

  if (
    typeof payload.sub !== 'string'
    || typeof payload.sid !== 'string'
    || typeof payload.jti !== 'string'
    || typeof payload.iat !== 'number'
    || !Number.isFinite(payload.iat)
    || typeof payload.exp !== 'number'
    || !Number.isFinite(payload.exp)
  ) {
    throw new Error('Token de acesso inválido.');
  }

  return { userId: payload.sub, sessionId: payload.sid, jti: payload.jti };
};

export const validateCpf = (cpf) => {
  if (typeof cpf !== 'string' || !/^[\d.\-\s]+$/.test(cpf)) {
    throw new Error('CPF inválido.');
  }

  const normalized = normalizeCpfDigits(cpf);

  if (!/^\d{11}$/.test(normalized) || /^(\d)\1{10}$/.test(normalized)) {
    throw new Error('CPF inválido.');
  }

  if (cpfCheckDigit(normalized.slice(0, 9), 10) !== Number(normalized[9])
    || cpfCheckDigit(normalized.slice(0, 10), 11) !== Number(normalized[10])) {
    throw new Error('CPF inválido.');
  }

  const hash = createHmac('sha256', getAuthSecret('AUTH_CPF_HMAC_KEY')).update(normalized).digest('hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    normalized,
    hash,
    encrypted: [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.')
  };
};

export const decryptCpf = (encrypted) => {
  const parts = String(encrypted).split('.');

  if (parts.length !== 3) throw new Error('CPF criptografado inválido.');

  const [ivPart, tagPart, payloadPart] = parts;
  const iv = decodeCanonicalBase64url(ivPart, 'IV');
  const tag = decodeCanonicalBase64url(tagPart, 'Tag de autenticação');
  const payload = decodeCanonicalBase64url(payloadPart, 'Payload criptografado');

  if (iv.length !== 12) throw new Error('IV deve ter 12 bytes.');
  if (tag.length !== 16) throw new Error('Tag de autenticação deve ter 16 bytes.');

  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf8');
};
