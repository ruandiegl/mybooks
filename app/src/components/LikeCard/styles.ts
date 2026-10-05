import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  container: {
    padding: 0, borderRadius: theme.radius.md, overflow: 'hidden', marginBottom: theme.spacing.sm
  },
  topRow: {
    padding: theme.spacing.xs, flexDirection: 'row', gap: theme.spacing.xs,
    alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.outline
  },
  userSection: { flex: 1, gap: theme.spacing.xxs },
  userName: { fontFamily: theme.typography.bold, fontSize: 13, lineHeight: 17, color: theme.colors.foreground },
  userCaption: { fontFamily: theme.typography.medium, fontSize: 12, color: theme.colors.primary },
  cover: { width: '100%', backgroundColor: theme.colors.surfaceMuted },
  infoContainer: { padding: theme.spacing.xs, gap: theme.spacing.xxs, flexDirection: 'row', alignItems: 'center' },
  bookTitle: { flex: 1, minHeight: 40, fontFamily: theme.typography.bold, fontSize: 15, lineHeight: 20, letterSpacing: -0.3, color: theme.colors.foreground },
  relatedBook: {
    minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs,
    padding: theme.spacing.xs, borderTopWidth: 1, borderTopColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceMuted
  },
  relatedBookInfo: { flex: 1 },
  relatedBookCaption: { fontFamily: theme.typography.regular, fontSize: 12, color: theme.colors.mutedForeground },
  relatedBookTitle: { fontFamily: theme.typography.semibold, fontSize: 12, color: theme.colors.foreground },
  actionsContainer: {
    flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, padding: theme.spacing.xxs, marginTop: 'auto',
    borderTopWidth: 1, borderTopColor: theme.colors.outline
  },
  actionButton: {
    flex: 1, minWidth: 48, minHeight: 48, paddingHorizontal: theme.spacing.xxs, paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: theme.spacing.xxs
  },
  actionLabel: { flexShrink: 1, fontFamily: theme.typography.semibold, fontSize: 12, color: theme.colors.foreground, textAlign: 'center' },
  dismissButton: { backgroundColor: theme.colors.surfaceMuted, borderWidth: 1, borderColor: theme.colors.outline },
  likeButton: { backgroundColor: theme.colors.primary },
  unlikeButton: { backgroundColor: theme.colors.surfaceMuted },
  unlikeLabel: { color: theme.colors.danger },
  unavailableActions: { flex: 1, minHeight: 48, padding: theme.spacing.xxs, fontFamily: theme.typography.regular, fontSize: 12, lineHeight: 18, color: theme.colors.mutedForeground, textAlign: 'center' },
  disabled: { opacity: 0.48 },
  pressed: { opacity: 0.76 }
});
