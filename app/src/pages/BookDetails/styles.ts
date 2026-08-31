import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl, gap: theme.spacing.md },
  cover: { width: '62%', aspectRatio: 0.68, alignSelf: 'center', borderRadius: theme.radius.lg, overflow: 'hidden', backgroundColor: theme.colors.surfaceStrong },
  image: { width: '100%', height: '100%' },
  fallback: { flex: 1, justifyContent: 'flex-end', padding: theme.spacing.lg },
  fallbackText: { color: theme.colors.foreground, fontFamily: theme.typography.extraBold, fontSize: 24 },
  title: { color: theme.colors.foreground, fontFamily: theme.typography.extraBold, fontSize: 28, lineHeight: 34, letterSpacing: -0.8 },
  author: { color: theme.colors.primary, fontFamily: theme.typography.semibold, fontSize: 15 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  owner: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginVertical: theme.spacing.sm },
  ownerName: { color: theme.colors.foreground, fontFamily: theme.typography.semibold },
  ownerCity: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 12 },
  section: { color: theme.colors.foreground, fontFamily: theme.typography.bold, fontSize: 17, marginTop: theme.spacing.sm },
  body: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 14, lineHeight: 22 }
});
