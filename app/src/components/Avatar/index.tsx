import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { styles } from './styles';

type Props = { name: string; url?: string | null; size?: number; version?: number; onImageError?: () => void };
export function Avatar({ name, url, size = 44, version = 0, onImageError }: Props) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size }]}>
      {url && url + ':' + version !== failedImage ? <Image source={{ uri: url }} style={styles.image} onError={() => { setFailedImage(url + ':' + version); onImageError?.(); }} /> : <Text style={[styles.initials, { fontSize: size * 0.34 }]}>{initials || 'MB'}</Text>}
    </View>
  );
}
