import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
export const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: theme.radius.pill, backgroundColor: theme.colors.successSoft, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  text: { color: theme.colors.success, fontFamily: theme.typography.bold, fontSize: 11, letterSpacing: 0.3 }
});
