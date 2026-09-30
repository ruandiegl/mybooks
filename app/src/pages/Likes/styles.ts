import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  toggleContainer: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  filterChip: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  filterChipText: {
    fontFamily: theme.typography.medium,
    fontSize: 12,
    color: theme.colors.foreground,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: theme.spacing.xs, // Using xs because LikeCard has xs margin (total md)
    paddingBottom: theme.spacing.xl,
  },
  listEmpty: {
    flex: 1,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
  },
  footerLoader: {
    marginVertical: theme.spacing.lg,
  },
});
