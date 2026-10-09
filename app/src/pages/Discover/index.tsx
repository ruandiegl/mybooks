import { useIsFocused } from '@react-navigation/native';
import { useAvatarRefresh } from '../../features/avatar/useAvatarRefresh';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
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
import { useSession, type SessionScope } from '../../providers/SessionProvider';
import { useDiscoverCardMotion, type DiscoverAction } from './useDiscoverCardMotion';

type InteractionResult = { interaction: { id: string }; match?: Match | null };
type InteractionInput = { targetBookId: string; action: DiscoverAction; runId: number; scope: SessionScope };
type InteractionRun = { id: number; ownerId: string | undefined; book: Book; exit: Promise<void> };

export function Discover() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const focused = useIsFocused();
  const { user, getSessionScope } = useSession();
  const owner = useRef(user?.id); owner.current = user?.id;
  const alive = useRef(true), sequence = useRef(0), run = useRef<InteractionRun | null>(null);
  const [outgoingBook, setOutgoingBook] = useState<Book | null>(null);
  const entrancePending = useRef(false);
  const motion = useDiscoverCardMotion(focused, width, height);
  const { pan } = motion;
  const queryKey = ['books', 'discover'] as const;
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: '',
    queryFn: async ({ pageParam }) => (await api.get<ApiEnvelope<Paginated<Book>>>('/api/v1/discover', { params: { limit: 20, cursor: pageParam || undefined } })).data.data,
    getNextPageParam: (lastPage) => lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.nextCursor || undefined : undefined
  });
  const refreshAvatar = useAvatarRefresh(query.data, query.refetch, focused);

  const books = query.data?.pages.flatMap((page) => page.items) || [];
  const book = outgoingBook || books[0];
  const photos = book ? getBookGalleryPhotos(book) : [];

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; run.current = null; };
  }, []);
  useLayoutEffect(() => { run.current = null; entrancePending.current = false; setOutgoingBook(null); motion.reset(); }, [user?.id, motion.reset]);
  useLayoutEffect(() => {
    if (!outgoingBook && book && entrancePending.current) { entrancePending.current = false; motion.enter(); }
  }, [book?.id, outgoingBook, motion.enter]);
  const sameScope = (input: InteractionInput) => { const scope = getSessionScope(); return scope.userId === input.scope.userId && scope.epoch === input.scope.epoch; };
  const owns = (input: InteractionInput) => alive.current && run.current?.id === input.runId && run.current.ownerId === owner.current && sameScope(input);
  function invalidateConfirmed() {
    for (const queryKey of [['books', 'discover'], ['likes'], ['matches'], ['conversations']]) void queryClient.invalidateQueries({ queryKey });
  }

  const mutation = useMutation({
    mutationFn: async ({ targetBookId, action }: InteractionInput) => (await api.post<ApiEnvelope<InteractionResult>>('/api/v1/interactions', { targetBookId, action, clientActionId: Crypto.randomUUID() })).data.data,
    onSuccess: async (data, input) => {
      if (!sameScope(input)) return;
      if (!owns(input)) { invalidateConfirmed(); return; }
      await run.current!.exit;
      if (!sameScope(input)) return;
      if (!owns(input)) { invalidateConfirmed(); return; }
      motion.prepareNext(); entrancePending.current = true;
      queryClient.setQueryData<InfiniteData<Paginated<Book>, string>>(queryKey, (old) => old ? { ...old, pages: old.pages.map((page) => ({ ...page, items: page.items.filter((item) => item.id !== input.targetBookId) })) } : old);
      run.current = null; setOutgoingBook(null);
      if (data.match) Alert.alert('Deu match!', 'Vocês gostaram dos livros um do outro. A conversa já está disponível.');
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['likes'] });
      if (books.length <= 1) void query.refetch();
    },
    onError: (error, input) => {
      if (!owns(input)) return;
      // Keep the retry on the same live book; never recreate one removed by a refetch.
      queryClient.setQueryData<InfiniteData<Paginated<Book>, string>>(queryKey, old => {
        const failed = old?.pages.flatMap(page => page.items).find(item => item.id === input.targetBookId);
        if (!old || !failed) return old;
        const pages = old.pages.map(page => ({ ...page, items: page.items.filter(item => item.id !== failed.id) }));
        pages[0] = { ...pages[0], items: [failed, ...pages[0].items] };
        return { ...old, pages };
      });
      run.current = null; setOutgoingBook(null); entrancePending.current = false; motion.returnCard();
      Alert.alert('A ação não foi salva', apiErrorMessage(error, 'O livro continua na fila. Tente novamente.'));
    }
  });

  const busy = Boolean(outgoingBook) || mutation.isPending;
  function interact(action: DiscoverAction) {
    if (!book || !user?.id || run.current || mutation.isPending || !focused) return;
    const scope = getSessionScope(); if (scope.userId !== user.id) return;
    const current = { id: ++sequence.current, ownerId: owner.current, book, exit: motion.exit(action) };
    run.current = current; setOutgoingBook(book);
    mutation.mutate({ targetBookId: book.id, action, runId: current.id, scope });
  }

  useEffect(() => {
    if (books.length < 5 && query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  }, [books.length, query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => focused && !busy && !run.current && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderMove: (_, gesture) => { if (!run.current && motion.canMove()) pan.setValue({ x: gesture.dx, y: gesture.dy }); },
    onPanResponderRelease: (_, gesture) => {
      if (run.current || mutation.isPending) return;
      if (gesture.dx > 82) interact('LIKE');
      else if (gesture.dx < -82) interact('PASS');
      else motion.reset();
    },
    onPanResponderTerminate: () => { if (!run.current) motion.reset(); }
  }), [mutation, pan, focused, busy, motion]);
  const cardStyle = { opacity: motion.opacity, transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate: pan.x.interpolate({ inputRange: [-180, 0, 180], outputRange: ['-7deg', '0deg', '7deg'], extrapolate: 'clamp' }) }] };

  return (
    <AppScreen>
      <TopBar eyebrow="Trocas possíveis" title="Descobrir" />
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        {query.isLoading && !outgoingBook ? <StateView loading title="Buscando novas histórias" /> : query.isError && !outgoingBook ? <StateView title="A descoberta falhou" icon="cloud-off" actionLabel="Tentar novamente" onAction={() => query.refetch()} /> : !book ? <StateView title="Você chegou ao fim por agora" description="Novos livros aparecem aqui quando outros leitores publicam." icon="done-all" actionLabel="Atualizar" onAction={() => query.refetch()} /> : <>
          <View style={styles.deck}>
            {outgoingBook && motion.exited ? <View style={styles.saving}><ActivityIndicator color={theme.colors.primary} /><Text style={styles.savingText} accessibilityLiveRegion="polite">Salvando sua escolha…</Text></View> : null}
            <Animated.View style={[styles.gesture, landscape && styles.gestureLandscape, cardStyle]} {...panResponder.panHandlers}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ver ${book.title}, de ${book.authors.join(', ') || 'autor não informado'}. Livro de ${book.owner?.name || 'Leitor TrocaLivros'}`}
                accessibilityHint="Abre todas as fotos e informações do livro, sem curtir nem dispensar."
                accessibilityState={{ disabled: busy }}
                disabled={busy}
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
            {motion.action ? <Animated.View testID={motion.action === 'LIKE' ? 'discover-like-feedback' : 'discover-pass-feedback'} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.feedback, { opacity: motion.feedbackOpacity, transform: [{ translateX: motion.feedbackTranslateX }] }]}><MaterialIcons name={motion.action === 'LIKE' ? 'favorite' : 'close'} color={theme.colors.white} size={96} style={styles.feedbackIcon} accessible={false} /></Animated.View> : null}
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Passar livro" accessibilityState={{ disabled: busy }} disabled={busy} style={({ pressed }) => [styles.action, busy && styles.disabled, pressed && !busy && styles.pressed]} onPress={() => interact('PASS')}><MaterialIcons name="close" size={30} color={theme.colors.mutedForeground} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Gostei do livro" accessibilityState={{ disabled: busy }} disabled={busy} style={({ pressed }) => [styles.action, styles.like, busy && styles.disabled, pressed && !busy && styles.likePressed]} onPress={() => interact('LIKE')}><MaterialIcons name="favorite" size={29} color={theme.colors.white} /></Pressable>
          </View>
        </>}
      </ScrollView>
    </AppScreen>
  );
}
