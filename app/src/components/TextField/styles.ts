import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  group: { gap: theme.spacing.xs },
  label: { color: theme.colors.foreground, fontFamily: theme.typography.semibold, fontSize: 13 },
  input: {
    minHeight: 52,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.foreground,
    fontFamily: theme.typography.regular,
    fontSize: 15
  },
  multiline: { minHeight: 112, paddingTop: theme.spacing.md, textAlignVertical: 'top' },
  error: { borderColor: theme.colors.danger },
  help: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 12 },
  errorText: { color: theme.colors.danger }
});
