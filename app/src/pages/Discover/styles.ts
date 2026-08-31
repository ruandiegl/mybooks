import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
export const styles = StyleSheet.create({
  body: { flex: 1, paddingBottom: theme.spacing.md },
  deck: { flex: 1, justifyContent: 'center' },
  gesture: { width: '100%' },
  card: { padding: 0, overflow: 'hidden', borderRadius: 28 },
  cardLandscape: { flexDirection: 'row' },
  cover: { width: '100%', backgroundColor: theme.colors.surfaceStrong },
  coverLandscape: { width: '44%' },
  fallback: { flex: 1, justifyContent: 'flex-end', padding: theme.spacing.xl },
  fallbackText: { color: theme.colors.foreground, fontFamily: theme.typography.extraBold, fontSize: 30 },
  image: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: theme.spacing.md, left: theme.spacing.md },
  details: { padding: theme.spacing.lg, gap: theme.spacing.xs },
  detailsLandscape: { flex: 1, justifyContent: 'center' },
  title: { color: theme.colors.foreground, fontFamily: theme.typography.extraBold, fontSize: 25, letterSpacing: -0.6 },
  author: { color: theme.colors.primary, fontFamily: theme.typography.semibold, fontSize: 14 },
  owner: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 13 },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.lg, paddingTop: theme.spacing.md },
  action: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.outline },
  like: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  disabled: { opacity: 0.48 },
  pressed: { backgroundColor: theme.colors.surfaceMuted },
  likePressed: { backgroundColor: theme.colors.primaryPressed }
});
