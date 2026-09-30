import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceMuted,
    margin: theme.spacing.xs,
  },
  background: {
    flex: 1,
    justifyContent: 'space-between',
  },
  fallbackBackground: {
    backgroundColor: theme.colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageStyle: {
    borderRadius: theme.radius.md,
  },
  fallbackTitle: {
    fontFamily: theme.typography.semibold,
    fontSize: 16,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
    padding: theme.spacing.md,
    position: 'absolute',
  },
  topRow: {
    padding: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingRight: theme.spacing.sm,
    paddingLeft: 2,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    flex: 1,
  },
  userName: {
    fontFamily: theme.typography.medium,
    fontSize: 12,
    color: theme.colors.white,
    marginLeft: theme.spacing.xs,
    flex: 1,
  },
  gradient: {
    padding: theme.spacing.sm,
    paddingTop: theme.spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  infoContainer: {
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  bookTitle: {
    fontFamily: theme.typography.semibold,
    fontSize: 14,
    color: theme.colors.white,
    marginBottom: theme.spacing.xxs,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userCity: {
    fontFamily: theme.typography.regular,
    fontSize: 11,
    color: theme.colors.surfaceMuted,
    marginLeft: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  unavailableActions: {
    color: theme.colors.white,
    fontFamily: theme.typography.medium,
    fontSize: 9,
    maxWidth: 76,
    textAlign: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButton: {
    backgroundColor: theme.colors.surface,
  },
  likeButton: {
    backgroundColor: theme.colors.primary,
  },
  unlikeButton: {
    backgroundColor: theme.colors.surface,
  },
});
