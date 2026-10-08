import { useMemo } from 'react';
import { useAppTheme } from '../providers/ThemeProvider';
import type { AppTheme } from './theme';
export function useThemedStyles<T>(factory: (theme: AppTheme) => T): T {
  const { theme } = useAppTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
