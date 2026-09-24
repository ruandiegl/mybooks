import { z } from 'zod';

const emailSchema = z.string().max(254).email();

export const normalizeEmail = (email) => emailSchema.parse(String(email).trim().toLowerCase());

export const normalizePhone = (phone) => {
  const source = String(phone).trim();

  if (!/^\+?[()\s.-]*\d[\d()\s.-]*$/.test(source)) {
    throw new Error('Telefone brasileiro inválido.');
  }

  const digits = source.replace(/\D/g, '');

  if (source.startsWith('+') && !digits.startsWith('55')) {
    throw new Error('Telefone brasileiro inválido.');
  }

  const national = digits.startsWith('55') ? digits.slice(2) : digits;

  if (!/^[1-9]\d(?:\d{8}|\d{9})$/.test(national)) {
    throw new Error('Telefone brasileiro inválido.');
  }

  return `+55${national}`;
};

export const validatePassword = (password) => {
  const value = typeof password === 'string' ? password : '';
  const issues = [];

  if (Array.from(value).length < 6) issues.push('A senha deve ter no mínimo 6 caracteres.');
  if (Buffer.byteLength(value, 'utf8') > 72) issues.push('A senha deve ter no máximo 72 bytes UTF-8.');
  if (!/\p{Lu}/u.test(value)) issues.push('A senha deve conter letra maiúscula.');
  if (!/\p{Ll}/u.test(value)) issues.push('A senha deve conter letra minúscula.');
  if (!/\p{N}/u.test(value)) issues.push('A senha deve conter número.');
  if (!/[^\p{L}\p{N}\s]/u.test(value)) issues.push('A senha deve conter caractere especial.');

  return { valid: issues.length === 0, issues };
};
