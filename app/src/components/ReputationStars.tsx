import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';
import { useAppTheme } from '../providers/ThemeProvider';

export function ReputationStars({ stars }: { stars: number }) {
  const { theme } = useAppTheme();
  return <View accessible accessibilityLabel={`Reputação ${stars.toFixed(1).replace('.', ',')} de 5 estrelas`} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
    {Array.from({ length: 5 }, (_, index) => {
      const remaining = stars - index;
      const name = remaining >= 0.75 ? 'star' : remaining >= 0.25 ? 'star-half' : 'star-border';
      return <MaterialIcons key={index} accessible={false} name={name} size={21} color={theme.colors.secondary} />;
    })}
    <Text style={{ color: theme.colors.foreground, fontFamily: theme.typography.semibold, marginLeft: 5 }}>{stars.toFixed(1).replace('.', ',')}</Text>
  </View>;
}
