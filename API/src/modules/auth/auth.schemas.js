import { z } from 'zod';
import { validateCpf } from './auth.crypto.js';
import { normalizeEmail, normalizePhone, validatePassword } from './validators.js';

const passwordSchema = z.string().superRefine((value, context) => {
  const result = validatePassword(value);

  for (const issue of result.issues) context.addIssue({ code: 'custom', message: issue });
});
const loginPasswordSchema = z.string().min(1).superRefine((value, context) => {
  if (Buffer.byteLength(value, 'utf8') > 72) {
    context.addIssue({ code: 'custom', message: 'A senha deve ter no máximo 72 bytes.' });
  }
});

const trimmedString = (value) => typeof value === 'string' ? value.trim() : value;
const emailSchema = z.preprocess(
  (value) => typeof value === 'string' ? value.trim().toLowerCase() : value,
  z.string().max(254).email()
);
const codeSchema = z.string().trim().min(6).max(128);
const normalizedSchema = (normalizer, min, max, message) => z.preprocess(
  trimmedString,
  z.string().min(min).max(max).superRefine((value, context) => {
    try {
      normalizer(value);
    } catch {
      context.addIssue({ code: 'custom', message });
    }
  }).transform((value) => normalizer(value))
);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  cpf: normalizedSchema((value) => validateCpf(value).normalized, 11, 18, 'CPF inválido.'),
  phone: normalizedSchema(normalizePhone, 10, 24, 'Telefone brasileiro inválido.')
}).strict();

export const verifyEmailSchema = z.object({ email: emailSchema, code: codeSchema });
export const loginSchema = z.object({ email: emailSchema, password: loginPasswordSchema });
export const refreshSchema = z.object({ refreshToken: z.string().trim().min(32).max(512) });
export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ email: emailSchema, code: codeSchema, password: passwordSchema });
