import { useThemedStyles } from '../../styles/useThemedStyles';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';
import { useAppTheme } from '../../providers/ThemeProvider';
import { createStyles } from './styles';
export function IsbnBadge() {
  const styles = useThemedStyles(createStyles);
  const { theme } = useAppTheme();

  return <View style={styles.badge}><MaterialIcons name="verified" size={15} color={theme.colors.success} /><Text style={styles.text}>ISBN VERIFICADO</Text></View>;
}
