import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';
import { theme } from '../../../styles/theme';
import { styles } from './styles';
export function Attachment({ label }: { label: string }) { return <View style={styles.box}><MaterialIcons name="attach-file" size={16} color={theme.colors.secondary} /><Text style={styles.text}>{label}</Text></View>; }
