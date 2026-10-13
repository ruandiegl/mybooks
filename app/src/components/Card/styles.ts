import { StyleSheet } from 'react-native';
import type { AppTheme } from '../../styles/theme';

export const createStyles = (theme: AppTheme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: theme.spacing.md,
    shadowColor: theme.shadow.color,
    shadowOpacity: theme.shadow.opacity,
    shadowRadius: theme.shadow.radius,
    shadowOffset: theme.shadow.offset,
    elevation: theme.shadow.elevation
  }
});
