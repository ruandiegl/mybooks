import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  gallery: { gap: theme.spacing.xs },
  stage: { borderRadius: theme.radius.lg, backgroundColor: theme.colors.surfaceMuted, overflow: 'hidden' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface },
  disabled: { opacity: 0.3 },
  pressed: { opacity: 0.7 },
  counter: { flex: 1, textAlign: 'center', color: theme.colors.mutedForeground, fontFamily: theme.typography.medium, fontSize: 13 },
  thumbnails: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.sm },
  thumbnail: { width: 76, borderRadius: theme.radius.sm, padding: theme.spacing.xxs, borderWidth: 2, borderColor: theme.colors.outline, backgroundColor: theme.colors.surface },
  selectedThumbnail: { borderColor: theme.colors.primary },
  thumbnailImage: { height: 80, overflow: 'hidden', borderRadius: 6, backgroundColor: theme.colors.surfaceMuted },
  thumbnailLabel: { paddingVertical: theme.spacing.xxs, textAlign: 'center', fontSize: 12, fontFamily: theme.typography.medium, color: theme.colors.mutedForeground },
  selectedLabel: { color: theme.colors.primary, fontFamily: theme.typography.bold },
  refresh: { minHeight: 48, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', paddingHorizontal: theme.spacing.md },
  refreshLabel: { color: theme.colors.primary, fontFamily: theme.typography.medium, fontSize: 13 }
});
