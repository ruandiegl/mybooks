import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
export const styles = StyleSheet.create({
  list: { paddingBottom: theme.spacing.xxl },
  item: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.outline },
  itemPressed: { opacity: 0.72 },
  copy: { flex: 1, gap: 2 },
  name: { color: theme.colors.foreground, fontFamily: theme.typography.bold, fontSize: 15 },
  preview: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 13 },
  date: { color: theme.colors.mutedForeground, fontFamily: theme.typography.medium, fontSize: 10 },
  matches: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.secondarySoft, alignItems: 'center', justifyContent: 'center' },
  matchesPressed: { backgroundColor: theme.colors.surfaceStrong },
  removalNotice: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.outline, borderRadius: theme.radius.md, paddingLeft: theme.spacing.md, paddingRight: theme.spacing.xs, marginBottom: theme.spacing.sm },
  removalNoticeText: { flex: 1, color: theme.colors.foreground, fontFamily: theme.typography.medium, fontSize: 12, lineHeight: 18 },
  dismissNotice: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.pill }
});
