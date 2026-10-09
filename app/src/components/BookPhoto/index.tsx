import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLayoutEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { MediaBinding, MediaDescriptor } from '../../features/media/mediaTypes';
import { theme } from '../../styles/theme';
import { RemoteMediaImage } from '../RemoteMediaImage';
import { styles } from './styles';

type Props = { media?: MediaDescriptor | null; binding?: MediaBinding; title: string; label: string; compact?: boolean; hasPhoto?: boolean; fit?: 'cover' | 'contain'; retryToken?: number; onImageError?: () => void; fallback?: ReactNode };
export function BookPhoto({ media = null, binding, title, label, compact = false, hasPhoto = false, fit = 'contain', retryToken, onImageError, fallback }: Props) {
  const [ready, setReady] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useLayoutEffect(() => { setReady(null); setFailed(null); }, [media?.identity]);
  const unavailable = Boolean(media || hasPhoto);
  const loadFailed = failed === media?.identity || (unavailable && !media?.url);
  return (
    <View style={{ flex: 1, width: '100%', height: '100%' }}>
      {ready !== media?.identity ? fallback ?? <View style={styles.fallback} accessible accessibilityLabel={unavailable ? loadFailed ? `${label}. Não foi possível carregar a foto.` : `${label}. Carregando foto.` : `${title}. Sem foto cadastrada.`}>
        <MaterialIcons name="menu-book" size={compact ? 24 : 48} color={theme.colors.secondary} accessible={false} />
        {!compact ? <><Text style={styles.title} numberOfLines={3}>{title}</Text><Text style={styles.message}>{unavailable ? loadFailed ? 'Foto indisponível no momento' : 'Carregando foto…' : 'Sem foto cadastrada'}</Text></> : null}
      </View> : null}
      {media && binding?.scope ? <RemoteMediaImage media={media} scope={binding.scope} getScope={binding.getScope} pixelBucket={compact ? 256 : 1024} fit={fit} transitionMs={binding.transitionMs} retryToken={retryToken} style={[styles.image, StyleSheet.absoluteFill]} accessibilityLabel={label} onReady={() => setReady(media.identity)} onError={() => { setFailed(media.identity); onImageError?.(); }} /> : null}
    </View>
  );
}
