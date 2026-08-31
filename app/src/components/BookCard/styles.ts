import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
export const styles = StyleSheet.create({
  card: { flex: 1, gap: theme.spacing.sm },
  cover: { width: '100%', aspectRatio: 0.69, borderRadius: theme.radius.md, overflow: 'hidden', backgroundColor: theme.colors.surfaceStrong },
  image: { width: '100%', height: '100%' },
  fallback: { flex: 1, padding: theme.spacing.md, justifyContent: 'space-between' },
  monogram: { color: theme.colors.primary, fontFamily: theme.typography.extraBold, fontSize: 30 },
  fallbackTitle: { color: theme.colors.foreground, fontFamily: theme.typography.bold, fontSize: 15 },
  title: { color: theme.colors.foreground, fontFamily: theme.typography.bold, fontSize: 14, lineHeight: 18 },
  author: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 12 },
  badge: { position: 'absolute', left: 8, top: 8 }
});
