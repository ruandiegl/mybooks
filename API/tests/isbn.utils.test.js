import { describe, expect, it } from 'vitest';
import { isValidIsbn, normalizeIsbn } from '../src/modules/isbn/isbn.utils.js';

describe('ISBN', () => {
  it('normaliza ISBN com hífens e espaços', () => {
    expect(normalizeIsbn('978-85-457-0287-0')).toBe('9788545702870');
  });

  it('aceita ISBN-13 com dígito verificador válido', () => {
    expect(isValidIsbn('9788545702870')).toBe(true);
  });

  it('aceita ISBN-10 com dígito verificador válido', () => {
    expect(isValidIsbn('0306406152')).toBe(true);
  });

  it('rejeita ISBN com dígito verificador inválido', () => {
    expect(isValidIsbn('9788545702871')).toBe(false);
  });
});
