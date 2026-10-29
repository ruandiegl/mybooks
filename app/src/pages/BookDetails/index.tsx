import { useState } from 'react';
import { useMediaBinding } from '../../features/media/useMediaBinding';
import { useThemedStyles } from '../../styles/useThemedStyles';
import { useIsFocused } from '@react-navigation/native';
import { useAvatarRefresh } from '../../features/avatar/useAvatarRefresh';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/AppButton';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { BookGallery } from '../../components/BookGallery';
import { IsbnBadge } from '../../components/IsbnBadge';
import { ReputationStars } from '../../components/ReputationStars';
import { StateView } from '../../components/StateView';
import { getBookGalleryPhotos } from '../../features/books/bookPresentation';
import { getPublicProfile } from '../../features/moderation/api';
import { api } from '../../services/api';
import type { ApiEnvelope, Book, User } from '../../types/api';
import type { RootStackParamList } from '../../types/navigation';
import { createStyles } from './styles';

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetails' | 'ExchangeBookDetails'>;
const availabilityLabels = { AVAILABLE: 'Disponível para troca', RESERVED: 'Reservado', EXCHANGED: 'Já trocado' };

export function BookDetails({ route, navigation }: Props) {
  const mediaBinding = useMediaBinding();
  const [imageRetryToken, setImageRetryToken] = useState(0);
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const conversationId = 'conversationId' in route.params ? route.params.conversationId : null;
  const isExchangeBook = conversationId !== null;
  const bookId = route.params.bookId;
  const query = useQuery({
    queryKey: isExchangeBook ? ['exchange-book', conversationId, bookId] : ['book', bookId],
    queryFn: async ({ signal }) => {
      if (isExchangeBook && conversationId) {
        return (await api.get<ApiEnvelope<Book>>(`/api/v1/conversations/${conversationId}/exchange-books/${bookId}`, { signal })).data.data;
      }
      return (await api.get<ApiEnvelope<Book>>('/api/v1/books/' + bookId, { signal })).data.data;
    }
  });
  const me = useQuery({ queryKey: ['me'], queryFn: async () => (await api.get<ApiEnvelope<User>>('/api/v1/me')).data.data });
  const ownerProfile = useQuery({
    queryKey: ['public-profile', query.data?.owner?.id],
    queryFn: ({ signal }) => getPublicProfile(query.data!.owner!.id, signal),
    enabled: Boolean(query.data?.owner?.id)
  });
  const exchangeBookUnavailable = isExchangeBook && axios.isAxiosError(query.error) && query.error.response?.status === 404;
  const bookUnavailable = !isExchangeBook && axios.isAxiosError(query.error) && query.error.response?.status === 404;
  const refreshAvatar = useAvatarRefresh(query.data, query.refetch, useIsFocused() && !exchangeBookUnavailable);

  if (query.isLoading) return <View style={styles.page}><StateView loading title="Abrindo o livro" /></View>;
  if (exchangeBookUnavailable) {
    return <View style={styles.page}><StateView title="Detalhes da troca indisponíveis" description="O match foi removido ou este livro já não faz parte da troca." icon="menu-book" actionLabel="Ir para mensagens" onAction={() => navigation.navigate('Main', { screen: 'Messages' })} /></View>;
  }
  if (bookUnavailable) return <View style={styles.page}><StateView title="Livro não disponível" description="Este livro não pode ser exibido agora." icon="menu-book" actionLabel="Voltar" onAction={() => navigation.goBack()} /></View>;
  if (!query.data) {
    if (isExchangeBook && query.isError) {
      return <View style={styles.page}><StateView title="Não foi possível carregar os detalhes" description="Confira sua conexão e tente novamente." icon="cloud-off" actionLabel="Tentar novamente" onAction={() => query.refetch()} /></View>;
    }
    if (query.isError) return <View style={styles.page}><StateView title="Não foi possível abrir o livro" description="Confira sua conexão e tente novamente." icon="cloud-off" actionLabel="Tentar novamente" onAction={() => query.refetch()} /></View>;
    return <View style={styles.page}><StateView title="Livro não encontrado" icon="menu-book" actionLabel="Tentar novamente" onAction={() => query.refetch()} /></View>;
  }
  const book = query.data;
  const photos = getBookGalleryPhotos(book);

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
      {book.owner ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Abrir perfil de ${book.owner.name}`} onPress={() => navigation.navigate('PublicProfile', { userId: book.owner!.id, ...(conversationId ? { conversationId } : {}) })} style={styles.owner}>
          <Avatar retryToken={imageRetryToken} subjectId={book.owner.id} binding={mediaBinding} name={book.owner.name} url={book.owner.avatarUrl} version={book.owner.avatarVersion} onImageError={refreshAvatar} />
          <View style={styles.ownerInfo}><Text style={styles.ownerCaption}>Na estante de</Text><Text style={styles.ownerName}>{book.owner.name}</Text><Text style={styles.ownerCity}>{book.owner.city || 'Localização não informada'}</Text>{typeof ownerProfile.data?.reputation?.stars === 'number' ? <ReputationStars stars={ownerProfile.data.reputation.stars} /> : null}</View>
        </Pressable>
      ) : null}
      <BookGallery retryToken={imageRetryToken} key={book.id} bookId={book.id} binding={mediaBinding} onImageError={refreshAvatar} title={book.title} photos={photos} refreshing={query.isFetching} onRefresh={() => { setImageRetryToken(value => value + 1); void query.refetch(); }} />
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
