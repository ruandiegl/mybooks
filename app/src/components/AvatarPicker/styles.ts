import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: theme.spacing.xs },
  avatar: { width: 104, height: 104, borderRadius: 52, backgroundColor: theme.colors.secondarySoft, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%', borderRadius: 52 },
  initials: { color: theme.colors.secondary, fontFamily: theme.typography.extraBold, fontSize: 30 },
  edit: { position: 'absolute', right: 0, bottom: 2, width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  help: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 11 },
  remove: { color: theme.colors.danger, fontFamily: theme.typography.semibold, fontSize: 12 }
});
