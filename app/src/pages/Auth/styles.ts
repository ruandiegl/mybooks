import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  body: { flexGrow: 1, padding: theme.spacing.lg, justifyContent: 'space-between' },
  brand: { color: theme.colors.primary, fontFamily: theme.typography.extraBold, fontSize: 18, letterSpacing: -0.5 },
  hero: { gap: theme.spacing.lg },
  mark: { width: 84, height: 84, borderRadius: 26, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  title: { color: theme.colors.foreground, fontFamily: theme.typography.extraBold, fontSize: 40, lineHeight: 46, letterSpacing: -1.8 },
  accent: { color: theme.colors.primary },
  description: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 16, lineHeight: 25, maxWidth: 360 },
  actions: { gap: theme.spacing.sm },
  finePrint: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: theme.spacing.xs }
});
