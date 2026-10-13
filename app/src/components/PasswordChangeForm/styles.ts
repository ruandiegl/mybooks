import { StyleSheet } from 'react-native';
import type { AppTheme } from '../../styles/theme';
export const createStyles = (theme: AppTheme) => StyleSheet.create({
  body: { gap: theme.spacing.md }, field: { gap: theme.spacing.xxs },
  copy: { fontFamily: theme.typography.regular, color: theme.colors.mutedForeground, fontSize: 14, lineHeight: 21 },
  error: { color: theme.colors.danger },
  toggle: { minHeight: 48, alignSelf: 'flex-start', paddingHorizontal: theme.spacing.xs, justifyContent: 'center', borderWidth: 2, borderColor: 'transparent', borderRadius: theme.radius.sm },
  toggleLabel: { fontFamily: theme.typography.medium, color: theme.colors.primary, fontSize: 14 },
  focused: { borderColor: theme.colors.primary }, pressed: { backgroundColor: theme.colors.surfaceMuted }
});
