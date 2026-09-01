import 'dotenv/config';
import { z } from 'zod';

const emptyToUndefined = (value) => value === '' ? undefined : value;
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const hasClerkCredentials = Boolean(process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1).default('postgresql://mybooks:mybooks@localhost:5432/mybooks?schema=public'),
  CLIENT_ORIGINS: z.string().default('http://localhost:8081,http://localhost:19006'),
  AUTH_MODE: z.enum(['clerk', 'development']).default(hasClerkCredentials ? 'clerk' : 'development'),
  CLERK_PUBLISHABLE_KEY: optionalString,
  CLERK_SECRET_KEY: optionalString,
  CLERK_JWT_KEY: optionalString,
  CLERK_AUTHORIZED_PARTIES: optionalString,
  ISBN_API_BASE_URL: z.string().url().default('https://brasilapi.com.br/api'),
  ISBN_API_TIMEOUT_MS: z.coerce.number().int().positive().default(6000),
  STORAGE_MODE: z.enum(['r2', 'development']).default('development'),
  R2_ACCOUNT_ID: optionalString,
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,
  R2_BUCKET: optionalString,
  R2_PUBLIC_URL: optionalUrl,
  R2_PRESIGN_EXPIRES_IN: z.coerce.number().int().min(30).max(3600).default(300),
  RESEND_API_KEY: optionalString,
  RESEND_FROM_EMAIL: z.string().default('MyBooks <onboarding@resend.dev>'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120)
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => issue.path.join('.') + ': ' + issue.message).join(', ');
  throw new Error('Configuração de ambiente inválida: ' + details);
}

if (parsed.data.NODE_ENV === 'production' && parsed.data.AUTH_MODE !== 'clerk') {
  throw new Error('AUTH_MODE=clerk é obrigatório em produção.');
}

if (parsed.data.AUTH_MODE === 'clerk' && (!parsed.data.CLERK_SECRET_KEY || !parsed.data.CLERK_PUBLISHABLE_KEY)) {
  throw new Error('CLERK_SECRET_KEY e CLERK_PUBLISHABLE_KEY são obrigatórias quando AUTH_MODE=clerk.');
}

if (
  parsed.data.STORAGE_MODE === 'r2'
  && (
    !parsed.data.R2_ACCOUNT_ID
    || !parsed.data.R2_ACCESS_KEY_ID
    || !parsed.data.R2_SECRET_ACCESS_KEY
    || !parsed.data.R2_BUCKET
    || !parsed.data.R2_PUBLIC_URL
  )
) {
  throw new Error('As credenciais, o bucket e R2_PUBLIC_URL são obrigatórios quando STORAGE_MODE=r2.');
}

export const env = {
  ...parsed.data,
  CLIENT_ORIGINS: parsed.data.CLIENT_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean),
  CLERK_AUTHORIZED_PARTIES: parsed.data.CLERK_AUTHORIZED_PARTIES
    ? parsed.data.CLERK_AUTHORIZED_PARTIES.split(',').map((item) => item.trim()).filter(Boolean)
    : []
};
