import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
export const styles = StyleSheet.create({
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl, gap: theme.spacing.md },
  intro: { gap: theme.spacing.xs },
  title: { color: theme.colors.foreground, fontFamily: theme.typography.extraBold, fontSize: 27, letterSpacing: -0.6 },
  description: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, lineHeight: 21 },
  isbnCard: { gap: theme.spacing.md, backgroundColor: theme.colors.surfaceMuted },
  isbnRow: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-end' },
  isbnField: { flex: 1 },
  lookup: { minWidth: 104 },
  section: { color: theme.colors.foreground, fontFamily: theme.typography.bold, fontSize: 17, marginTop: theme.spacing.sm },
  imageButton: { minHeight: 130, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.outline, borderRadius: theme.radius.lg, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs, overflow: 'hidden', backgroundColor: theme.colors.surface },
  imagePressed: { opacity: 0.78 },
  image: { width: '100%', height: 220 },
  imageLabel: { color: theme.colors.primary, fontFamily: theme.typography.semibold },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  half: { flex: 1 }
});
