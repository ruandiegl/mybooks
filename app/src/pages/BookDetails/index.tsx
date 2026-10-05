import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/AppButton';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { BookGallery } from '../../components/BookGallery';
import { IsbnBadge } from '../../components/IsbnBadge';
import { StateView } from '../../components/StateView';
import { getSignedBookImageRefreshDelay } from '../../features/books/bookPhotos';
import { getBookGalleryPhotos } from '../../features/books/bookPresentation';
import { api } from '../../services/api';
import type { ApiEnvelope, Book, User } from '../../types/api';
import type { RootStackParamList } from '../../types/navigation';
import { styles } from './styles';

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetails'>;
const availabilityLabels = { AVAILABLE: 'Disponível para troca', RESERVED: 'Reservado', EXCHANGED: 'Já trocado' };

export function BookDetails({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const query = useQuery({
    queryKey: ['book', route.params.bookId],
    queryFn: async () => (await api.get<ApiEnvelope<Book>>('/api/v1/books/' + route.params.bookId)).data.data,
    refetchInterval: (currentQuery) => getSignedBookImageRefreshDelay(currentQuery.state.data ? [currentQuery.state.data] : [])
  });
  const me = useQuery({ queryKey: ['me'], queryFn: async () => (await api.get<ApiEnvelope<User>>('/api/v1/me')).data.data });
  if (query.isLoading) return <View style={styles.page}><StateView loading title="Abrindo o livro" /></View>;
  if (query.isError) return <View style={styles.page}><StateView title="Não foi possível abrir o livro" description="Confira sua conexão e tente novamente." icon="cloud-off" actionLabel="Tentar novamente" onAction={() => query.refetch()} /></View>;
  if (!query.data) return <View style={styles.page}><StateView title="Livro não encontrado" icon="menu-book" actionLabel="Tentar novamente" onAction={() => query.refetch()} /></View>;

  const book = query.data;
  const photos = getBookGalleryPhotos(book);

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
      {book.owner ? (
        <View style={styles.owner}>
          <Avatar name={book.owner.name} url={book.owner.avatarUrl} />
          <View style={styles.ownerInfo}><Text style={styles.ownerCaption}>Na estante de</Text><Text style={styles.ownerName}>{book.owner.name}</Text><Text style={styles.ownerCity}>{book.owner.city || 'Localização não informada'}</Text></View>
        </View>
      ) : null}
      <BookGallery key={book.id} title={book.title} photos={photos} refreshing={query.isFetching} refreshVersion={query.dataUpdatedAt} onRefresh={() => { void query.refetch(); }} />
      <View style={styles.heading}>
        <View style={styles.meta}><Badge label={availabilityLabels[book.availability]} variant={book.availability === 'AVAILABLE' ? 'success' : 'default'} />{book.hasIsbnBadge ? <IsbnBadge /> : null}</View>
        <Text style={styles.title} accessibilityRole="header">{book.title}</Text>
        {book.subtitle ? <Text style={styles.subtitle}>{book.subtitle}</Text> : null}
        <Text style={styles.author}>{book.authors.join(', ') || 'Autor não informado'}</Text>
      </View>
      <View style={styles.sectionBlock}>
        <Text style={styles.section} accessibilityRole="header">Sobre o livro</Text>
        <Text style={styles.body}>{book.synopsis || 'Nenhuma sinopse foi informada.'}</Text>
      </View>
      <View style={styles.sectionBlock}>
        <Text style={styles.section} accessibilityRole="header">Informações da edição</Text>
        {[
          ['Editora', book.publisher], ['Ano', book.year ? String(book.year) : null],
          ['Páginas', book.pageCount ? String(book.pageCount) : null], ['ISBN', book.isbn]
        ].map(([label, value]) => <View key={label} style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue} selectable>{value || 'Não informado'}</Text></View>)}
      </View>
      {book.subjects.length > 0 ? <View style={styles.sectionBlock}><Text style={styles.section} accessibilityRole="header">Assuntos</Text><View style={styles.meta}>{book.subjects.map((subject, index) => <Badge key={`${subject}-${index}`} label={subject} variant="violet" />)}</View></View> : null}
      {book.owner?.id === me.data?.id
        ? <AppButton label="Editar livro" variant="outline" icon="edit" onPress={() => navigation.navigate('BookEdit', { bookId: book.id })} />
        : null}
    </ScrollView>
  );
}
