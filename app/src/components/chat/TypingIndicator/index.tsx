import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';
import { theme } from '../../../styles/theme';
import { styles } from './styles';

export function TypingIndicator() {
  return <View accessibilityLiveRegion="polite" accessibilityLabel="A outra pessoa está digitando" style={styles.container}><MaterialIcons name="more-horiz" size={20} color={theme.colors.secondary} /><Text style={styles.label}>digitando…</Text></View>;
}
