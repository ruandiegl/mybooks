import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { styles } from './styles';

type Props = { name: string; url?: string | null; size?: number };
export function Avatar({ name, url, size = 44 }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size }]}>
      {url && url !== failedUrl ? <Image source={{ uri: url }} style={styles.image} onError={() => setFailedUrl(url)} /> : <Text style={[styles.initials, { fontSize: size * 0.34 }]}>{initials || 'MB'}</Text>}
    </View>
  );
}
