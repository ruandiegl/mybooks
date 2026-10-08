import { describe, expect, it } from 'vitest';
import * as tokens from '../../../styles/theme';

const contrast = (a: string, b: string) => {
  const luminance = (hex: string) => {
    const [r, g, blue] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
    return .2126 * r + .7152 * g + .0722 * blue;
  };
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
};
describe('theme readability', () => {
  it('provides a dark palette whose text, actions and photo viewer remain readable', () => {
    const dark = (tokens as unknown as { darkTheme?: typeof tokens.theme }).darkTheme;
    expect(dark, 'dark palette is available').toBeDefined();
    if (!dark) return;
    const c = dark.colors as unknown as Record<string, string>;
    for (const text of ['foreground', 'mutedForeground', 'primary', 'secondary', 'danger', 'success']) {
      expect(contrast(c[text], c.surface)).toBeGreaterThanOrEqual(4.5);
    }
    for (const [text, fill] of [['onPrimary', 'primary'], ['onSecondary', 'secondary'], ['onDanger', 'danger'], ['onSuccess', 'success'], ['viewerForeground', 'viewerBackground']]) {
      expect(contrast(c[text], c[fill])).toBeGreaterThanOrEqual(4.5);
    }
  });
});
