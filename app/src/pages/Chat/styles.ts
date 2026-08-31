import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  older: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: theme.spacing.md },
  olderText: { color: theme.colors.secondary, fontFamily: theme.typography.semibold, fontSize: 12 }
});
