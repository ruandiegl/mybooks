import { ScrollView, type ScrollViewProps } from 'react-native';
import { styles } from './styles';
export function MessageScroller({ contentContainerStyle, ...props }: ScrollViewProps) {
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.list, contentContainerStyle]} {...props} />;
}
