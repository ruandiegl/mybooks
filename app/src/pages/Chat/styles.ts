import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  older: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: theme.spacing.md },
  olderText: { color: theme.colors.secondary, fontFamily: theme.typography.semibold, fontSize: 12 },
  dialogOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg },
  dialogBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: theme.colors.overlay },
  dialog: { width: '100%', maxWidth: 440, backgroundColor: theme.colors.background, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md, elevation: 16 },
  dialogTitle: { color: theme.colors.foreground, fontFamily: theme.typography.bold, fontSize: 20 },
  dialogMessage: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 14, lineHeight: 21 },
  dialogActions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  dialogButton: { flex: 1, paddingHorizontal: theme.spacing.sm }
});
