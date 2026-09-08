import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  hero: {
    height: 242,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    padding: theme.spacing.md,
    justifyContent: 'space-between'
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md
  },
  brandLockup: { gap: 2 },
  brand: { color: theme.colors.white, fontFamily: theme.typography.extraBold, fontSize: 20, letterSpacing: -0.5 },
  meta: { color: theme.colors.profileHeroScrim, fontFamily: theme.typography.semibold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2 },
  action: { width: 48, height: 48, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.profileHeroScrim },
  actionPressed: { backgroundColor: 'rgba(255, 255, 255, 0.26)' },
  copy: { maxWidth: 300, gap: theme.spacing.xs, marginBottom: theme.spacing.sm },
  eyebrow: { color: theme.colors.profileHeroScrim, fontFamily: theme.typography.bold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5 },
  title: { color: theme.colors.white, fontFamily: theme.typography.extraBold, fontSize: 26, lineHeight: 31, letterSpacing: -0.7 },
  pattern: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  bookIcon: { position: 'absolute', right: -24, top: 24, color: theme.colors.profileHeroPattern, transform: [{ rotate: '-12deg' }] },
  lineOne: { position: 'absolute', width: 154, height: 1, backgroundColor: theme.colors.profileHeroPattern, right: -8, top: 128, transform: [{ rotate: '-12deg' }] },
  lineTwo: { position: 'absolute', width: 110, height: 1, backgroundColor: theme.colors.profileHeroPattern, right: 32, top: 150, transform: [{ rotate: '-12deg' }] },
  bookmark: { position: 'absolute', left: 18, bottom: 18, width: 8, height: 54, borderRadius: 4, backgroundColor: theme.colors.profileHeroAccent, opacity: 0.94 }
});
