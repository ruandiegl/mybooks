import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 672, alignSelf: 'center' },
  content: { paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xxl, gap: theme.spacing.lg },
  summaryCard: { gap: theme.spacing.md },
  summaryHeading: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  flameIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.pill, backgroundColor: theme.colors.primarySoft },
  summaryCopy: { flex: 1, minWidth: 0, gap: theme.spacing.xxs },
  eyebrow: { color: theme.colors.mutedForeground, fontFamily: theme.typography.medium, fontSize: 13, lineHeight: 19 },
  streakValue: { color: theme.colors.foreground, fontFamily: theme.typography.bold, fontSize: 20, lineHeight: 29, flexShrink: 1 },
  summaryDivider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.outline },
  rankSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  rankLabel: { flex: 1, color: theme.colors.mutedForeground, fontFamily: theme.typography.medium, fontSize: 14, lineHeight: 21 },
  rankValue: { color: theme.colors.primary, fontFamily: theme.typography.bold, fontSize: 15, lineHeight: 22, textAlign: 'right' },
  sectionHeading: { gap: theme.spacing.xs },
  sectionTitle: { color: theme.colors.foreground, fontFamily: theme.typography.bold, fontSize: 19, lineHeight: 27 },
  sectionDescription: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 13, lineHeight: 20 },
  entries: { gap: theme.spacing.sm },
  entry: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderWidth: 1, borderColor: theme.colors.outline, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface },
  position: { minWidth: 44, color: theme.colors.secondary, fontFamily: theme.typography.bold, fontSize: 15, lineHeight: 22 },
  entryCopy: { flex: 1, minWidth: 0, gap: theme.spacing.xxs },
  entryName: { color: theme.colors.foreground, fontFamily: theme.typography.semibold, fontSize: 14, lineHeight: 20 },
  entryMeta: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 12, lineHeight: 18 }
});
