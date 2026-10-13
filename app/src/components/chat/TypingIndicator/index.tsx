import { useThemedStyles } from '../../../styles/useThemedStyles';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';
import { useAppTheme } from '../../../providers/ThemeProvider';
import { createStyles } from './styles';

export function TypingIndicator() {
  const styles = useThemedStyles(createStyles);
  const { theme } = useAppTheme();

  return <View accessibilityLiveRegion="polite" accessibilityLabel="A outra pessoa está digitando" style={styles.container}><MaterialIcons name="more-horiz" size={20} color={theme.colors.secondary} /><Text style={styles.label}>digitando…</Text></View>;
}
