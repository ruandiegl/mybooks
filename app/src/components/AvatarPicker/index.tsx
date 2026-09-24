import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { api, apiErrorMessage } from '../../services/api';
import { theme } from '../../styles/theme';
import type { ApiEnvelope } from '../../types/api';
import { styles } from './styles';

type MimeType = 'image/jpeg' | 'image/png' | 'image/webp';
type Presign = { imageId: string; uploadUrl: string; storageKey: string; headers: Record<string, string> };

const allowed = (value?: string): value is MimeType => value === 'image/jpeg' || value === 'image/png' || value === 'image/webp';

export function AvatarPicker({ avatarUrl, name, onUploaded }: { avatarUrl?: string | null; name: string; onUploaded: (url: string | null) => void }) {
  const [loading, setLoading] = useState(false);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'TL';

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.82 });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.fileSize || !allowed(asset.mimeType) || asset.fileSize > 8 * 1024 * 1024) {
      Alert.alert('Foto inválida', 'Escolha uma imagem JPEG, PNG ou WebP de até 8 MB.');
      return;
    }

    setLoading(true);
    try {
      const presign = (await api.post<ApiEnvelope<Presign>>('/api/v1/me/avatar/presign', { mimeType: asset.mimeType, size: asset.fileSize })).data.data;
      const blob = await (await fetch(asset.uri)).blob();
      const upload = await fetch(presign.uploadUrl, { method: 'PUT', headers: presign.headers, body: blob });
      if (!upload.ok) throw new Error('Falha no envio da foto.');
      const completed = (await api.post<ApiEnvelope<{ avatarUrl: string }>>('/api/v1/me/avatar/complete', {
        imageId: presign.imageId,
        storageKey: presign.storageKey,
        mimeType: asset.mimeType,
        size: asset.fileSize
      })).data.data;
      onUploaded(completed.avatarUrl);
    } catch (error) {
      Alert.alert('Não foi possível enviar a foto', apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    setLoading(true);
    try {
      await api.delete('/api/v1/me/avatar');
      onUploaded(null);
    } catch (error) {
      Alert.alert('Não foi possível remover a foto', apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Pressable accessibilityRole="button" accessibilityLabel="Escolher foto de perfil" disabled={loading} onPress={pick} style={styles.avatar}>
        {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.image} /> : <Text style={styles.initials}>{initials}</Text>}
        <View style={styles.edit}><MaterialIcons name="photo-camera" size={16} color={theme.colors.white} /></View>
      </Pressable>
      <Text style={styles.help}>{loading ? 'Enviando foto...' : 'JPEG, PNG ou WebP de até 8 MB'}</Text>
      {avatarUrl ? <Pressable accessibilityRole="button" disabled={loading} onPress={remove}><Text style={styles.remove}>Remover foto</Text></Pressable> : null}
    </View>
  );
}
