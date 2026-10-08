import { useThemedStyles } from '../../../styles/useThemedStyles';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';
import { useAppTheme } from '../../../providers/ThemeProvider';
import { createStyles } from './styles';
export function Attachment({ label }: { label: string }) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useAppTheme();
 return <View style={styles.box}><MaterialIcons name="attach-file" size={16} color={theme.colors.secondary} /><Text style={styles.text}>{label}</Text></View>; }
