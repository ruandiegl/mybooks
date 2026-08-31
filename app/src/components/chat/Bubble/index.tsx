import { Text, View } from 'react-native';
import { styles } from './styles';
type Props = { body: string; mine?: boolean; createdAt?: string };
export function Bubble({ body, mine, createdAt }: Props) {
  const time = createdAt ? new Date(createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  return <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}><Text style={[styles.body, mine ? styles.mineText : styles.theirText]}>{body}</Text>{time ? <Text style={[styles.time, mine ? styles.mineText : styles.theirText]}>{time}</Text> : null}</View>;
}
