import { Text, TextInput, type TextInputProps, View } from 'react-native';
import { theme } from '../../styles/theme';
import { styles } from './styles';

type Props = TextInputProps & { label: string; error?: string; help?: string };

export function TextField({ label, error, help, multiline, style, accessibilityLabel, ...props }: Props) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label}
        placeholderTextColor={theme.colors.mutedForeground}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline, Boolean(error) && styles.error, style]}
        {...props}
      />
      {error || help ? <Text style={[styles.help, error && styles.errorText]}>{error || help}</Text> : null}
    </View>
  );
}
