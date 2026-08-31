import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  list: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl, gap: theme.spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  copy: { flex: 1, gap: 2 },
  name: { color: theme.colors.foreground, fontFamily: theme.typography.bold, fontSize: 16 },
  meta: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 12 },
  action: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: theme.colors.primaryPressed }
});
