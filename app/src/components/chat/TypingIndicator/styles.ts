import { StyleSheet } from 'react-native';
import type { AppTheme } from '../../../styles/theme';

export const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs, minHeight: 28, paddingHorizontal: theme.spacing.sm },
  label: { color: theme.colors.mutedForeground, fontFamily: theme.typography.medium, fontSize: 11 }
});
