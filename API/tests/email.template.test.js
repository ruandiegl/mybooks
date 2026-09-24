import { describe, expect, it } from 'vitest';
import { welcomeEmailV1 } from '../src/modules/email/templates/welcome.v1.js';
import { verifyEmailV1 } from '../src/modules/email/templates/verify-email.v1.js';
import { passwordResetV1 } from '../src/modules/email/templates/password-reset.v1.js';

describe('welcomeEmailV1', () => {
  it('escapa conteúdo informado pelo usuário', () => {
    const html = welcomeEmailV1.html({ name: '<img src=x onerror="alert(1)"> O\'Neil & Cia' });

    expect(html).not.toContain('<img');
    expect(html).not.toContain('onerror="');
    expect(html).toContain('&lt;img');
    expect(html).toContain('O&#039;Neil &amp; Cia');
  });
});

describe.each([
  ['verifyEmailV1', verifyEmailV1],
  ['passwordResetV1', passwordResetV1]
])('%s', (_name, template) => {
  it('escapa o código, informa o TTL e não inclui links', () => {
    const html = template.html({ code: '<123&456>', ttlMinutes: 15 });

    expect(html).toContain('&lt;123&amp;456&gt;');
    expect(html).toContain('15 minutos');
    expect(html).not.toMatch(/<a\b|href=/i);
    expect(html).not.toContain('<123&456>');
  });
});
