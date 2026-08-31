import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Animated, Image, PanResponder, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { Card } from '../../components/Card';
import { IsbnBadge } from '../../components/IsbnBadge';
import { StateView } from '../../components/StateView';
import { TopBar } from '../../components/TopBar';
import { api, apiErrorMessage } from '../../services/api';
import { theme } from '../../styles/theme';
import type { ApiEnvelope, Book, Match, Paginated } from '../../types/api';
import { styles } from './styles';

type InteractionResult = { interaction: { id: string }; match?: Match | null };

export function Discover() {
  const queryClient = useQueryClient();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const coverHeight = landscape ? Math.max(150, Math.min(250, height - 190)) : Math.min(width * 1.12, 490);
  const pan = useRef(new Animated.ValueXY()).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const queryKey = ['books', 'discover'] as const;
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: '',
    queryFn: async ({ pageParam }) => (await api.get<ApiEnvelope<Paginated<Book>>>('/api/v1/discover', { params: { limit: 20, cursor: pageParam || undefined } })).data.data,
    getNextPageParam: (lastPage) => lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.nextCursor || undefined : undefined
  });
  const books = query.data?.pages.flatMap((page) => page.items) || [];
  const book = books[0];

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  function resetCard() {
    if (reduceMotion) pan.setValue({ x: 0, y: 0 });
    else Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
  }

  const mutation = useMutation({
    mutationFn: async (action: 'LIKE' | 'PASS') => (await api.post<ApiEnvelope<InteractionResult>>('/api/v1/interactions', { targetBookId: book?.id, action, clientActionId: Crypto.randomUUID() })).data.data,
    onSuccess: (data) => {
      queryClient.setQueryData<InfiniteData<Paginated<Book>, string>>(queryKey, (old) => old ? { ...old, pages: old.pages.map((page) => ({ ...page, items: page.items.filter((item) => item.id !== book?.id) })) } : old);
      pan.setValue({ x: 0, y: 0 });
      if (data.match) Alert.alert('Deu match!', 'Vocês gostaram dos livros um do outro. A conversa já está disponível.');
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
    onError: (error) => {
      resetCard();
      Alert.alert('A ação não foi salva', apiErrorMessage(error, 'O livro continua na fila. Tente novamente.'));
    }
  });

  useEffect(() => {
    if (books.length < 5 && query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  }, [books.length, query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, gesture) => {
      if (mutation.isPending) return;
      if (gesture.dx > 82) mutation.mutate('LIKE');
      else if (gesture.dx < -82) mutation.mutate('PASS');
      else resetCard();
    }
  }), [mutation, pan, reduceMotion]);
  const cardStyle = { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate: pan.x.interpolate({ inputRange: [-180, 0, 180], outputRange: ['-7deg', '0deg', '7deg'] }) }] };

  return (
    <AppScreen>
      <TopBar eyebrow="Trocas possíveis" title="Descobrir" />
      <View style={styles.body}>
        {query.isLoading ? <StateView loading title="Buscando novas histórias" /> : query.isError ? <StateView title="A descoberta falhou" icon="cloud-off" actionLabel="Tentar novamente" onAction={() => query.refetch()} /> : !book ? <StateView title="Você chegou ao fim por agora" description="Novos livros aparecem aqui quando outros leitores publicam." icon="done-all" actionLabel="Atualizar" onAction={() => query.refetch()} /> : <>
          <View style={styles.deck}>
            <Animated.View style={[styles.gesture, cardStyle]} {...panResponder.panHandlers}>
              <Card style={[styles.card, landscape && styles.cardLandscape]}>
                <View style={[styles.cover, landscape && styles.coverLandscape, { height: coverHeight }]}>
                  {book.coverUrl ? <Image source={{ uri: book.coverUrl }} accessibilityLabel={'Capa de ' + book.title} style={styles.image} /> : <View style={styles.fallback}><Text style={styles.fallbackText}>{book.title}</Text></View>}
                  {book.hasIsbnBadge ? <View style={styles.badge}><IsbnBadge /></View> : null}
                </View>
                <View style={[styles.details, landscape && styles.detailsLandscape]}>
                  <Text style={styles.title}>{book.title}</Text>
                  <Text style={styles.author}>{book.authors.join(', ') || 'Autor não informado'}</Text>
                  <Text style={styles.owner}>{book.owner?.name || 'Leitor MyBooks'}{book.owner?.city ? ' · ' + book.owner.city : ''}</Text>
                </View>
              </Card>
            </Animated.View>
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Passar livro" accessibilityState={{ disabled: mutation.isPending }} disabled={mutation.isPending} style={({ pressed }) => [styles.action, mutation.isPending && styles.disabled, pressed && !mutation.isPending && styles.pressed]} onPress={() => mutation.mutate('PASS')}><MaterialIcons name="close" size={30} color={theme.colors.mutedForeground} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Gostei do livro" accessibilityState={{ disabled: mutation.isPending }} disabled={mutation.isPending} style={({ pressed }) => [styles.action, styles.like, mutation.isPending && styles.disabled, pressed && !mutation.isPending && styles.likePressed]} onPress={() => mutation.mutate('LIKE')}><MaterialIcons name="favorite" size={29} color={theme.colors.white} /></Pressable>
          </View>
        </>}
      </View>
    </AppScreen>
  );
}
