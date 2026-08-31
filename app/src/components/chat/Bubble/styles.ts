import { StyleSheet } from 'react-native';
import { theme } from '../../../styles/theme';
export const styles = StyleSheet.create({
  bubble: { maxWidth: '82%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: theme.colors.primary, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: theme.colors.surface, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: theme.colors.outline },
  body: { fontFamily: theme.typography.regular, fontSize: 15, lineHeight: 21 },
  mineText: { color: theme.colors.white },
  theirText: { color: theme.colors.foreground },
  time: { marginTop: 3, fontFamily: theme.typography.medium, fontSize: 9, opacity: 0.7, textAlign: 'right' }
});
