import { useThemedStyles } from '../../../styles/useThemedStyles';
import { Text, View } from 'react-native';
import { createStyles } from './styles';
export function Marker({ label }: { label: string }) {
  const styles = useThemedStyles(createStyles);
 return <View style={styles.row}><Text style={styles.text}>{label}</Text></View>; }
