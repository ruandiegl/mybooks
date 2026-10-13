import { StyleSheet } from 'react-native';
import type { AppTheme } from '../../styles/theme';
export const createStyles = (theme: AppTheme) => StyleSheet.create({
  row: { minHeight: 74, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  eyebrow: { color: theme.colors.primary, fontFamily: theme.typography.bold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: theme.colors.foreground, fontFamily: theme.typography.extraBold, fontSize: 27, letterSpacing: -0.7 },
  copy: { flex: 1 }
});
