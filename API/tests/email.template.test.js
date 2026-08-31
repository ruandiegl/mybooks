import { describe, expect, it } from 'vitest';
import { welcomeEmailV1 } from '../src/modules/email/templates/welcome.v1.js';

describe('welcomeEmailV1', () => {
  it('escapa conteúdo informado pelo usuário', () => {
    const html = welcomeEmailV1.html({ name: '<img src=x onerror="alert(1)"> O\'Neil & Cia' });

    expect(html).not.toContain('<img');
    expect(html).not.toContain('onerror="');
    expect(html).toContain('&lt;img');
    expect(html).toContain('O&#039;Neil &amp; Cia');
  });
});
