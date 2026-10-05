import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.md, gap: theme.spacing.sm },
  title: { fontFamily: theme.typography.bold, fontSize: 24, color: theme.colors.foreground, textAlign: 'center' },
  message: { fontFamily: theme.typography.regular, fontSize: 13, color: theme.colors.mutedForeground, textAlign: 'center' }
});
