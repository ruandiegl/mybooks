import { useState } from 'react';
import { PixelRatio, Platform, StyleSheet, Text, View } from 'react-native';
import { createAvatarMedia, getMediaPixelBucket } from '../../features/media/mediaIdentity';
import type { MediaBinding } from '../../features/media/mediaTypes';
import { RemoteMediaImage } from '../RemoteMediaImage';
import { styles } from './styles';

type Props = { subjectId: string | null; binding?: MediaBinding; decorative?: boolean; name: string; url?: string | null; size?: number; version?: number; onImageError?: () => void; suppressBrowserActions?: boolean };
function preventBrowserAction(event: { preventDefault(): void }) { event.preventDefault(); }
export function Avatar({ subjectId, binding, decorative = false, name, url, size = 44, version, onImageError, suppressBrowserActions = false }: Props) {
  const [ready, setReady] = useState<string | null>(null);
  const media = binding?.scope && subjectId ? createAvatarMedia(binding.scope, subjectId, { avatarUrl: url, avatarVersion: version }) : null;
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const guard = suppressBrowserActions && Platform.OS === 'web';
  return (
    <View {...(guard ? { onContextMenu: preventBrowserAction } : {})} style={[styles.avatar, { width: size, height: size }, guard && styles.browserGuard]}>
      {ready !== media?.identity ? <Text style={[styles.initials, { fontSize: size * 0.34 }]}>{initials || 'MB'}</Text> : null}
      {media && binding?.scope ? <RemoteMediaImage media={media} scope={binding.scope} getScope={binding.getScope} pixelBucket={getMediaPixelBucket(size, PixelRatio.get())} fit="cover" transitionMs={binding.transitionMs} accessibilityLabel={decorative ? undefined : 'Foto de perfil de ' + name} style={[styles.image, StyleSheet.absoluteFill, guard && styles.guardedImage]} onReady={() => setReady(media.identity)} onError={onImageError} /> : null}
    </View>
  );
}
