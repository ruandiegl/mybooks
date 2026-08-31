import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl, gap: theme.spacing.md },
  intro: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 13, lineHeight: 20 },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  half: { flex: 1 },
  danger: { marginTop: theme.spacing.md }
});
