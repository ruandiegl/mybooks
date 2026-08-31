import { View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './styles';
export function AppScreen({ style, ...props }: ViewProps) {
  return <SafeAreaView style={styles.safe} edges={['top']}><View style={[styles.content, style]} {...props} /></SafeAreaView>;
}
