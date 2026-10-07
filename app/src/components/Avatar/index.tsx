import { useState } from 'react';
import { Image, Platform, Text, View } from 'react-native';
import { styles } from './styles';

type Props = { name: string; url?: string | null; size?: number; version?: number; onImageError?: () => void; suppressBrowserActions?: boolean };
function preventBrowserAction(event: { preventDefault(): void }) { event.preventDefault(); }
export function Avatar({ name, url, size = 44, version = 0, onImageError, suppressBrowserActions = false }: Props) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const guardBrowserImage = suppressBrowserActions && Platform.OS === 'web';
  // Scope Safari callouts to own-avatar surfaces; never cancel touch/pinch events.
  const browserHandlers = guardBrowserImage ? { onContextMenu: preventBrowserAction } : {};
  return (
    <View {...browserHandlers} style={[styles.avatar, { width: size, height: size }, guardBrowserImage && styles.browserGuard]}>
      {url && url + ':' + version !== failedImage ? <Image source={{ uri: url }} style={[styles.image, guardBrowserImage && styles.guardedImage]} onError={() => { setFailedImage(url + ':' + version); onImageError?.(); }} /> : <Text style={[styles.initials, { fontSize: size * 0.34 }]}>{initials || 'MB'}</Text>}
    </View>
  );
}
