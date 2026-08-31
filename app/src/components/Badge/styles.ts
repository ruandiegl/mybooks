import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  default: { backgroundColor: theme.colors.surfaceMuted },
  success: { backgroundColor: theme.colors.successSoft },
  violet: { backgroundColor: theme.colors.secondarySoft },
  text: { color: theme.colors.foreground, fontFamily: theme.typography.semibold, fontSize: 11 },
  successText: { color: theme.colors.success },
  violetText: { color: theme.colors.secondary }
});
