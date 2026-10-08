import { useCallback, useEffect, useRef, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';
import { Animated, Modal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../Avatar';
import { AvatarEditor } from '../AvatarEditor';
import { theme } from '../../styles/theme';
import type { AvatarPhotoModalProps } from './AvatarPhotoModal.types';
import { styles } from './styles';
import { useAvatarPhotoMotion } from './useAvatarPhotoMotion';

const AnimatedPhoto = Animated.createAnimatedComponent(Pressable);

type ActionProps = { label: string; icon: keyof typeof MaterialIcons.glyphMap; kind?: 'edit' | 'remove'; disabled: boolean; onPress: () => void; stacked: boolean; maxLabelWidth: number; onLabelOverflow: () => void };
function PhotoAction({ label, icon, kind, disabled, onPress, stacked, maxLabelWidth, onLabelOverflow }: ActionProps) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => [styles.action, stacked && styles.actionRow, disabled && styles.disabled, pressed && styles.pressed]}>
    <View style={[styles.circle, kind === 'edit' && styles.edit, kind === 'remove' && styles.remove, focused && styles.focused]}><MaterialIcons name={icon} size={24} color={theme.colors.white} accessible={false} /></View>
    <Text onLayout={event => { if (!stacked && event.nativeEvent.layout.width > maxLabelWidth + 1) onLabelOverflow(); }} style={[styles.label, stacked && styles.stackedLabel]}>{label}</Text>
  </Pressable>;
}

export function AvatarPhotoModal(props: AvatarPhotoModalProps) {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const motion = useAvatarPhotoMotion(props.visible, props.busy, Boolean(props.source));
  const [closeFocused, setCloseFocused] = useState(false);
  const [settingsFocused, setSettingsFocused] = useState(false);
  const [labelsOverflow, setLabelsOverflow] = useState(false);
  const stackedActions = width < 360 || fontScale >= 1.5 || labelsOverflow;
  const maxLabelWidth = Math.min(112, (width - insets.left - insets.right - 2 * theme.spacing.lg - 2 * theme.spacing.sm) / 3);
  const onLabelOverflow = useCallback(() => setLabelsOverflow(true), []);
  useEffect(() => { if (!props.visible) setLabelsOverflow(false); }, [props.visible]);
  const closeRef = useRef<View>(null);
  const focusClose = useCallback(() => {
    // RN Web's trap can focus a tabindex=-1 backdrop; choose a named control.
    if (Platform.OS === 'web') closeRef.current?.focus();
  }, []);
  const size = Math.max(96, Math.min(360, width - insets.left - insets.right - 2 * theme.spacing.lg - 8, height - insets.top - insets.bottom - 240));
  if (!props.visible) return null;
  function close() {
    if (props.busy) return;
    if (props.source) props.onCancelCrop(); else motion.dismiss(props.onClose);
  }
  const disabled = props.busy || motion.closing;
  return <Modal visible transparent animationType="none" accessibilityLabel="Foto de perfil" presentationStyle="overFullScreen" onRequestClose={close} onShow={() => { focusClose(); motion.open(); }}>
    <StatusBar style={props.source ? 'dark' : 'light'} />
    {props.source ? <SafeAreaView style={styles.crop}>
      <AvatarEditor key={props.source.uri} source={props.source} busy={props.busy} error={props.error} previewUri={props.previewUri} statusLabel={props.statusLabel} onSave={props.onSave} onCancel={props.onCancelCrop} onChooseAnother={props.onEdit} />
    </SafeAreaView> : <View style={styles.container}>
      <Animated.View style={[styles.backdrop, { opacity: motion.backdropOpacity }]}><Pressable style={styles.backdropTarget} accessible={false} focusable={false} tabIndex={-1} disabled={disabled} onPress={close} /></Animated.View>
      <SafeAreaView style={styles.safe} pointerEvents="box-none">
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>Foto de perfil</Text>
          <Pressable ref={closeRef} accessibilityRole="button" accessibilityLabel="Fechar foto de perfil" accessibilityState={{ disabled }} disabled={disabled} onPress={close} onFocus={() => setCloseFocused(true)} onBlur={() => setCloseFocused(false)} style={({ pressed }) => [styles.close, closeFocused && styles.focused, disabled && styles.disabled, pressed && styles.pressed]}><MaterialIcons name="close" size={24} color={theme.colors.white} accessible={false} /></Pressable>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Pressable style={styles.portrait} accessible={false} focusable={false} tabIndex={-1} disabled={disabled} onPress={close}>
            <AnimatedPhoto accessible accessibilityRole="image" accessibilityLabel={'Foto de perfil de ' + props.name} focusable={false} tabIndex={-1} onPress={event => event.stopPropagation()} style={[styles.photo, { opacity: motion.opacity, transform: [{ scale: motion.scale }] }]}><Avatar name={props.name} url={props.avatar.avatarUrl} version={props.avatar.avatarVersion} size={size} onImageError={props.onImageError} suppressBrowserActions /></AnimatedPhoto>
            <Animated.View style={{ opacity: motion.opacity }}><Text style={styles.name}>{props.name}</Text></Animated.View>
          </Pressable>
          {props.error ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{props.error}</Text> : null}
          {props.busy ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{props.statusLabel || 'Aguarde…'}</Text> : null}
          <Animated.View style={[styles.actions, stackedActions && styles.actionsColumn, { opacity: motion.opacity }]}>
            <PhotoAction label="Editar foto" icon="edit" kind="edit" disabled={disabled} onPress={props.onEdit} stacked={stackedActions} maxLabelWidth={maxLabelWidth} onLabelOverflow={onLabelOverflow} />
            <PhotoAction label="Tirar foto" icon="photo-camera" disabled={disabled} onPress={props.onTakePhoto} stacked={stackedActions} maxLabelWidth={maxLabelWidth} onLabelOverflow={onLabelOverflow} />
            <PhotoAction label="Remover foto" icon="delete-outline" kind="remove" disabled={disabled || !props.avatar.avatarUrl} onPress={props.onRemove} stacked={stackedActions} maxLabelWidth={maxLabelWidth} onLabelOverflow={onLabelOverflow} />
          </Animated.View>
          {props.onOpenSettings ? <Pressable accessibilityRole="button" accessibilityLabel="Abrir ajustes da câmera" disabled={disabled} onPress={props.onOpenSettings} onFocus={() => setSettingsFocused(true)} onBlur={() => setSettingsFocused(false)} style={[styles.settings, settingsFocused && styles.focused]}><Text style={styles.notice}>Abrir ajustes</Text></Pressable> : null}
        </ScrollView>
      </SafeAreaView>
    </View>}
  </Modal>;
}
