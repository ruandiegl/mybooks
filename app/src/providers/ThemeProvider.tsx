import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import { loadThemePreference, saveThemePreference } from '../features/preferences/themeStorage';
import type { ThemeContextValue, ThemePreference } from '../features/preferences/themeTypes';
import { darkTheme, lightTheme } from '../styles/theme';

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system', mode: 'light', theme: lightTheme, hydrated: true,
  setPreference: async () => {}
});
export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [preference, setValue] = useState<ThemePreference>('system');
  const [hydrated, setHydrated] = useState(false);
  const [persistenceError, setError] = useState<string>();
  const generation = useRef(0);
  const mode = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  useEffect(() => {
    let active = true;
    const ticket = generation.current;
    void loadThemePreference().then(result => {
      if (!active) return;
      if (generation.current === ticket) { setValue(result.preference); setError(result.warning); }
      setHydrated(true);
    });
    return () => { active = false; };
  }, []);
  const setPreference = useCallback(async (value: ThemePreference) => {
    const ticket = ++generation.current;
    setValue(value); setError(undefined);
    try { await saveThemePreference(value); }
    catch { if (generation.current === ticket) setError('Não foi possível salvar a aparência. Selecione novamente para tentar.'); }
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'web') {
      Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
      return;
    }
    if (typeof document === 'undefined') return;
    const color = mode === 'dark' ? darkTheme.colors.background : lightTheme.colors.background;
    document.documentElement.style.colorScheme = mode;
    document.documentElement.style.backgroundColor = color;
    document.body.style.backgroundColor = color;
    document.querySelectorAll('meta[name="theme-color"]').forEach(tag => tag.setAttribute('content', color));
  }, [preference, mode]);
  const value = useMemo(() => ({ preference, mode, theme: mode === 'dark' ? darkTheme : lightTheme, hydrated, persistenceError, setPreference }), [preference, mode, hydrated, persistenceError, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useAppTheme() { return useContext(ThemeContext); }
