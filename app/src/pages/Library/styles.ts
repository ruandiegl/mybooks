import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
export const styles = StyleSheet.create({
  list: { paddingBottom: theme.spacing.xxl, gap: theme.spacing.md },
  row: { gap: theme.spacing.md },
  item: { width: '47.7%' },
  add: { width: 48, height: 48, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  addPressed: { backgroundColor: theme.colors.primaryPressed },
  controls: { gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
  footer: { paddingVertical: theme.spacing.lg }
});
