import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  container: { gap: theme.spacing.sm },
  heading: { gap: theme.spacing.xxs },
  title: { color: theme.colors.foreground, fontFamily: theme.typography.bold, fontSize: 17 },
  description: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 12, lineHeight: 18 },
  tiles: { flexDirection: 'row', gap: theme.spacing.xs, alignItems: 'flex-start' },
  tile: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
  imageFrame: { width: '100%', aspectRatio: 0.72, borderWidth: 1, borderColor: theme.colors.outline, borderRadius: theme.radius.md, overflow: 'hidden', backgroundColor: theme.colors.surfaceMuted },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
  orderBadge: { position: 'absolute', left: 6, top: 6, minWidth: 25, height: 25, paddingHorizontal: 6, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  coverBadge: { backgroundColor: theme.colors.primary },
  orderText: { color: theme.colors.foreground, fontFamily: theme.typography.bold, fontSize: 11 },
  coverText: { color: theme.colors.white },
  remove: { position: 'absolute', right: 4, top: 4, width: 44, height: 44, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  controls: { flexDirection: 'row', justifyContent: 'center' },
  control: { width: 44, height: 44, borderRadius: theme.radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  addTile: { flex: 1, minWidth: 0, aspectRatio: 0.72, marginBottom: theme.spacing.xs + 44, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.outline, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs, padding: 4, backgroundColor: theme.colors.surface },
  addText: { color: theme.colors.primary, fontFamily: theme.typography.semibold, fontSize: 11, textAlign: 'center' },
  counter: { alignSelf: 'flex-end', color: theme.colors.mutedForeground, fontFamily: theme.typography.medium, fontSize: 11 },
  disabled: { opacity: 0.38 },
  pressed: { opacity: 0.68 }
});
