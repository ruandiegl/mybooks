import { useThemedStyles } from '../../styles/useThemedStyles';
import { Text, View } from 'react-native';
import { createStyles } from './styles';

export function OnboardingProgress({ step }: { step: 2 | 3 }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View accessibilityLabel={`Etapa ${step} de 3`} style={styles.wrapper}>
      <Text style={styles.label}>Etapa {step} de 3</Text>
      <View style={styles.track}><View style={[styles.fill, { width: `${(step / 3) * 100}%` }]} /></View>
    </View>
  );
}
