import { useCallback, useRef, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';
import { Modal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../Avatar';
import { AvatarEditor } from '../AvatarEditor';
import { theme } from '../../styles/theme';
import type { AvatarPhotoModalProps } from './AvatarPhotoModal.types';
import { styles } from './styles';

type ActionProps = { label: string; icon: keyof typeof MaterialIcons.glyphMap; kind?: 'edit' | 'remove'; disabled: boolean; onPress: () => void };
function PhotoAction({ label, icon, kind, disabled, onPress }: ActionProps) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => [styles.action, disabled && styles.disabled, pressed && styles.pressed]}>
    <View style={[styles.circle, kind === 'edit' && styles.edit, kind === 'remove' && styles.remove, focused && styles.focused]}><MaterialIcons name={icon} size={24} color={theme.colors.white} accessible={false} /></View>
    <Text style={styles.label}>{label}</Text>
  </Pressable>;
}

export function AvatarPhotoModal(props: AvatarPhotoModalProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [closeFocused, setCloseFocused] = useState(false);
  const [settingsFocused, setSettingsFocused] = useState(false);
  const closeRef = useRef<View>(null);
  const focusClose = useCallback(() => {
    // RN Web's trap can focus a tabindex=-1 backdrop; choose a named control.
    if (Platform.OS === 'web') closeRef.current?.focus();
  }, []);
  const size = Math.max(96, Math.min(360, width - insets.left - insets.right - 2 * theme.spacing.lg - 8, height - insets.top - insets.bottom - 240));
  if (!props.visible) return null;
  function close() {
    if (props.busy) return;
    if (props.source) props.onCancelCrop(); else props.onClose();
  }
  return <Modal visible transparent animationType="none" accessibilityLabel="Foto de perfil" presentationStyle="overFullScreen" onRequestClose={close} onShow={focusClose}>
    <StatusBar style={props.source ? 'dark' : 'light'} />
    {props.source ? <SafeAreaView style={styles.crop}>
      <AvatarEditor key={props.source.uri} source={props.source} busy={props.busy} error={props.error} previewUri={props.previewUri} statusLabel={props.statusLabel} onSave={props.onSave} onCancel={props.onCancelCrop} onChooseAnother={props.onEdit} />
    </SafeAreaView> : <View style={styles.container}>
      <Pressable style={styles.backdrop} accessible={false} focusable={false} tabIndex={-1} disabled={props.busy} onPress={close} />
      <SafeAreaView style={styles.safe} pointerEvents="box-none">
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>Foto de perfil</Text>
          <Pressable ref={closeRef} accessibilityRole="button" accessibilityLabel="Fechar foto de perfil" accessibilityState={{ disabled: props.busy }} disabled={props.busy} onPress={close} onFocus={() => setCloseFocused(true)} onBlur={() => setCloseFocused(false)} style={({ pressed }) => [styles.close, closeFocused && styles.focused, props.busy && styles.disabled, pressed && styles.pressed]}><MaterialIcons name="close" size={24} color={theme.colors.white} accessible={false} /></Pressable>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Pressable style={styles.portrait} accessible={false} focusable={false} tabIndex={-1} disabled={props.busy} onPress={close}>
            <Pressable accessible accessibilityRole="image" accessibilityLabel={'Foto de perfil de ' + props.name} focusable={false} tabIndex={-1} onPress={event => event.stopPropagation()} style={styles.photo}><Avatar name={props.name} url={props.avatar.avatarUrl} version={props.avatar.avatarVersion} size={size} onImageError={props.onImageError} /></Pressable>
            <Text style={styles.name}>{props.name}</Text>
          </Pressable>
          {props.error ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{props.error}</Text> : null}
          {props.busy ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{props.statusLabel || 'Aguarde…'}</Text> : null}
          <View style={styles.actions}>
            <PhotoAction label="Editar foto" icon="edit" kind="edit" disabled={props.busy} onPress={props.onEdit} />
            <PhotoAction label="Tirar foto" icon="photo-camera" disabled={props.busy} onPress={props.onTakePhoto} />
            <PhotoAction label="Remover foto" icon="delete-outline" kind="remove" disabled={props.busy || !props.avatar.avatarUrl} onPress={props.onRemove} />
          </View>
          {props.onOpenSettings ? <Pressable accessibilityRole="button" accessibilityLabel="Abrir ajustes da câmera" disabled={props.busy} onPress={props.onOpenSettings} onFocus={() => setSettingsFocused(true)} onBlur={() => setSettingsFocused(false)} style={[styles.settings, settingsFocused && styles.focused]}><Text style={styles.notice}>Abrir ajustes</Text></Pressable> : null}
        </ScrollView>
      </SafeAreaView>
    </View>}
  </Modal>;
}
