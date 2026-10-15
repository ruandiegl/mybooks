import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../styles/useThemedStyles';
import { settingsTitles, type SettingsRoute } from '../../features/settings/settingsTypes';
import type { ProfileSettingsModalProps } from './ProfileSettingsModal.types';
import { createStyles } from './styles';
type Row = { route: SettingsRoute; icon: keyof typeof MaterialIcons.glyphMap };
const groups: { title: string; rows: Row[] }[] = [
  { title: 'CONTA', rows: [{ route: 'editProfile', icon: 'edit' }, { route: 'account', icon: 'person-outline' }] },
  { title: 'PREFERÊNCIAS', rows: [{ route: 'appearance', icon: 'contrast' }, { route: 'notifications', icon: 'notifications-none' }] },
  { title: 'SEGURANÇA', rows: [{ route: 'password', icon: 'lock-outline' }] },
  { title: 'INFORMAÇÕES', rows: [{ route: 'install', icon: 'download' }, { route: 'help', icon: 'help-outline' }, { route: 'about', icon: 'info-outline' }] },
  { title: '', rows: [{ route: 'confirmSignOut', icon: 'logout' }] }
];
export function ProfileSettingsModal(props: ProfileSettingsModalProps) {
  const styles = useThemedStyles(createStyles);
  const { theme, mode } = useAppTheme();
  const [reduced, setReduced] = useState(true);
  const [focused, setFocused] = useState<string | null>(null);
  const close = useRef<View>(null);
  const back = useRef<View>(null);
  useEffect(() => {
    let alive = true, changed = false;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive && !changed) setReduced(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; setReduced(value); });
    return () => { alive = false; subscription?.remove(); };
  }, []);
  function focusStart() { if (Platform.OS === 'web') (props.route === 'menu' ? close : back).current?.focus(); }
  useEffect(() => { if (props.visible && !props.cropping) focusStart(); }, [props.route, props.visible, props.cropping]);
  if (!props.visible) return null;
  return <Modal visible animationType={reduced ? 'none' : 'slide'} accessibilityLabel={settingsTitles[props.route]} onRequestClose={props.onBack} onShow={focusStart}>
    <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    <SafeAreaView style={styles.safe}>
      {props.cropping ? props.children : <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          {props.route !== 'menu' ? <Pressable ref={back} accessibilityRole="button" accessibilityLabel="Voltar às configurações" disabled={props.busy} onPress={props.onBack} onFocus={() => setFocused('back')} onBlur={() => setFocused(null)} style={({ pressed }) => [styles.control, pressed && styles.pressed, focused === 'back' && styles.focused, props.busy && styles.disabled]}><MaterialIcons accessible={false} name="arrow-back" size={24} color={theme.colors.foreground} /></Pressable> : null}
          <Text accessibilityRole="header" style={styles.title}>{settingsTitles[props.route]}</Text>
          <Pressable ref={close} accessibilityRole="button" accessibilityLabel="Fechar configurações" disabled={props.busy} onPress={props.onClose} onFocus={() => setFocused('close')} onBlur={() => setFocused(null)} style={({ pressed }) => [styles.control, pressed && styles.pressed, focused === 'close' && styles.focused, props.busy && styles.disabled]}><MaterialIcons accessible={false} name="close" size={24} color={theme.colors.foreground} /></Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {props.route === 'menu' ? groups.map(group => {
            const rows = group.rows.filter(row => props.available.includes(row.route));
            if (!rows.length) return null;
            return <View style={styles.group} key={group.title}>{group.title ? <Text style={styles.groupTitle}>{group.title}</Text> : null}
              {rows.map(row => <Pressable key={row.route} accessibilityRole="button" accessibilityLabel={settingsTitles[row.route]} disabled={props.busy} onPress={() => props.onRoute(row.route)} onFocus={() => setFocused(row.route)} onBlur={() => setFocused(null)} style={({ pressed }) => [styles.row, pressed && styles.pressed, focused === row.route && styles.focused]}>
                <MaterialIcons accessible={false} name={row.icon} size={24} color={row.route === 'confirmSignOut' ? theme.colors.danger : theme.colors.secondary} />
                <View style={styles.rowCopy}><Text style={[styles.label, row.route === 'confirmSignOut' && styles.danger]}>{settingsTitles[row.route]}</Text>{row.route === 'appearance' ? <Text style={styles.detail}>{props.appearanceLabel || 'Dispositivo'}</Text> : null}</View>
                <MaterialIcons accessible={false} name="chevron-right" size={24} color={theme.colors.mutedForeground} />
              </Pressable>)}
            </View>;
          }) : props.children}
        </ScrollView>
      </KeyboardAvoidingView>}
    </SafeAreaView>
  </Modal>;
}
