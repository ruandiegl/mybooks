import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  group: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm
  },
  focused: { borderColor: theme.colors.primary },
  input: {
    flex: 1,
    color: theme.colors.foreground,
    fontFamily: theme.typography.regular,
    fontSize: 14,
    paddingVertical: theme.spacing.sm
  },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  clearPressed: { opacity: 0.58 }
});
