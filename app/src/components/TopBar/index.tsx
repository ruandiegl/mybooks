import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { styles } from './styles';
type Props = { title: string; eyebrow?: string; action?: ReactNode };
export function TopBar({ title, eyebrow, action }: Props) {
  return <View style={styles.row}><View style={styles.copy}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text style={styles.title}>{title}</Text></View>{action}</View>;
}
