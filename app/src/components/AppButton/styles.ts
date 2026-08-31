import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs
  },
  primary: { backgroundColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.secondary },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.outline },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.48 },
  label: { fontFamily: theme.typography.semibold, fontSize: 15 },
  lightLabel: { color: theme.colors.white },
  darkLabel: { color: theme.colors.foreground }
});
