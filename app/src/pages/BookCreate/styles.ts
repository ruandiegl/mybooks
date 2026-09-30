import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
export const styles = StyleSheet.create({
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl, gap: theme.spacing.md },
  intro: { gap: theme.spacing.xs },
  title: { color: theme.colors.foreground, fontFamily: theme.typography.extraBold, fontSize: 27, letterSpacing: -0.6 },
  description: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, lineHeight: 21 },
  isbnCard: { gap: theme.spacing.md, backgroundColor: theme.colors.surfaceMuted },
  isbnActions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  isbnAction: { flexGrow: 1, minWidth: 132 },
  section: { color: theme.colors.foreground, fontFamily: theme.typography.bold, fontSize: 17, marginTop: theme.spacing.sm },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  half: { flex: 1 }
});
