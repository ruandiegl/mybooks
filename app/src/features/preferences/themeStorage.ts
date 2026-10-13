import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseThemePreference, THEME_STORAGE_KEY, type ThemePreference } from './themeTypes';
let writes: Promise<void> = Promise.resolve();
export async function loadThemePreference(): Promise<{ preference: ThemePreference; warning?: string }> {
  try { return { preference: parseThemePreference(await AsyncStorage.getItem(THEME_STORAGE_KEY)) }; }
  catch { return { preference: 'system', warning: 'Não foi possível ler a aparência salva.' }; }
}
export function saveThemePreference(value: ThemePreference): Promise<void> {
  const next = writes.catch(() => {}).then(() => AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ version: 1, theme: value })));
  writes = next;
  return next;
}
