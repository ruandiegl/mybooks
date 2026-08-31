import { Pressable, Text, View } from 'react-native';
import { styles } from './styles';

type Option<T extends string> = { value: T; label: string };
type Props<T extends string> = { value: T; options: Array<Option<T>>; onValueChange: (value: T) => void; accessibilityLabel: string };

export function ToggleGroup<T extends string>({ value, options, onValueChange, accessibilityLabel }: Props<T>) {
  return <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.group}>{options.map((option) => { const selected = option.value === value; return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => onValueChange(option.value)} style={({ pressed }) => [styles.item, selected && styles.selected, pressed && styles.pressed]}><Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text></Pressable>; })}</View>;
}
