import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { theme } from '../../styles/theme';
import { styles } from './styles';

type Props = { url?: string | null; title: string; label: string; compact?: boolean; hasPhoto?: boolean };

export function BookPhoto({ url, title, label, compact = false, hasPhoto = false }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (url && url !== failedUrl) {
    return <Image source={{ uri: url }} accessibilityLabel={label} resizeMode="contain" style={styles.image} onError={() => setFailedUrl(url)} />;
  }
  return (
    <View style={styles.fallback} accessible accessibilityLabel={url || hasPhoto ? `${label}. Não foi possível carregar a foto.` : `${title}. Sem foto cadastrada.`}>
      <MaterialIcons name="menu-book" size={compact ? 24 : 48} color={theme.colors.secondary} accessible={false} />
      {!compact ? <><Text style={styles.title} numberOfLines={3}>{title}</Text><Text style={styles.message}>{url || hasPhoto ? 'Foto indisponível no momento' : 'Sem foto cadastrada'}</Text></> : null}
    </View>
  );
}
