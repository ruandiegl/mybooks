import { describe, expect, it } from 'vitest';
import { decodeJwt, SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { env } from '../src/config/env.js';
import {
  createOpaqueToken,
  decryptCpf,
  hashOpaqueToken,
  hashPassword,
  needsPasswordRehash,
  signAccessToken,
  validateCpf,
  verifyAccessToken,
  verifyPassword
} from '../src/modules/auth/auth.crypto.js';

const signingKey = new TextEncoder().encode(env.AUTH_JWT_SECRET);

const signTestAccessToken = async ({
  claims = {},
  algorithm = 'HS256',
  audience = 'trocalivros-client',
  issuer = 'trocalivros-api',
  includeIat = true,
  expiration = '15m'
} = {}) => {
  let builder = new SignJWT({ sid: 'session-456', ...claims })
    .setProtectedHeader({ alg: algorithm })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject('user-123')
    .setJti('test-token');

  if (includeIat) builder = builder.setIssuedAt();
  if (expiration) builder = builder.setExpirationTime(expiration);
  return builder.sign(signingKey);
};

describe('auth crypto primitives', () => {
  it('hashes and verifies a valid password without storing it in plaintext', async () => {
    const password = 'Senha@123';
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword('Senha@124', hash)).resolves.toBe(false);
  });

  it('rejects long passwords before bcrypt can compare their truncated bytes', async () => {
    const first72Bytes = `${'A'.repeat(69)}a1!`;
    const legacyHash = await bcrypt.hash(first72Bytes, 10);

    expect(Buffer.byteLength(first72Bytes, 'utf8')).toBe(72);
    await expect(verifyPassword(`${first72Bytes}extra`, legacyHash)).resolves.toBe(false);
  });

  it('rejects a password whose UTF-8 value would be truncated by bcrypt', async () => {
    await expect(hashPassword(`${'😀'.repeat(18)}Senha@1`)).rejects.toThrow(/72/i);
  });

  it('accepts a Unicode password at bcrypt\'s exact 72-byte limit', async () => {
    const password = `${'😀'.repeat(17)}Aa1!`;

    expect(Buffer.byteLength(password, 'utf8')).toBe(72);
    await expect(hashPassword(password)).resolves.toMatch(/^\$2[aby]\$/);
  });

  it('identifies a bcrypt hash made with an outdated work factor', async () => {
    const hash = await hashPassword('Senha@123');
    const outdatedHash = await bcrypt.hash('Senha@123', 10);

    expect(needsPasswordRehash(hash)).toBe(false);
    expect(needsPasswordRehash(outdatedHash)).toBe(true);
  });

  it('creates opaque tokens with a deterministic peppered digest', () => {
    const token = createOpaqueToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(createOpaqueToken()).not.toBe(token);
    expect(hashOpaqueToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashOpaqueToken(token)).toBe(hashOpaqueToken(token));
    expect(hashOpaqueToken(token)).not.toBe(createHash('sha256').update(token).digest('hex'));
  });

  it('signs and verifies access tokens with the required session claims', async () => {
    const token = await signAccessToken({
      userId: 'user-123',
      sessionId: 'session-456'
    });
    const payload = await verifyAccessToken(token);
    const rawClaims = decodeJwt(token);

    expect(payload).toMatchObject({ userId: 'user-123', sessionId: 'session-456' });
    expect(payload.jti).toMatch(/^[0-9a-f-]{36}$/i);
    expect(rawClaims).toMatchObject({
      iss: 'trocalivros-api',
      aud: 'trocalivros-client',
      sub: 'user-123',
      sid: 'session-456'
    });
    expect(rawClaims.iat).toEqual(expect.any(Number));
    expect(rawClaims.exp).toEqual(expect.any(Number));
  });

  it('rejects a modified access token', async () => {
    const token = await signAccessToken({ userId: 'user-123', sessionId: 'session-456' });
    const [header, payload, signature] = token.split('.');
    const alteredPayload = `${payload.startsWith('a') ? 'b' : 'a'}${payload.slice(1)}`;

    await expect(verifyAccessToken(`${header}.${alteredPayload}.${signature}`)).rejects.toThrow();
  });

  it('rejects expired tokens and tokens from another issuer', async () => {
    const expired = await signTestAccessToken({ expiration: '0s' });
    const wrongIssuer = await signTestAccessToken({ issuer: 'other-api' });

    await expect(verifyAccessToken(expired)).rejects.toThrow();
    await expect(verifyAccessToken(wrongIssuer)).rejects.toThrow();
  });

  it('rejects tokens without numeric iat and exp claims', async () => {
    const withoutIat = await signTestAccessToken({ includeIat: false });
    const withoutExp = await signTestAccessToken({ expiration: null });
    const stringIat = await signTestAccessToken({ claims: { iat: 'not-a-timestamp' }, includeIat: false });
    const stringExp = await signTestAccessToken({ claims: { exp: 'not-a-timestamp' }, expiration: null });

    await expect(verifyAccessToken(withoutIat)).rejects.toThrow();
    await expect(verifyAccessToken(withoutExp)).rejects.toThrow();
    await expect(verifyAccessToken(stringIat)).rejects.toThrow();
    await expect(verifyAccessToken(stringExp)).rejects.toThrow();
  });

  it('rejects tokens with another audience or algorithm', async () => {
    const wrongAudience = await signTestAccessToken({ audience: 'other-client' });
    const wrongAlgorithm = await signTestAccessToken({ algorithm: 'HS384' });

    await expect(verifyAccessToken(wrongAudience)).rejects.toThrow();
    await expect(verifyAccessToken(wrongAlgorithm)).rejects.toThrow();
  });

  it('validates, hashes, encrypts, and decrypts a CPF without returning a key', () => {
    const cpf = validateCpf('529.982.247-25');

    expect(cpf.normalized).toBe('52998224725');
    expect(cpf.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(cpf).not.toHaveProperty('key');
    expect(decryptCpf(cpf.encrypted)).toBe('52998224725');
    expect(validateCpf('52998224725').encrypted).not.toBe(cpf.encrypted);
  });

  it('rejects a CPF ciphertext modified in a meaningful byte', () => {
    const cpf = validateCpf('529.982.247-25');
    const [iv, tag, payload] = cpf.encrypted.split('.');
    const alteredPayload = `${payload.startsWith('a') ? 'b' : 'a'}${payload.slice(1)}`;

    expect(() => decryptCpf(`${iv}.${tag}.${alteredPayload}`)).toThrow();
  });

  it('rejects a CPF ciphertext with a truncated authentication tag before decryption', () => {
    const [, tag, payload] = validateCpf('529.982.247-25').encrypted.split('.');
    const truncatedTag = Buffer.from(tag, 'base64url').subarray(0, 4).toString('base64url');

    expect(() => decryptCpf(`AAAAAAAAAAAAAAAA.${truncatedTag}.${payload}`))
      .toThrow(/tag de autenticação deve ter 16 bytes/i);
  });

  it('rejects a CPF ciphertext with a truncated IV before decryption', () => {
    const [iv, tag, payload] = validateCpf('529.982.247-25').encrypted.split('.');
    const truncatedIv = Buffer.from(iv, 'base64url').subarray(0, 8).toString('base64url');

    expect(() => decryptCpf(`${truncatedIv}.${tag}.${payload}`)).toThrow(/IV deve ter 12 bytes/i);
  });

  it('rejects empty or non-canonical base64url CPF ciphertext segments', () => {
    const [iv, tag, payload] = validateCpf('529.982.247-25').encrypted.split('.');

    expect(() => decryptCpf(`${iv}.${tag}.`)).toThrow(/payload criptografado/i);
    expect(() => decryptCpf(`${iv}.${tag}=.${payload}`)).toThrow(/base64url canônico/i);
  });
});
