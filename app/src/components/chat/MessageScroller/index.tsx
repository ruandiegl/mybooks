import { useThemedStyles } from '../../../styles/useThemedStyles';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { createStyles } from './styles';
export function MessageScroller({ contentContainerStyle, ...props }: ScrollViewProps) {
  const styles = useThemedStyles(createStyles);

  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.list, contentContainerStyle]} {...props} />;
}
