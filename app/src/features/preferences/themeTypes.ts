import type { AppTheme } from '../../styles/theme';
export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeMode = 'light' | 'dark';
export type ThemeContextValue = {
  preference: ThemePreference;
  mode: ThemeMode;
  theme: AppTheme;
  hydrated: boolean;
  persistenceError?: string;
  setPreference(value: ThemePreference): Promise<void>;
};
export const THEME_STORAGE_KEY = 'trocalivros.appearance.v1';
export function parseThemePreference(value: string | null): ThemePreference {
  try {
    const parsed = value ? JSON.parse(value) : null;
    return parsed?.version === 1 && ['light', 'dark', 'system'].includes(parsed.theme) ? parsed.theme : 'system';
  } catch { return 'system'; }
}
