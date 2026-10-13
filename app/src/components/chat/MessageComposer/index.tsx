import { useThemedStyles } from '../../../styles/useThemedStyles';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../providers/ThemeProvider';
import { createStyles } from './styles';

type Props = {
  value: string;
  disabled?: boolean;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  onSend: () => void;
};

export function MessageComposer({ value, disabled, onChangeText, onBlur, onSend }: Props) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useAppTheme();

  const insets = useSafeAreaInsets();
  const safeStyle = Platform.OS === 'web' ? { paddingBottom: theme.spacing.md + insets.bottom } : undefined;
  const sendDisabled = disabled || !value.trim();
  return <View style={[styles.composer, safeStyle]}><TextInput accessibilityLabel="Mensagem" value={value} onChangeText={onChangeText} onBlur={onBlur} placeholder="Escreva uma mensagem…" placeholderTextColor={theme.colors.mutedForeground} multiline maxLength={2000} style={styles.input} /><Pressable accessibilityRole="button" accessibilityLabel="Enviar mensagem" accessibilityState={{ disabled: sendDisabled }} disabled={sendDisabled} onPress={onSend} style={({ pressed }) => [styles.send, sendDisabled && styles.disabled, pressed && !sendDisabled && styles.pressed]}><MaterialIcons name="arrow-upward" size={24} color={theme.colors.onPrimary} /></Pressable></View>;
}
