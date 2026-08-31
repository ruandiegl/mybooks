import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';
import { theme } from '../../styles/theme';
import { styles } from './styles';
export function IsbnBadge() {
  return <View style={styles.badge}><MaterialIcons name="verified" size={15} color={theme.colors.success} /><Text style={styles.text}>ISBN VERIFICADO</Text></View>;
}
