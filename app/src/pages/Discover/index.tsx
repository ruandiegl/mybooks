import { useIsFocused } from '@react-navigation/native';
import { useAvatarRefresh } from '../../features/avatar/useAvatarRefresh';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, PanResponder, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { Avatar } from '../../components/Avatar';
import { BookPhoto } from '../../components/BookPhoto';
import { Card } from '../../components/Card';
import { IsbnBadge } from '../../components/IsbnBadge';
import { StateView } from '../../components/StateView';
import { TopBar } from '../../components/TopBar';
import { getBookGalleryPhotos } from '../../features/books/bookPresentation';
import { api, apiErrorMessage } from '../../services/api';
import { Alert } from '../../services/notice';
import { theme } from '../../styles/theme';
import type { ApiEnvelope, Book, Match, Paginated } from '../../types/api';
import type { RootStackParamList } from '../../types/navigation';
import { styles } from './styles';

type InteractionResult = { interaction: { id: string }; match?: Match | null };

export function Discover() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const pan = useRef(new Animated.ValueXY()).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const queryKey = ['books', 'discover'] as const;
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: '',
    queryFn: async ({ pageParam }) => (await api.get<ApiEnvelope<Paginated<Book>>>('/api/v1/discover', { params: { limit: 20, cursor: pageParam || undefined } })).data.data,
    getNextPageParam: (lastPage) => lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.nextCursor || undefined : undefined
  });
  const refreshAvatar = useAvatarRefresh(query.data, query.refetch, useIsFocused());

  const books = query.data?.pages.flatMap((page) => page.items) || [];
  const book = books[0];
  const photos = book ? getBookGalleryPhotos(book) : [];

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
      if (books.length <= 1) void query.refetch();
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
    onMoveShouldSetPanResponder: (_, gesture) => !mutation.isPending && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, gesture) => {
      if (mutation.isPending) return;
      if (gesture.dx > 82) mutation.mutate('LIKE');
      else if (gesture.dx < -82) mutation.mutate('PASS');
      else resetCard();
    },
    onPanResponderTerminate: resetCard
  }), [mutation, pan, reduceMotion]);
  const cardStyle = { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate: pan.x.interpolate({ inputRange: [-180, 0, 180], outputRange: ['-7deg', '0deg', '7deg'] }) }] };

  return (
    <AppScreen>
      <TopBar eyebrow="Trocas possíveis" title="Descobrir" />
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        {query.isLoading ? <StateView loading title="Buscando novas histórias" /> : query.isError ? <StateView title="A descoberta falhou" icon="cloud-off" actionLabel="Tentar novamente" onAction={() => query.refetch()} /> : !book ? <StateView title="Você chegou ao fim por agora" description="Novos livros aparecem aqui quando outros leitores publicam." icon="done-all" actionLabel="Atualizar" onAction={() => query.refetch()} /> : <>
          <View style={styles.deck}>
            <Animated.View style={[styles.gesture, landscape && styles.gestureLandscape, cardStyle]} {...panResponder.panHandlers}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ver ${book.title}, de ${book.authors.join(', ') || 'autor não informado'}. Livro de ${book.owner?.name || 'Leitor TrocaLivros'}`}
                accessibilityHint="Abre todas as fotos e informações do livro, sem curtir nem dispensar."
                accessibilityState={{ disabled: mutation.isPending }}
                disabled={mutation.isPending}
                onPress={() => navigation.navigate('BookDetails', { bookId: book.id })}
                style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}
              >
                <Card style={styles.card}>
                  <View style={styles.ownerRow}>
                    <Avatar name={book.owner?.name || 'Leitor TrocaLivros'} url={book.owner?.avatarUrl} version={book.owner?.avatarVersion} onImageError={refreshAvatar} size={44} />
                    <View style={styles.ownerInfo}>
                      <Text style={styles.ownerName} numberOfLines={1}>{book.owner?.name || 'Leitor TrocaLivros'}</Text>
                      <Text style={styles.ownerCity} numberOfLines={1}>{book.owner?.city || 'Livro em circulação'}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color={theme.colors.primary} accessible={false} />
                  </View>
                  <View style={[styles.cardContent, landscape && styles.cardLandscape]}>
                    <View style={[styles.cover, landscape && styles.coverLandscape]}>
                      <BookPhoto key={book.id + (photos[0]?.url ?? '') + query.dataUpdatedAt} url={photos[0]?.url} hasPhoto={Boolean(photos[0])} title={book.title} label={`Capa de ${book.title}`} />
                      {book.hasIsbnBadge ? <View style={styles.badge}><IsbnBadge /></View> : null}
                      {photos.length > 1 ? <View style={styles.photoCount}><MaterialIcons name="photo-library" size={16} color={theme.colors.foreground} accessible={false} /><Text style={styles.photoCountText}>{photos.length} fotos</Text></View> : null}
                    </View>
                    <View style={[styles.details, landscape && styles.detailsLandscape]}>
                      <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
                      <Text style={styles.author} numberOfLines={2}>{book.authors.join(', ') || 'Autor não informado'}</Text>
                      <View style={styles.viewHint}><Text style={styles.viewHintText}>Ver livro e fotos</Text><MaterialIcons name="arrow-forward" size={18} color={theme.colors.primary} accessible={false} /></View>
                    </View>
                  </View>
                </Card>
              </Pressable>
            </Animated.View>
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Passar livro" accessibilityState={{ disabled: mutation.isPending }} disabled={mutation.isPending} style={({ pressed }) => [styles.action, mutation.isPending && styles.disabled, pressed && !mutation.isPending && styles.pressed]} onPress={() => mutation.mutate('PASS')}><MaterialIcons name="close" size={30} color={theme.colors.mutedForeground} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Gostei do livro" accessibilityState={{ disabled: mutation.isPending }} disabled={mutation.isPending} style={({ pressed }) => [styles.action, styles.like, mutation.isPending && styles.disabled, pressed && !mutation.isPending && styles.likePressed]} onPress={() => mutation.mutate('LIKE')}><MaterialIcons name="favorite" size={29} color={theme.colors.white} /></Pressable>
          </View>
        </>}
      </ScrollView>
    </AppScreen>
  );
}
