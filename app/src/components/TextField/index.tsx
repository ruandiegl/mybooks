import { useThemedStyles } from '../../styles/useThemedStyles';
import { Text, TextInput, type TextInputProps, View } from 'react-native';
import type { Ref } from 'react';
import { useAppTheme } from '../../providers/ThemeProvider';
import { createStyles } from './styles';

type Props = TextInputProps & { label: string; error?: string; help?: string; inputRef?: Ref<TextInput> };

export function TextField({ label, error, help, multiline, style, accessibilityLabel, inputRef, ...props }: Props) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useAppTheme();

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={inputRef}
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
