import { Text, View } from 'react-native';
import { styles } from './styles';

type Props = { label: string; variant?: 'default' | 'success' | 'violet' };

export function Badge({ label, variant = 'default' }: Props) {
  return (
    <View style={[styles.badge, styles[variant]]}>
      <Text style={[styles.text, variant === 'success' && styles.successText, variant === 'violet' && styles.violetText]}>{label}</Text>
    </View>
  );
}
