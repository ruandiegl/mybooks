import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { theme } from '../../styles/theme';
import { styles } from './styles';

type Props = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  value: string;
  onChangeText: (value: string) => void;
};

export function SearchField({ value, onChangeText, onFocus, onBlur, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.group, focused && styles.focused]}>
      <MaterialIcons name="search" size={21} color={theme.colors.mutedForeground} />
      <TextInput
        accessibilityLabel="Buscar livros"
        value={value}
        onChangeText={onChangeText}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        placeholderTextColor={theme.colors.mutedForeground}
        style={styles.input}
        returnKeyType="search"
        {...props}
      />
      {value ? <Pressable accessibilityRole="button" accessibilityLabel="Limpar busca" onPress={() => onChangeText('')} style={({ pressed }) => [styles.clear, pressed && styles.clearPressed]}><MaterialIcons name="close" size={18} color={theme.colors.mutedForeground} /></Pressable> : null}
    </View>
  );
}
