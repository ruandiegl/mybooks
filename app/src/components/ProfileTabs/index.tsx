import { useThemedStyles } from '../../styles/useThemedStyles';
import { Pressable, Text, View } from 'react-native';
import { createStyles } from './styles';

export type ProfileTabKey = 'shelf' | 'about';
type Props = { value: ProfileTabKey; onChange: (value: ProfileTabKey) => void };

const tabs: Array<{ key: ProfileTabKey; label: string }> = [
  { key: 'shelf', label: 'Minha estante' },
  { key: 'about', label: 'Sobre você' }
];

export function ProfileTabs({ value, onChange }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const selected = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            onPress={() => onChange(tab.key)}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{tab.label}</Text>
            {selected ? <View style={styles.indicator} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
