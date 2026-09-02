import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';
import { theme } from '../../styles/theme';
import { styles } from './styles';

type Props = { onEdit: () => void };

export function ProfileHero({ onEdit }: Props) {
  return (
    <LinearGradient
      colors={[theme.colors.profileHeroStart, theme.colors.profileHeroEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View pointerEvents="none" style={styles.pattern}>
        <MaterialIcons name="auto-stories" size={188} style={styles.bookIcon} />
        <View style={styles.lineOne} />
        <View style={styles.lineTwo} />
      </View>
      <View style={styles.topRow}>
        <View style={styles.brandLockup}>
          <Text style={styles.brand}>mybooks.</Text>
          <Text style={styles.meta}>perfil de leitor</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Editar perfil"
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          onPress={onEdit}
        >
          <MaterialIcons name="edit" size={21} color={theme.colors.white} />
        </Pressable>
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>Seu capítulo atual</Text>
        <Text style={styles.title}>Tudo o que você lê, em circulação.</Text>
      </View>
      <View pointerEvents="none" style={styles.bookmark} />
    </LinearGradient>
  );
}
