import { Text, View } from 'react-native';
import { styles } from './styles';
export function Marker({ label }: { label: string }) { return <View style={styles.row}><Text style={styles.text}>{label}</Text></View>; }
