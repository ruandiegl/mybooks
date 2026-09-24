import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  list: { gap: theme.spacing.xxs },
  item: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  label: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 11, flex: 1 },
  complete: { color: theme.colors.success }
});
