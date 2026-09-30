import 'dotenv/config';
import { z } from 'zod';

const emptyToUndefined = (value) => value === '' ? undefined : value;
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const localAuthDefaults = {
  AUTH_JWT_SECRET: 'test-auth-jwt-secret-with-at-least-32-characters',
  AUTH_TOKEN_PEPPER: 'test-auth-token-pepper-with-at-least-32-characters',
  AUTH_CPF_HMAC_KEY: 'test-auth-cpf-hmac-key-with-at-least-32-chars',
  AUTH_CPF_ENCRYPTION_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY='
};

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1).default('postgresql://mybooks:mybooks@localhost:5432/mybooks?schema=public'),
  PUBLIC_API_BASE_URL: z.string().url().default('http://localhost:3001'),
  CLIENT_ORIGINS: z.string().default('http://localhost:8081,http://localhost:19006'),
  AUTH_MODE: z.literal('native', { error: 'AUTH_MODE=native é obrigatório.' }).default('native'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  AUTH_JWT_ISSUER: z.string().min(1).default('trocalivros-api'),
  AUTH_JWT_AUDIENCE: z.string().min(1).default('trocalivros-client'),
  AUTH_JWT_SECRET: optionalString,
  AUTH_TOKEN_PEPPER: optionalString,
  AUTH_CPF_HMAC_KEY: optionalString,
  AUTH_CPF_ENCRYPTION_KEY: optionalString,
  ISBN_API_BASE_URL: z.string().url().default('https://brasilapi.com.br/api'),
  ISBN_API_TIMEOUT_MS: z.coerce.number().int().positive().default(6000),
  ISBN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  ISBN_LOOKUP_LIMIT: z.coerce.number().int().positive().default(30),
  STORAGE_MODE: z.enum(['r2', 'development']).default('development'),
  R2_ACCOUNT_ID: optionalString,
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,
  R2_BUCKET: optionalString,
  R2_PUBLIC_URL: optionalUrl,
  R2_PRESIGN_EXPIRES_IN: z.coerce.number().int().min(30).max(3600).default(300),
  RESEND_API_KEY: optionalString,
  RESEND_FROM_EMAIL: z.string().default('TrocaLivros <onboarding@resend.dev>'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  AUTH_REFRESH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60 * 1000),
  AUTH_REGISTER_LIMIT: z.coerce.number().int().positive().default(5),
  AUTH_LOGIN_LIMIT: z.coerce.number().int().positive().default(10),
  AUTH_VERIFY_LIMIT: z.coerce.number().int().positive().default(10),
  AUTH_RESEND_LIMIT: z.coerce.number().int().positive().default(3),
  AUTH_FORGOT_PASSWORD_LIMIT: z.coerce.number().int().positive().default(3),
  AUTH_RESET_PASSWORD_LIMIT: z.coerce.number().int().positive().default(5),
  AUTH_REFRESH_LIMIT: z.coerce.number().int().positive().default(30),
  AUTH_PENDING_REGISTRATION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(24)
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => issue.path.join('.') + ': ' + issue.message).join(', ');
  throw new Error('Configuração de ambiente inválida: ' + details);
}

const authSecrets = Object.fromEntries(Object.entries(localAuthDefaults).map(([name, value]) => [
  name,
  parsed.data[name] ?? (parsed.data.NODE_ENV !== 'production' ? value : undefined)
]));

const base64Secret = (value) => {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return null;

  const decoded = Buffer.from(value, 'base64');
  return decoded.toString('base64') === value ? decoded : null;
};

const entropy = (value) => {
  const counts = new Map();
  for (const byte of value) counts.set(byte, (counts.get(byte) ?? 0) + 1);

  return [...counts.values()].reduce((total, count) => {
    const probability = count / value.length;
    return total - probability * Math.log2(probability);
  }, 0);
};

const isKnownPlaceholder = (value) => /replace|placeholder|example|change-me|your[-_ ]?(secret|key)|test-auth/i.test(value);

if (parsed.data.NODE_ENV === 'production') {
  for (const [name, value] of Object.entries(authSecrets)) {
    if (!value || value === localAuthDefaults[name] || isKnownPlaceholder(value)) {
      throw new Error(`${name} não pode usar defaults de teste ou placeholders em produção.`);
    }

    const decoded = base64Secret(value);
    if (!decoded || decoded.length !== 32 || entropy(decoded) < 3.5) {
      throw new Error(`${name} deve ser um segredo aleatório base64 de 32 bytes em produção.`);
    }
  }
}

if (
  parsed.data.STORAGE_MODE === 'r2'
  && (
    !parsed.data.R2_ACCOUNT_ID
    || !parsed.data.R2_ACCESS_KEY_ID
    || !parsed.data.R2_SECRET_ACCESS_KEY
    || !parsed.data.R2_BUCKET
  )
) {
  throw new Error('As credenciais e o bucket são obrigatórios quando STORAGE_MODE=r2.');
}

export const env = {
  ...parsed.data,
  ...authSecrets,
  CLIENT_ORIGINS: parsed.data.CLIENT_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean)
};
