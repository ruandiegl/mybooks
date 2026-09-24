import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black
  },
  camera: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  },
  topShade: {
    flex: 1,
    backgroundColor: 'rgba(26, 16, 20, 0.68)'
  },
  scanRow: {
    flexDirection: 'row',
    height: 190
  },
  sideShade: {
    flex: 1,
    backgroundColor: 'rgba(26, 16, 20, 0.68)'
  },
  scanFrame: {
    width: '82%',
    borderWidth: 3,
    borderColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    backgroundColor: 'transparent'
  },
  bottomShade: {
    flex: 1.25,
    backgroundColor: 'rgba(26, 16, 20, 0.68)'
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.lg,
    right: theme.spacing.md,
    width: 48,
    height: 48,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26, 16, 20, 0.74)',
    zIndex: 2
  },
  pressed: {
    opacity: 0.78
  },
  header: {
    gap: theme.spacing.xs,
    paddingRight: 56
  },
  eyebrow: {
    color: theme.colors.primarySoft,
    fontFamily: theme.typography.bold,
    fontSize: 13,
    letterSpacing: 1.1
  },
  title: {
    color: theme.colors.white,
    fontFamily: theme.typography.bold,
    fontSize: 22,
    lineHeight: 29
  },
  footer: {
    alignItems: 'center',
    gap: theme.spacing.sm
  },
  manualButton: {
    alignSelf: 'stretch'
  },
  hint: {
    color: theme.colors.white,
    backgroundColor: 'rgba(26, 16, 20, 0.82)',
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontFamily: theme.typography.medium,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    overflow: 'hidden'
  },
  invalidHint: {
    backgroundColor: 'rgba(186, 26, 26, 0.92)'
  },
  permissionCard: {
    width: '100%',
    maxWidth: 520,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    gap: theme.spacing.md
  },
  permissionTitle: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.bold,
    fontSize: 21,
    textAlign: 'center'
  },
  permissionText: {
    color: theme.colors.mutedForeground,
    fontFamily: theme.typography.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center'
  },
  permissionScroll: {
    flex: 1
  },
  permissionContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 88,
    paddingBottom: theme.spacing.lg
  },
  cameraChrome: {
    flex: 1
  },
  cameraChromeContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 88,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.xl
  }
});
