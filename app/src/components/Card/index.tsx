import { useThemedStyles } from '../../styles/useThemedStyles';
import { View, type ViewProps } from 'react-native';
import { createStyles } from './styles';

export function Card({ style, ...props }: ViewProps) {
  const styles = useThemedStyles(createStyles);

  return <View style={[styles.card, style]} {...props} />;
}
