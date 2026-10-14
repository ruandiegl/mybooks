import { StyleSheet } from 'react-native';
import type { AppTheme } from '../../styles/theme';

export const createStyles = (theme: AppTheme) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: theme.colors.overlay },
  outside: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  sheet: {
    width: '100%', maxWidth: 560, overflow: 'hidden',
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg,
    borderWidth: 1, borderBottomWidth: 0, borderColor: theme.colors.outline,
  },
  handleArea: { height: 24, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 38, height: 4, borderRadius: theme.radius.pill, backgroundColor: theme.colors.outline },
  header: { paddingHorizontal: theme.spacing.md, minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.pill, backgroundColor: theme.colors.primarySoft },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface },
  content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xs, gap: theme.spacing.sm },
  title: { color: theme.colors.foreground, fontFamily: theme.typography.bold, fontSize: 22, lineHeight: 30 },
  description: { color: theme.colors.mutedForeground, fontFamily: theme.typography.medium, fontSize: 16, lineHeight: 24 },
  actions: { marginTop: theme.spacing.sm, gap: theme.spacing.sm },
  focused: { borderWidth: 2, borderColor: theme.colors.primary },
  pressed: { opacity: 0.82 },
});
