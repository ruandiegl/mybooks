import { expect, it } from 'vitest';
import { isAllowedWebWidth } from '../viewportPolicy';
it.each([[320, true], [768, true], [1024, true], [1024.5, false], [1025, false], [1440, false], [0, false], [NaN, false], [Infinity, false]])('applies the inclusive viewport policy to %s', (width, allowed) => {
  expect(isAllowedWebWidth(width as number)).toBe(allowed);
});
