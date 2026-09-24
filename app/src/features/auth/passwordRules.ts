export const PASSWORD_REQUIREMENTS = [
  'A senha deve ter no mínimo 6 caracteres.',
  'A senha deve conter letra maiúscula.',
  'A senha deve conter letra minúscula.',
  'A senha deve conter número.',
  'A senha deve conter caractere especial.'
] as const;

const utf8ByteLength = (value: string) => new TextEncoder().encode(value).byteLength;

export function passwordIssues(password: string): string[] {
  const issues: string[] = [];

  if (Array.from(password).length < 6) issues.push(PASSWORD_REQUIREMENTS[0]);
  if (utf8ByteLength(password) > 72) issues.push('A senha deve ter no máximo 72 bytes UTF-8.');
  if (!/\p{Lu}/u.test(password)) issues.push(PASSWORD_REQUIREMENTS[1]);
  if (!/\p{Ll}/u.test(password)) issues.push(PASSWORD_REQUIREMENTS[2]);
  if (!/\p{N}/u.test(password)) issues.push(PASSWORD_REQUIREMENTS[3]);
  if (!/[^\p{L}\p{N}\s]/u.test(password)) issues.push(PASSWORD_REQUIREMENTS[4]);

  return issues;
}

export function validatePasswordConfirmation(password: string, confirmation: string) {
  return password === confirmation ? undefined : 'As senhas não coincidem.';
}
