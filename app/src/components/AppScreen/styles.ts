import { StyleSheet } from 'react-native';
import type { AppTheme } from '../../styles/theme';
export const createStyles = (theme: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, paddingHorizontal: theme.spacing.md }
});
