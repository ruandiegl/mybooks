import { Text, View } from 'react-native';
import { profileHelp } from '../../features/settings/helpContent';
import { useThemedStyles } from '../../styles/useThemedStyles';
import { createStyles } from './styles';
export function ProfileHelpPanel() {
  const styles = useThemedStyles(createStyles);
  return <View style={{ gap: 24 }}>{profileHelp.map(item => <View style={styles.group} key={item.question}><Text accessibilityRole="header" style={styles.label}>{item.question}</Text><Text style={styles.detail}>{item.answer}</Text></View>)}</View>;
}
