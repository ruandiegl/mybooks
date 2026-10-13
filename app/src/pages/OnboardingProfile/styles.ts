import { StyleSheet } from 'react-native';
import type { AppTheme } from '../../styles/theme';

export const createStyles = (theme: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { flexGrow: 1, padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl, gap: theme.spacing.md },
  title: { color: theme.colors.foreground, fontFamily: theme.typography.extraBold, fontSize: 30, lineHeight: 36 },
  description: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 14, lineHeight: 22 },
  card: { gap: theme.spacing.md }
});
