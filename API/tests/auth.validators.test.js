import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema
} from '../src/modules/auth/auth.schemas.js';
import {
  normalizeEmail,
  normalizePhone,
  validatePassword
} from '../src/modules/auth/validators.js';
import { validateCpf } from '../src/modules/auth/auth.crypto.js';
import { env } from '../src/config/env.js';

const productionSecrets = () => ({
  AUTH_JWT_SECRET: randomBytes(32).toString('base64'),
  AUTH_TOKEN_PEPPER: randomBytes(32).toString('base64'),
  AUTH_CPF_HMAC_KEY: randomBytes(32).toString('base64'),
  AUTH_CPF_ENCRYPTION_KEY: randomBytes(32).toString('base64')
});

const loadProductionEnv = (overrides = {}) => spawnSync(
  process.execPath,
  ['--input-type=module', '--eval', 'import \'./src/config/env.js\''],
  {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'production', AUTH_MODE: 'native', ...productionSecrets(), ...overrides }
  }
);

describe('auth validators', () => {
  it('normalizes an email address and rejects invalid values', () => {
    expect(normalizeEmail('  LEITORA@EXAMPLE.COM  ')).toBe('leitora@example.com');
    expect(() => normalizeEmail('leitora@')).toThrow();
    expect(() => normalizeEmail(`${'a'.repeat(250)}@example.com`)).toThrow();
  });

  it('normalizes a Brazilian phone number to E.164 and rejects other formats', () => {
    expect(normalizePhone('(11) 91234-5678')).toBe('+5511912345678');
    expect(normalizePhone('+55 (11) 3333-4444')).toBe('+551133334444');
    expect(() => normalizePhone('+1 212 555 0100')).toThrow();
    expect(() => normalizePhone('11+91234-5678')).toThrow();
    expect(() => normalizePhone('119123456')).toThrow();
  });

  it('reports each missing password-policy requirement', () => {
    expect(validatePassword('abc').valid).toBe(false);
    expect(validatePassword('abcdef').issues).toHaveLength(3);
    expect(validatePassword('Senha@123').issues).toEqual([]);
    expect(validatePassword('😀'.repeat(19)).issues).toContainEqual(expect.stringMatching(/72/i));
    expect(validatePassword('😀Aa1!').issues).toContainEqual(expect.stringMatching(/6 caracteres/i));
    expect(validatePassword('Ábcd12').issues).toContainEqual(expect.stringMatching(/especial/i));
    expect(validatePassword('Ábcd12!').valid).toBe(true);
  });

  it('rejects malformed, repeated, and check-digit-invalid CPFs', () => {
    expect(() => validateCpf('111.111.111-11')).toThrow();
    expect(() => validateCpf('529.982.247-26')).toThrow();
    expect(() => validateCpf('529.982.247')).toThrow();
    expect(() => validateCpf('CPF 529.982.247-25')).toThrow();
  });

  it('normalizes register fields through its Zod schema', () => {
    expect(registerSchema.parse({
      email: ' LEITORA@EXAMPLE.COM ',
      password: 'Senha@123',
      cpf: '529.982.247-25',
      phone: '(11) 91234-5678'
    })).toMatchObject({
      email: 'leitora@example.com',
      cpf: '52998224725',
      phone: '+5511912345678'
    });

    expect(registerSchema.safeParse({
      name: 'Leitora Teste',
      email: 'leitora@example.com',
      password: 'Senha@123',
      cpf: '529.982.247-25',
      phone: '(11) 91234-5678'
    }).success).toBe(false);
  });

  it('exports bounded schemas for all authentication requests', () => {
    expect(verifyEmailSchema.safeParse({ email: 'leitor@example.com', code: '123456' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'leitor@example.com', password: 'Senha@123' }).success).toBe(true);
    expect(refreshSchema.safeParse({ refreshToken: 'x'.repeat(32) }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: 'leitor@example.com' }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ email: 'leitor@example.com', code: '123456', password: 'Senha@123' }).success).toBe(true);
    expect(refreshSchema.safeParse({ refreshToken: 'x'.repeat(513) }).success).toBe(false);
  });

  it('lets login compare any non-empty password up to 72 UTF-8 bytes without applying signup complexity', () => {
    expect(loginSchema.safeParse({ email: 'leitor@example.com', password: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'leitor@example.com', password: '' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'leitor@example.com', password: `${'😀'.repeat(17)}abcd` }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'leitor@example.com', password: `${'😀'.repeat(18)}a` }).success).toBe(false);
  });

  it('returns validation failures instead of throwing from malformed schema transforms', () => {
    const invalidEmail = {
      email: 'leitora@',
      password: 'Senha@123',
      cpf: '529.982.247-25',
      phone: '(11) 91234-5678'
    };
    const invalidCpf = {
      email: 'leitora@example.com',
      password: 'Senha@123',
      cpf: 'x'.repeat(19),
      phone: '(11) 91234-5678'
    };
    const invalidPhone = {
      email: 'leitora@example.com',
      password: 'Senha@123',
      cpf: '529.982.247-25',
      phone: '11+91234-5678'
    };

    for (const payload of [invalidEmail, invalidCpf, invalidPhone]) {
      expect(() => registerSchema.safeParse(payload)).not.toThrow();
      expect(registerSchema.safeParse(payload).success).toBe(false);
    }

    expect(verifyEmailSchema.safeParse({ email: 'leitora@', code: '123456' }).success).toBe(false);
  });

  it('allows only native auth in production with strong non-placeholder secrets', () => {
    expect(loadProductionEnv().status).toBe(0);

    const clerkMode = loadProductionEnv({ AUTH_MODE: 'clerk' });
    expect(clerkMode.status).not.toBe(0);
    expect(clerkMode.stderr).toMatch(/AUTH_MODE=native/i);
  });

  it('rejects every test default and known placeholder secret in production', () => {
    const defaults = {
      AUTH_JWT_SECRET: env.AUTH_JWT_SECRET,
      AUTH_TOKEN_PEPPER: env.AUTH_TOKEN_PEPPER,
      AUTH_CPF_HMAC_KEY: env.AUTH_CPF_HMAC_KEY,
      AUTH_CPF_ENCRYPTION_KEY: env.AUTH_CPF_ENCRYPTION_KEY
    };

    for (const [name, value] of Object.entries(defaults)) {
      expect(loadProductionEnv({ [name]: value }).status).not.toBe(0);
    }

    expect(loadProductionEnv({ AUTH_JWT_SECRET: 'replace-with-base64-random-key' }).status).not.toBe(0);
    expect(loadProductionEnv({ AUTH_TOKEN_PEPPER: 'A'.repeat(44) }).status).not.toBe(0);
    expect(loadProductionEnv({ AUTH_CPF_HMAC_KEY: 'not-a-base64-secret' }).status).not.toBe(0);
    expect(loadProductionEnv({ AUTH_CPF_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64') }).status).not.toBe(0);
  });
});
