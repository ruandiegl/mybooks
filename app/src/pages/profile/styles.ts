import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
export const styles = StyleSheet.create({
  scroll: { paddingBottom: theme.spacing.xxl, gap: theme.spacing.md },
  identity: { alignItems: 'center', gap: theme.spacing.xs, paddingVertical: theme.spacing.lg },
  name: { color: theme.colors.foreground, fontFamily: theme.typography.extraBold, fontSize: 23 },
  email: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 13 },
  card: { gap: theme.spacing.md },
  section: { color: theme.colors.foreground, fontFamily: theme.typography.bold, fontSize: 17 }
});
