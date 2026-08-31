import { StyleSheet } from 'react-native';
import { theme } from '../../../styles/theme';

export const styles = StyleSheet.create({
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.xs, padding: theme.spacing.sm, paddingBottom: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.outline, backgroundColor: theme.colors.surface },
  input: { flex: 1, maxHeight: 120, minHeight: 48, borderRadius: 24, backgroundColor: theme.colors.surfaceMuted, color: theme.colors.foreground, fontFamily: theme.typography.regular, fontSize: 15, paddingHorizontal: theme.spacing.md, paddingVertical: 12 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
  disabled: { opacity: 0.48 },
  pressed: { backgroundColor: theme.colors.primaryPressed }
});
