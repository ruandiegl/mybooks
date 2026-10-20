import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: theme.colors.overlay },
  sheet: { maxHeight: '86%', backgroundColor: theme.colors.background, borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm, shadowColor: theme.shadow.color, shadowOpacity: theme.shadow.opacity, shadowRadius: theme.shadow.radius, shadowOffset: { width: theme.shadow.offset.width, height: -theme.shadow.offset.height }, elevation: theme.shadow.elevation },
  handleTouch: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 42, height: 5, borderRadius: theme.radius.pill, backgroundColor: theme.colors.outline },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.xs },
  title: { color: theme.colors.foreground, fontFamily: theme.typography.bold, fontSize: 21 },
  close: { width: 48, height: 48, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  intro: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 13, lineHeight: 19, marginBottom: theme.spacing.md },
  list: { gap: theme.spacing.sm, paddingBottom: theme.spacing.lg },
  slot: { gap: theme.spacing.xs },
  side: { color: theme.colors.secondary, fontFamily: theme.typography.bold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { minHeight: 98, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.outline, borderRadius: theme.radius.md, padding: theme.spacing.sm },
  disabledCard: { opacity: 0.65 },
  cover: { width: 56, height: 76, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceMuted, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  bookTitle: { color: theme.colors.foreground, fontFamily: theme.typography.semibold, fontSize: 14 },
  authors: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 12 },
  availability: { color: theme.colors.secondary, fontFamily: theme.typography.medium, fontSize: 11, marginTop: 2 },
  unavailable: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 12, lineHeight: 18 },
  unavailableIcon: { color: theme.colors.mutedForeground }
});
