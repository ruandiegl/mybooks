import { StyleSheet } from 'react-native';
import type { AppTheme } from '../../styles/theme';
export const createStyles = (theme: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  keyboard: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, gap: theme.spacing.xs, flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, fontSize: 20, fontFamily: theme.typography.bold, color: theme.colors.foreground },
  control: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.pill, borderWidth: 2, borderColor: 'transparent' },
  focused: { borderColor: theme.colors.primary }, pressed: { backgroundColor: theme.colors.surfaceMuted },
  content: { flexGrow: 1, width: '100%', maxWidth: 672, alignSelf: 'center', paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.lg, gap: theme.spacing.lg },
  group: { gap: theme.spacing.xxs },
  groupTitle: { color: theme.colors.mutedForeground, fontFamily: theme.typography.semibold, fontSize: 12, letterSpacing: 1, paddingTop: theme.spacing.sm },
  row: { minHeight: 56, paddingVertical: theme.spacing.sm, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.outline, borderWidth: 2, borderColor: 'transparent', borderRadius: theme.radius.sm },
  rowCopy: { flex: 1, gap: theme.spacing.xxs },
  label: { color: theme.colors.foreground, fontFamily: theme.typography.medium, fontSize: 16, lineHeight: 24 },
  detail: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 14, lineHeight: 21 },
  danger: { color: theme.colors.danger }, disabled: { opacity: .5 }
});
