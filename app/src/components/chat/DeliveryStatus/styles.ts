import { StyleSheet } from 'react-native';
import { theme } from '../../../styles/theme';

export const styles = StyleSheet.create({
  status: { alignSelf: 'flex-end', minHeight: 20, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs, paddingHorizontal: theme.spacing.xs },
  label: { color: theme.colors.mutedForeground, fontFamily: theme.typography.medium, fontSize: 10 },
  retry: { alignSelf: 'flex-end', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs, paddingHorizontal: theme.spacing.xs },
  failed: { color: theme.colors.danger, fontFamily: theme.typography.semibold, fontSize: 11 },
  pressed: { opacity: 0.72 }
});
