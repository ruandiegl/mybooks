import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  toggleContainer: {
    marginBottom: theme.spacing.md,
  },
  filtersRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  filterChip: {
    minHeight: 48,
    maxWidth: '100%',
    justifyContent: 'center',
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
    paddingBottom: theme.spacing.xl,
  },
  gridRow: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  listEmpty: {
    flex: 1,
  },
  footerLoader: {
    marginVertical: theme.spacing.lg,
  },
});
