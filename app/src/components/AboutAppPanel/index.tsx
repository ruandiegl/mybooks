import { Text, View } from 'react-native';
import configuration from '../../../app.json';
import { useThemedStyles } from '../../styles/useThemedStyles';
import { createStyles } from './styles';
export function AboutAppPanel() {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.group}><Text style={styles.label}>TrocaLivros</Text><Text style={styles.detail}>Versão {configuration.expo.version}</Text><Text style={styles.detail}>Descubra livros, encontre leitores e coloque novas histórias em circulação.</Text></View>;
}
