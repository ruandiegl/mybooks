import { describe, expect, it } from 'vitest';
import { buildClientOrigins } from '../src/config/clientOrigins.js';

describe('client origin configuration', () => {
  it('adds the PWA origin without replacing or duplicating existing origins', () => {
    expect(buildClientOrigins('https://app.example, http://localhost:8081', 'https://web.example'))
      .toEqual(['https://app.example', 'http://localhost:8081', 'https://web.example']);
  });

  it('keeps the existing allowlist when no PWA origin is configured', () => {
    expect(buildClientOrigins('https://app.example, http://localhost:8081', undefined))
      .toEqual(['https://app.example', 'http://localhost:8081']);
  });
});
