import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: theme.spacing.md, gap: theme.spacing.lg },
  heading: { gap: theme.spacing.sm },
  title: { color: theme.colors.foreground, fontFamily: theme.typography.extraBold, fontSize: 28, lineHeight: 34, letterSpacing: -0.8 },
  author: { color: theme.colors.primary, fontFamily: theme.typography.semibold, fontSize: 15 },
  subtitle: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 16, lineHeight: 24 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  owner: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  ownerInfo: { flex: 1, gap: theme.spacing.xxs },
  ownerCaption: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 12 },
  ownerName: { color: theme.colors.foreground, fontFamily: theme.typography.semibold },
  ownerCity: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 12 },
  sectionBlock: { gap: theme.spacing.sm, paddingTop: theme.spacing.lg, borderTopWidth: 1, borderTopColor: theme.colors.outline },
  section: { color: theme.colors.foreground, fontFamily: theme.typography.bold, fontSize: 17 },
  body: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 15, lineHeight: 24 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  infoLabel: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 14 },
  infoValue: { flexShrink: 1, color: theme.colors.foreground, fontFamily: theme.typography.medium, fontSize: 14, textAlign: 'right' }
});
