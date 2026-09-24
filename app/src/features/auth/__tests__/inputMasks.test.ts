import { describe, expect, it } from 'vitest';
import { maskBrazilianPhone, maskCpf } from '../inputMasks';

describe('inputMasks', () => {
  it('formats CPF while ignoring non-digits and limiting it to 11 digits', () => {
    expect(maskCpf('52998224725')).toBe('529.982.247-25');
    expect(maskCpf('529.982.247-25abc')).toBe('529.982.247-25');
    expect(maskCpf('123')).toBe('123');
  });

  it('formats Brazilian phone numbers with ten or eleven digits', () => {
    expect(maskBrazilianPhone('11912345678')).toBe('(11) 91234-5678');
    expect(maskBrazilianPhone('(11) 3456-7890')).toBe('(11) 3456-7890');
    expect(maskBrazilianPhone('+55 (11) 91234-5678')).toBe('(11) 91234-5678');
  });
});
