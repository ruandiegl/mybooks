import { describe, expect, it } from 'vitest';
import { passwordIssues, validatePasswordConfirmation } from '../passwordRules';

describe('passwordRules', () => {
  it.each([
    ['', 'A senha deve ter no mínimo 6 caracteres.'],
    ['abc1!', 'A senha deve conter letra maiúscula.'],
    ['ABC1!', 'A senha deve conter letra minúscula.'],
    ['Abcdef!', 'A senha deve conter número.'],
    ['Abcdef1', 'A senha deve conter caractere especial.']
  ])('reports a precise issue for %j', (password, issue) => {
    expect(passwordIssues(password)).toContain(issue);
  });

  it('accepts a strong password with the server minimum', () => {
    expect(passwordIssues('Abc1!x')).toEqual([]);
  });

  it('counts UTF-8 bytes and rejects values above bcrypt capacity', () => {
    expect(passwordIssues(`Ab1!${'á'.repeat(35)}`)).toContain('A senha deve ter no máximo 72 bytes UTF-8.');
  });

  it('validates confirmation without exposing the password', () => {
    expect(validatePasswordConfirmation('Abc1!x', 'different')).toBe('As senhas não coincidem.');
    expect(validatePasswordConfirmation('Abc1!x', 'Abc1!x')).toBeUndefined();
  });
});
