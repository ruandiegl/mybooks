import { expect, it } from 'vitest';
import { getPublicHandoffUrl } from '../handoffUrl';
it('shares only the public origin root, never a private route, query, fragment or credentials', () => {
  expect(getPublicHandoffUrl('https://example.test/auth?token=private#secret')).toBe('https://example.test/');
  expect(getPublicHandoffUrl('https://name:password@example.test/book/123')).toBe('https://example.test/');
});
it.each(['javascript:alert(1)', 'data:text/plain,secret', 'invalid'])('rejects a non-web URL %s', value => {
  expect(() => getPublicHandoffUrl(value)).toThrow();
});
