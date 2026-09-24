import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { flexGrow: 1, padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl, gap: theme.spacing.md },
  title: { color: theme.colors.foreground, fontFamily: theme.typography.extraBold, fontSize: 30, lineHeight: 36 },
  description: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 14, lineHeight: 22 },
  list: { gap: theme.spacing.sm },
  book: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  bookInfo: { flex: 1, gap: theme.spacing.xxs },
  bookTitle: { color: theme.colors.foreground, fontFamily: theme.typography.bold, fontSize: 14 },
  bookMeta: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 12 },
  empty: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 13, lineHeight: 20, textAlign: 'center', paddingVertical: theme.spacing.lg }
});
