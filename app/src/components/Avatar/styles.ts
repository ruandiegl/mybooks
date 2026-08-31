import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  avatar: { borderRadius: theme.radius.pill, backgroundColor: theme.colors.secondarySoft, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%', borderRadius: theme.radius.pill },
  initials: { color: theme.colors.secondary, fontFamily: theme.typography.bold }
});
