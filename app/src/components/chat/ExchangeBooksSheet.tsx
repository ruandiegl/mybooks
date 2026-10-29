import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useRef } from 'react';
import { Animated, Image, Modal, PanResponder, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAvailabilityLabel, getExchangeBookSlots, isExchangeBookSelectable } from '../../features/chat/exchangeBooks';
import type { ExchangeBooks, ExchangeBookSummary } from '../../types/api';
import { useAppTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../styles/useThemedStyles';
import { createStyles } from './ExchangeBooksSheet.styles';

type Props = {
  visible: boolean;
  exchangeBooks: ExchangeBooks | null;
  onClose: () => void;
  onSelectBook: (book: ExchangeBookSummary) => void;
  onCoverError?: () => void;
};

export function ExchangeBooksSheet({ visible, exchangeBooks, onClose, onSelectBook, onCoverError }: Props) {
  const { theme } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(height)).current;
  const closing = useRef(false);

  useEffect(() => {
    if (!visible) return;
    closing.current = false;
    translateY.setValue(height);
    requestAnimationFrame(() => {
      Animated.timing(translateY, { toValue: 0, duration: 240, useNativeDriver: true }).start();
    });
  }, [height, translateY, visible]);

  const dismiss = useCallback((afterClose?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(translateY, { toValue: height, duration: 190, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      onClose();
      afterClose?.();
      closing.current = false;
    });
  }, [height, onClose, translateY]);
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_event, gesture) => translateY.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dy > 88 || gesture.vy > 1.15) dismissRef.current();
      else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    },
    onPanResponderTerminate: () => Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start()
  })).current;

  const slots = getExchangeBookSlots(exchangeBooks);

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={() => dismiss()}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar livros da troca" style={styles.backdrop} onPress={() => dismiss()} />
        <Animated.View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, theme.spacing.md), transform: [{ translateY }] }]}>
          <View style={styles.handleTouch} accessibilityLabel="Arraste para baixo para fechar" {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>Livros da troca</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar livros da troca" onPress={() => dismiss()} style={styles.close}>
              <MaterialIcons name="close" size={22} color={theme.colors.foreground} />
            </Pressable>
          </View>
          <Text style={styles.intro}>Veja os livros que aproximaram vocês. Toque em um livro para abrir os detalhes.</Text>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {slots.map(({ side, label, book }) => (
              <View key={side} style={styles.slot}>
                <Text style={styles.side}>{label}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={book ? `Abrir detalhes de ${book.title}` : `${label}: detalhes indisponíveis`}
                  accessibilityState={{ disabled: !isExchangeBookSelectable(book) }}
                  disabled={!isExchangeBookSelectable(book)}
                  onPress={() => book && dismiss(() => onSelectBook(book))}
                  style={({ pressed }) => [styles.card, !book && styles.disabledCard, pressed && book && { opacity: 0.78 }]}
                >
                  <View style={styles.cover}>
                    {book?.coverUrl ? <Image source={{ uri: book.coverUrl }} style={styles.image} onError={onCoverError} /> : <MaterialIcons name="menu-book" size={28} color={theme.colors.mutedForeground} />}
                  </View>
                  {book ? <View style={styles.copy}>
                    <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
                    <Text style={styles.authors} numberOfLines={2}>{book.authors.join(', ') || 'Autor não informado'}</Text>
                    <Text style={styles.availability}>{getAvailabilityLabel(book.availability)}</Text>
                  </View> : <Text style={styles.unavailable}>Detalhes indisponíveis para esta troca antiga ou para um livro removido.</Text>}
                  {book ? <MaterialIcons name="chevron-right" size={22} color={theme.colors.mutedForeground} /> : null}
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
