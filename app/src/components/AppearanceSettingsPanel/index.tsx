import { Pressable, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { useAppTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../styles/useThemedStyles';
import type { ThemePreference } from '../../features/preferences/themeTypes';
import { createStyles } from './styles';
export function AppearanceSettingsPanel() {
  const { theme, preference, setPreference, persistenceError } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [focus, setFocus] = useState<string>();
  const choices: { value: ThemePreference; label: string }[] = [{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }, { value: 'system', label: 'Usar tema do dispositivo' }];
  return <View style={styles.group}>
    <Text style={styles.detail}>Escolha como o TrocaLivros aparece neste dispositivo.</Text>
    {choices.map(choice => <Pressable key={choice.value} accessibilityRole="radio" accessibilityLabel={choice.label} aria-checked={preference === choice.value} accessibilityState={{ checked: preference === choice.value }} onPress={() => { void setPreference(choice.value); }} onFocus={() => setFocus(choice.value)} onBlur={() => setFocus(undefined)} style={({ pressed }) => [styles.row, pressed && styles.pressed, focus === choice.value && styles.focused]}>
      <Text style={[styles.label, styles.rowCopy]}>{choice.label}</Text>
      <MaterialIcons accessible={false} name={preference === choice.value ? 'radio-button-checked' : 'radio-button-unchecked'} size={24} color={preference === choice.value ? theme.colors.primary : theme.colors.mutedForeground} />
    </Pressable>)}
    {persistenceError ? <Text accessibilityLiveRegion="polite" style={[styles.detail, styles.danger]}>{persistenceError}</Text> : null}
  </View>;
}
