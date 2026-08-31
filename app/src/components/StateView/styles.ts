import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
export const styles = StyleSheet.create({
  box: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl, gap: theme.spacing.sm },
  icon: { width: 68, height: 68, borderRadius: 34, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: theme.colors.foreground, fontFamily: theme.typography.bold, fontSize: 19, textAlign: 'center' },
  description: { color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, fontSize: 14, textAlign: 'center', lineHeight: 21 }
});
