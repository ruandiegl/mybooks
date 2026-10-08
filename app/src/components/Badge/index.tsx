import { useThemedStyles } from '../../styles/useThemedStyles';
import { Text, View } from 'react-native';
import { createStyles } from './styles';

type Props = { label: string; variant?: 'default' | 'success' | 'violet' };

export function Badge({ label, variant = 'default' }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.badge, styles[variant]]}>
      <Text style={[styles.text, variant === 'success' && styles.successText, variant === 'violet' && styles.violetText]}>{label}</Text>
    </View>
  );
}
