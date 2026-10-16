import { StyleSheet } from 'react-native';
import type { AppTheme } from '../../styles/theme';
export const createStyles = (theme: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg },
  content: { width: '100%', maxWidth: 360, alignItems: 'center', gap: theme.spacing.sm },
  brand: { fontSize: 24, fontWeight: '700', color: theme.colors.foreground, textAlign: 'center', marginTop: theme.spacing.sm },
  status: { fontSize: 16, lineHeight: 24, color: theme.colors.mutedForeground, textAlign: 'center' },
  heading: { fontSize: 20, fontWeight: '600', color: theme.colors.foreground, textAlign: 'center' },
  reload: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 12, marginTop: 12, borderRadius: theme.radius.md, backgroundColor: theme.colors.primary },
  reloadText: { fontSize: 16, fontWeight: '600', textAlign: 'center', color: theme.colors.onPrimary }
});
