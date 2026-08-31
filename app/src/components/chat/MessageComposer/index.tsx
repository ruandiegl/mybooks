import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, TextInput, View } from 'react-native';
import { theme } from '../../../styles/theme';
import { styles } from './styles';

type Props = {
  value: string;
  disabled?: boolean;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  onSend: () => void;
};

export function MessageComposer({ value, disabled, onChangeText, onBlur, onSend }: Props) {
  const sendDisabled = disabled || !value.trim();
  return <View style={styles.composer}><TextInput accessibilityLabel="Mensagem" value={value} onChangeText={onChangeText} onBlur={onBlur} placeholder="Escreva uma mensagem…" placeholderTextColor={theme.colors.mutedForeground} multiline maxLength={2000} style={styles.input} /><Pressable accessibilityRole="button" accessibilityLabel="Enviar mensagem" accessibilityState={{ disabled: sendDisabled }} disabled={sendDisabled} onPress={onSend} style={({ pressed }) => [styles.send, sendDisabled && styles.disabled, pressed && !sendDisabled && styles.pressed]}><MaterialIcons name="arrow-upward" size={24} color={theme.colors.white} /></Pressable></View>;
}
