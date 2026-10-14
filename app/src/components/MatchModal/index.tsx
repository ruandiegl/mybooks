import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../AppButton';
import { useAppTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../styles/useThemedStyles';
import { createStyles } from './styles';

type Props = { visible: boolean; reduceMotion: boolean; otherUserName?: string; onClose: () => void; onMessages: () => void };

export function MatchModal({ visible, reduceMotion, otherUserName, onClose, onMessages }: Props) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [focusedControl, setFocusedControl] = useState<string | null>(null);
  const closeControl = useRef<View>(null);
  const close = useRef(onClose); close.current = onClose;
  const dragY = useRef(new Animated.Value(0)).current;

  const focusClose = () => { if (Platform.OS === 'web') closeControl.current?.focus(); };
  useEffect(() => {
    if (!visible) return;
    dragY.setValue(0);
    if (Platform.OS !== 'web') return;
    const frame = requestAnimationFrame(focusClose);
    return () => cancelAnimationFrame(frame);
  }, [dragY, visible]);

  const panResponder = useMemo(() => {
    const restore = () => {
      if (reduceMotion) dragY.setValue(0);
      else Animated.spring(dragY, { toValue: 0, useNativeDriver: true, tension: 90, friction: 15 }).start();
    };
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_event, gesture) => dragY.setValue(Math.max(0, gesture.dy)),
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy >= 120 || (gesture.dy >= 24 && gesture.vy >= 1.1)) close.current();
        else restore();
      },
      onPanResponderTerminate: restore,
    });
  }, [dragY, reduceMotion]);

  return <Modal visible={visible} accessibilityLabel="Deu match!" transparent animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose} onShow={focusClose} statusBarTranslucent>
    <View style={[styles.backdrop, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      <Pressable testID="match-sheet-backdrop" accessible={false} focusable={false} importantForAccessibility="no-hide-descendants" style={styles.outside} onPress={onClose} />
      <Animated.View testID="match-sheet" accessibilityViewIsModal style={[styles.sheet, { maxHeight: Math.max(0, height - insets.top - theme.spacing.xs), transform: [{ translateY: dragY }] }]}>
        <View {...panResponder.panHandlers} style={styles.handleArea} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><View style={styles.handle} /></View>
        <View style={styles.header}>
          <View style={styles.icon}><MaterialIcons name="favorite" size={25} color={theme.colors.primary} accessible={false} /></View>
          <Pressable ref={closeControl} accessibilityRole="button" accessibilityLabel="Fechar aviso de match" onPress={onClose} onFocus={() => setFocusedControl('close')} onBlur={() => setFocusedControl(null)} style={({ pressed }) => [styles.close, focusedControl === 'close' && styles.focused, pressed && styles.pressed]}>
            <MaterialIcons name="close" size={24} color={theme.colors.mutedForeground} accessible={false} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]} showsVerticalScrollIndicator={false}>
          <Text accessibilityRole="header" style={styles.title}>Deu match!</Text>
          <Text style={styles.description}>{otherUserName ? 'Você e ' + otherUserName + ' curtiram os livros um do outro.' : 'Vocês curtiram os livros um do outro.'} A conversa já está disponível.</Text>
          <View style={styles.actions}>
            <AppButton label="Ir para Mensagens" icon="chat-bubble-outline" onPress={onMessages} onFocus={() => setFocusedControl('messages')} onBlur={() => setFocusedControl(null)} style={focusedControl === 'messages' && styles.focused} />
            <AppButton label="Continuar" variant="ghost" onPress={onClose} onFocus={() => setFocusedControl('continue')} onBlur={() => setFocusedControl(null)} style={focusedControl === 'continue' && styles.focused} />
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  </Modal>;
}
