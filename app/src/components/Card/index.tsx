import { View, type ViewProps } from 'react-native';
import { styles } from './styles';

export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}
