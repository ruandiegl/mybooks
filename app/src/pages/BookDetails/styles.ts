import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl, gap: theme.spacing.md },
  cover: { width: '62%', aspectRatio: 0.68, alignSelf: 'center', borderRadius: theme.radius.lg, overflow: 'hidden', backgroundColor: theme.colors.surfaceStrong },
  image: { width: '100%', height: '100%' },
  galleryList: { gap: theme.spacing.xs, justifyContent: 'center' },
  thumbnail: { width: 56, height: 76, borderRadius: theme.radius.sm, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceMuted },
  selectedThumbnail: { borderWidth: 2, borderColor: theme.colors.primary },
  thumbnailImage: { width: '100%', height: '100%' },
  thumbnailFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceMuted },
  thumbnailLabel: { position: 'absolute', right: 3, bottom: 3, borderRadius: theme.radius.pill, paddingHorizontal: 5, paddingVertical: 2, color: theme.colors.white, backgroundColor: theme.colors.primary, fontFamily: theme.typography.bold, fontSize: 9 },
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
