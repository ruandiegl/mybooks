// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { loadThemePreference, saveThemePreference } from '../themeStorage.web';
import { THEME_STORAGE_KEY, parseThemePreference } from '../themeTypes';
afterEach(() => localStorage.clear());
describe('public appearance storage', () => {
  it.each([null, '{}', 'invalid', '{"version":2,"theme":"dark"}', '{"version":1,"theme":"invalid"}'])('uses system for invalid data %s', value => {
    expect(parseThemePreference(value)).toBe('system');
  });
  it('persists only appearance, ordered and independent from session data', async () => {
    await Promise.all([saveThemePreference('dark'), saveThemePreference('light')]);
    expect(await loadThemePreference()).toEqual({ preference: 'light' });
    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('{"version":1,"theme":"light"}');
  });
});
