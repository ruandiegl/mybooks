import { StyleSheet } from 'react-native';
import type { AppTheme } from '../../styles/theme';

export const createStyles = (theme: AppTheme) => StyleSheet.create({
  list: { gap: theme.spacing.xxs },
  item: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  label: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 11, flex: 1 },
  complete: { color: theme.colors.success }
});
