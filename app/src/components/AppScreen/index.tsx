import { Platform, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './styles';
export function AppScreen({ style, ...props }: ViewProps) {
  // Tab screens own top/side clearance; the tab bar owns the bottom inset.
  return <SafeAreaView style={styles.safe} edges={Platform.OS === 'web' ? ['top', 'left', 'right'] : ['top']}><View style={[styles.content, style]} {...props} /></SafeAreaView>;
}
