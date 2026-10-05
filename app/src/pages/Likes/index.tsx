import { useIsFocused } from '@react-navigation/native';
import { useAvatarRefresh } from '../../features/avatar/useAvatarRefresh';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Alert } from '../../services/notice';
import { AppScreen } from '../../components/AppScreen';
import { Badge } from '../../components/Badge';
import { LikeCard } from '../../components/LikeCard';
import { StateView } from '../../components/StateView';
import { ToggleGroup } from '../../components/ToggleGroup';
import { TopBar } from '../../components/TopBar';
import { api, apiErrorMessage } from '../../services/api';
import type { ApiEnvelope, Match, Paginated } from '../../types/api';
import { likesApi } from '../../features/likes/likesApi';
import type { LikeBook, ReceivedLike, SentLike } from '../../types/likes';
import { theme } from '../../styles/theme';
import { PremiumLikesGate } from '../../features/premium/PremiumLikesGate';
import { usePremiumOffer } from '../../features/premium/PremiumOfferProvider';
import { canSeeReceivedLikeIdentities } from '../../features/premium/premiumEntitlements';
import { usePremiumStatus } from '../../features/premium/usePremiumStatus';
import { useSession } from '../../providers/SessionProvider';
import { styles } from './styles';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from '../../types/navigation';
import { getLikesViewState } from './likesViewState';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Likes'>, NativeStackScreenProps<RootStackParamList, 'Main'>>;

type TabType = 'received' | 'sent';
type SortType = 'desc' | 'asc';

export function Likes({ navigation }: Props) {
  const queryClient = useQueryClient();
  const session = useSession();
  const premiumStatusQuery = usePremiumStatus(session.user?.id, session.isSignedIn);
  const premiumOffer = usePremiumOffer();
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [sort, setSort] = useState<SortType>('desc');
  const [selectedBookId, setSelectedBookId] = useState<string | undefined>();

  // Count Query
  const { data: countData } = useQuery({
    queryKey: ['likes', 'received', 'count'],
    queryFn: () => likesApi.fetchReceivedLikesCount(),
    refetchInterval: 30_000,
  });

  // Books Filter Query
  const { data: booksData } = useQuery({
    queryKey: ['likes', 'received', 'books'],
    queryFn: () => likesApi.fetchBooksWithLikes(),
    enabled: activeTab === 'received' && canSeeReceivedLikeIdentities(premiumStatusQuery.data, premiumStatusQuery.isTrialLocallyExpired),
  });

  // Received Likes Query
  const {
    data: receivedData,
    isLoading: isLoadingReceived,
    isFetchingNextPage: isFetchingNextReceived,
    hasNextPage: hasNextReceived,
    fetchNextPage: fetchNextReceived,
    refetch: refetchReceived,
    isError: isReceivedError,
    error: receivedError
  } = useInfiniteQuery({
    queryKey: ['likes', 'received', sort, selectedBookId],
    queryFn: ({ pageParam }) =>
      likesApi.fetchReceivedLikes({
        limit: 20,
        sort,
        cursor: pageParam || undefined,
        bookId: selectedBookId,
      }),
    initialPageParam: '' as string | null | undefined,
    getNextPageParam: (lastPage) => lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.nextCursor : undefined,
    enabled: activeTab === 'received' && canSeeReceivedLikeIdentities(premiumStatusQuery.data, premiumStatusQuery.isTrialLocallyExpired),
  });

  // Sent Likes Query
  const {
    data: sentData,
    isLoading: isLoadingSent,
    isFetchingNextPage: isFetchingNextSent,
    hasNextPage: hasNextSent,
    fetchNextPage: fetchNextSent,
    refetch: refetchSent,
    isError: isSentError,
  } = useInfiniteQuery({
    queryKey: ['likes', 'sent', sort],
    queryFn: ({ pageParam }) =>
      likesApi.fetchSentLikes({
        limit: 20,
        sort,
        cursor: pageParam || undefined,
      }),
    initialPageParam: '' as string | null | undefined,
    getNextPageParam: (lastPage) => lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.nextCursor : undefined,
    enabled: activeTab === 'sent',
  });

  const focused = useIsFocused();
  const refreshReceivedAvatars = useAvatarRefresh(receivedData, refetchReceived, focused && activeTab === 'received' && canSeeReceivedLikeIdentities(premiumStatusQuery.data, premiumStatusQuery.isTrialLocallyExpired));
  const refreshSentAvatars = useAvatarRefresh(sentData, refetchSent, focused && activeTab === 'sent');

  // Interaction Mutation
  const interactionMutation = useMutation({
    mutationFn: ({ targetBookId, action }: { targetBookId: string; action: 'LIKE' | 'PASS' }) =>
      likesApi.interact({
        targetBookId,
        action,
        clientActionId: Crypto.randomUUID(),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['likes'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (data.match) {
        Alert.alert('Deu match!', 'Vocês curtiram os livros um do outro! A conversa já está disponível.', [
          { text: 'Ir para Mensagens', onPress: () => navigation.navigate('Messages') },
          { text: 'Continuar', style: 'cancel' }
        ]);
      }
    },
    onError: (error) => {
      Alert.alert('Erro', apiErrorMessage(error));
    },
  });

  const handleBookFilterPress = () => {
    if (!booksData || booksData.length === 0) return;

    const options = booksData.map(book => ({
      text: book.title,
      onPress: () => setSelectedBookId(book.id),
    }));

    options.unshift({ text: 'Todos os livros', onPress: () => setSelectedBookId(undefined) });
    options.push({ text: 'Cancelar', onPress: () => {}, style: 'cancel' } as any);

    Alert.alert('Filtrar por livro', 'Selecione um livro', options);
  };

  const handleUnlike = (bookId: string) => {
    Alert.alert('Remover curtida', 'Tem certeza que deseja remover esta curtida?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => interactionMutation.mutate({ targetBookId: bookId, action: 'PASS' }) }
    ]);
  };

  const receivedItems = receivedData?.pages.flatMap(p => p.items) || [];
  const sentItems = sentData?.pages.flatMap(p => p.items) || [];
  const receivedRequiresPremium = Boolean(
    (receivedError as { response?: { data?: { error?: { code?: string } } } } | null)?.response?.data?.error?.code === 'PREMIUM_REQUIRED'
  );
  const canShowReceivedIdentities = canSeeReceivedLikeIdentities(premiumStatusQuery.data, premiumStatusQuery.isTrialLocallyExpired)
    && !premiumStatusQuery.isError
    && !receivedRequiresPremium;
  const isLoading = activeTab === 'received' ? isLoadingReceived : isLoadingSent;
  const likesViewState = getLikesViewState(
    activeTab,
    isLoading,
    activeTab === 'received' ? isReceivedError : isSentError
  );

  useEffect(() => {
    if (receivedRequiresPremium) {
      void queryClient.invalidateQueries({ queryKey: ['premium', 'status'] });
    }
  }, [queryClient, receivedRequiresPremium]);

  useEffect(() => {
    if (canShowReceivedIdentities) return;
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] === 'likes'
        && query.queryKey[1] === 'received'
        && query.queryKey[2] !== 'count'
    });
  }, [canShowReceivedIdentities, queryClient]);
  const isRefreshing = false; // We can use react-query's isRefetching but simple pull-to-refresh works

  const onRefresh = useCallback(() => {
    if (activeTab === 'received') {
      void premiumStatusQuery.refetch();
      if (canShowReceivedIdentities) void refetchReceived();
    } else {
      void refetchSent();
    }
  }, [activeTab, canShowReceivedIdentities, premiumStatusQuery.refetch, refetchReceived, refetchSent]);

  const renderReceivedItem = ({ item }: { item: ReceivedLike }) => {
    const actorBook = item.actorBook;

    return (
      <LikeCard
        variant="received"
        userName={item.actor.name}
        userAvatar={item.actor.avatarUrl} avatarVersion={item.actor.avatarVersion} onAvatarError={refreshReceivedAvatars}
        userCity={item.actor.city}
        bookTitle={item.book.title}
        bookCoverUrl={item.book.coverUrl}
        likedAt={item.likedAt}
        disabled={interactionMutation.isPending}
        onPress={() => navigation.navigate('BookDetails', { bookId: item.book.id })}
        relatedBookTitle={actorBook?.title}
        onOpenRelatedBook={actorBook ? () => navigation.navigate('BookDetails', { bookId: actorBook.id }) : undefined}
        onLikeBack={actorBook
          ? () => interactionMutation.mutate({ targetBookId: actorBook.id, action: 'LIKE' })
          : undefined}
        onDismiss={actorBook
          ? () => interactionMutation.mutate({ targetBookId: actorBook.id, action: 'PASS' })
          : undefined}
      />
    );
  };

  const renderSentItem = ({ item }: { item: SentLike }) => (
    <LikeCard
      variant="sent"
      userName={item.owner.name}
      userAvatar={item.owner.avatarUrl} avatarVersion={item.owner.avatarVersion} onAvatarError={refreshSentAvatars}
      userCity={item.owner.city}
      bookTitle={item.book.title}
      bookCoverUrl={item.book.coverUrl}
      likedAt={item.likedAt}
      disabled={interactionMutation.isPending}
      onPress={() => navigation.navigate('BookDetails', { bookId: item.book.id })}
      onUnlike={() => handleUnlike(item.book.id)}
    />
  );

  return (
    <AppScreen>
      <TopBar
        title="Curtidas"
        action={countData?.count ? <Badge label={countData.count === 1 ? '1 pendente' : `${countData.count} pendentes`} variant="violet" /> : undefined}
      />

      <View style={styles.toggleContainer}>
        <ToggleGroup
          value={activeTab}
          options={[
            { value: 'received', label: 'Curtidas recebidas' },
            { value: 'sent', label: 'Minhas curtidas' }
          ]}
          onValueChange={(val) => {
            setActiveTab(val);
            setSort('desc');
            setSelectedBookId(undefined);
          }}
          accessibilityLabel="Filtrar curtidas"
        />
      </View>

      <View style={styles.filtersRow}>
        {activeTab === 'received' && canShowReceivedIdentities ? (
          <Pressable accessibilityRole="button" style={styles.filterChip} onPress={handleBookFilterPress}>
            <Text style={styles.filterChipText}>
              {selectedBookId ? booksData?.find(b => b.id === selectedBookId)?.title || 'Livro...' : 'Todos os livros'}
            </Text>
          </Pressable>
        ) : null}
        {(activeTab === 'sent' || canShowReceivedIdentities) ? <Pressable accessibilityRole="button" style={styles.filterChip} onPress={() => setSort(s => s === 'desc' ? 'asc' : 'desc')}>
          <Text style={styles.filterChipText}>
            {sort === 'desc' ? 'Mais recentes' : 'Mais antigas'}
          </Text>
        </Pressable> : null}
      </View>

      {activeTab === 'received' && !premiumStatusQuery.data ? (
        <View style={styles.center}>
          {premiumStatusQuery.isLoading
            ? <ActivityIndicator color={theme.colors.primary} />
            : <StateView title="Não foi possível verificar seu Premium" description="Confira a conexão para consultar suas curtidas recebidas." icon="cloud-off" actionLabel="Tentar novamente" onAction={() => premiumStatusQuery.refetch()} />}
        </View>
      ) : activeTab === 'received' && !canShowReceivedIdentities ? (
        <PremiumLikesGate
          count={countData?.count}
          status={premiumStatusQuery.data}
          loading={premiumStatusQuery.isLoading}
          unavailable={premiumStatusQuery.isError}
          verified={Boolean(session.user?.emailVerifiedAt)}
          onOpenOffer={premiumOffer.openOffer}
        />
      ) : likesViewState === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : likesViewState === 'receivedError' ? (
        <StateView title="Não foi possível carregar as curtidas" description="Confira a conexão e tente novamente." icon="cloud-off" actionLabel="Tentar novamente" onAction={() => refetchReceived()} />
      ) : likesViewState === 'sentError' ? (
        <StateView title="Não foi possível carregar suas curtidas" description="Confira a conexão e tente novamente." icon="cloud-off" actionLabel="Tentar novamente" onAction={() => refetchSent()} />
      ) : likesViewState === 'received' ? (
        <FlatList<ReceivedLike>
          key="received-grid-2"
          data={receivedItems}
          keyExtractor={(item) => item.id}
          renderItem={renderReceivedItem}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.listContent, receivedItems.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          onEndReached={() => { if (hasNextReceived) fetchNextReceived(); }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextReceived ? <ActivityIndicator style={styles.footerLoader} color={theme.colors.primary} /> : null}
          ListEmptyComponent={<StateView title="Nenhuma curtida ainda" description="Quando alguém curtir seus livros, eles aparecerão aqui." icon="favorite-border" />}
        />
      ) : (
        <FlatList<SentLike>
          key="sent-grid-2"
          data={sentItems}
          keyExtractor={(item) => item.id}
          renderItem={renderSentItem}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.listContent, sentItems.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          onEndReached={() => { if (hasNextSent) fetchNextSent(); }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextSent ? <ActivityIndicator style={styles.footerLoader} color={theme.colors.primary} /> : null}
          ListEmptyComponent={<StateView title="Você não curtiu ninguém" description="Vá para a aba Descobrir para encontrar livros interessantes!" icon="explore" />}
        />
      )}
    </AppScreen>
  );
}
