import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useDeferredValue, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { BookCard } from '../../components/BookCard';
import { SearchField } from '../../components/SearchField';
import { StateView } from '../../components/StateView';
import { ToggleGroup } from '../../components/ToggleGroup';
import { TopBar } from '../../components/TopBar';
import { api } from '../../services/api';
import { theme } from '../../styles/theme';
import type { ApiEnvelope, Book, Paginated } from '../../types/api';
import type { RootStackParamList } from '../../types/navigation';
import { styles } from './styles';

export function Library() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'title'>('recent');
  const deferredSearch = useDeferredValue(search.trim());
  const query = useInfiniteQuery({
    queryKey: ['books', 'mine', deferredSearch, sort],
    initialPageParam: '',
    queryFn: async ({ pageParam }) => (await api.get<ApiEnvelope<Paginated<Book>>>('/api/v1/books', { params: { limit: 20, cursor: pageParam || undefined, q: deferredSearch || undefined, sort } })).data.data,
    getNextPageParam: (lastPage) => lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.nextCursor || undefined : undefined
  });
  const books = query.data?.pages.flatMap((page) => page.items) || [];

  return (
    <AppScreen>
      <TopBar eyebrow="Meu espaço" title="Biblioteca" action={<Pressable accessibilityRole="button" accessibilityLabel="Cadastrar livro" style={({ pressed }) => [styles.add, pressed && styles.addPressed]} onPress={() => navigation.navigate('BookCreate')}><MaterialIcons name="add" size={26} color={theme.colors.white} /></Pressable>} />
      {query.isLoading ? <StateView loading title="Organizando sua estante" /> : query.isError ? <StateView title="Não foi possível abrir sua estante" description="Confira a conexão e tente novamente." icon="cloud-off" actionLabel="Tentar novamente" onAction={() => query.refetch()} /> : <FlatList
        data={books}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<View style={styles.controls}><SearchField value={search} onChangeText={setSearch} placeholder="Título, autor ou ISBN" /><ToggleGroup accessibilityLabel="Ordenar biblioteca" value={sort} onValueChange={setSort} options={[{ value: 'recent', label: 'Mais recentes' }, { value: 'title', label: 'Título A–Z' }]} /></View>}
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={query.refetch} tintColor={theme.colors.primary} />}
        onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => <BookCard book={item} style={styles.item} onPress={() => navigation.navigate('BookDetails', { bookId: item.id })} />}
        ListFooterComponent={query.isFetchingNextPage ? <View style={styles.footer}><ActivityIndicator color={theme.colors.primary} /></View> : null}
        ListEmptyComponent={<StateView title={search ? 'Nenhum livro encontrado' : 'Sua estante está vazia'} description={search ? 'Tente outro título, autor ou ISBN.' : 'Cadastre o primeiro livro e coloque uma nova história em circulação.'} actionLabel={search ? 'Limpar busca' : 'Cadastrar livro'} onAction={() => search ? setSearch('') : navigation.navigate('BookCreate')} />}
      />}
    </AppScreen>
  );
}
