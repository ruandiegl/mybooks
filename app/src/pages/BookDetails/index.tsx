import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { IsbnBadge } from '../../components/IsbnBadge';
import { StateView } from '../../components/StateView';
import { getSignedBookImageRefreshDelay } from '../../features/books/bookPhotos';
import { api } from '../../services/api';
import type { ApiEnvelope, Book, User } from '../../types/api';
import type { RootStackParamList } from '../../types/navigation';
import { styles } from './styles';

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetails'>;

export function BookDetails({ route, navigation }: Props) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const query = useQuery({
    queryKey: ['book', route.params.bookId],
    queryFn: async () => (await api.get<ApiEnvelope<Book>>('/api/v1/books/' + route.params.bookId)).data.data,
    refetchInterval: (currentQuery) => getSignedBookImageRefreshDelay(currentQuery.state.data ? [currentQuery.state.data] : [])
  });
  const me = useQuery({ queryKey: ['me'], queryFn: async () => (await api.get<ApiEnvelope<User>>('/api/v1/me')).data.data });
  if (query.isLoading) return <View style={styles.page}><StateView loading title="Abrindo o livro" /></View>;
  if (!query.data) return <View style={styles.page}><StateView title="Livro não encontrado" icon="menu-book" actionLabel="Tentar novamente" onAction={() => query.refetch()} /></View>;

  const book = query.data;
  const selectedPhotoIndex = Math.min(activePhotoIndex, Math.max(book.images.length - 1, 0));
  const activeImage = book.images[selectedPhotoIndex];
  const coverUrl = activeImage?.url ?? (selectedPhotoIndex === 0 ? book.coverUrl : null);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.cover}>
        {coverUrl
          ? <Image key={coverUrl} source={{ uri: coverUrl }} accessibilityLabel={`Foto ${selectedPhotoIndex + 1} de ${book.title}`} style={styles.image} resizeMode="cover" />
          : <View style={styles.fallback}><Text style={styles.fallbackText}>{book.title}</Text></View>}
      </View>
      {book.images.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryList} accessibilityLabel="Fotos do livro">
          {book.images.map((image, index) => (
            <Pressable
              key={image.id}
              accessibilityRole="button"
              accessibilityLabel={index === 0 ? 'Mostrar capa' : `Mostrar foto ${index + 1}`}
              accessibilityState={{ selected: index === selectedPhotoIndex }}
              style={[styles.thumbnail, index === selectedPhotoIndex && styles.selectedThumbnail]}
              onPress={() => setActivePhotoIndex(index)}
            >
              {image.url
                ? <Image source={{ uri: image.url }} accessibilityLabel={`Miniatura ${index + 1}`} style={styles.thumbnailImage} resizeMode="cover" />
                : <View style={styles.thumbnailFallback}><Text style={styles.fallbackText}>{index + 1}</Text></View>}
              {index === 0 ? <Text style={styles.thumbnailLabel}>Capa</Text> : null}
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {book.hasIsbnBadge ? <IsbnBadge /> : null}
      <View><Text style={styles.title}>{book.title}</Text><Text style={styles.author}>{book.authors.join(', ') || 'Autor não informado'}</Text></View>
      <View style={styles.meta}>
        {book.year ? <Badge label={String(book.year)} /> : null}
        {book.pageCount ? <Badge label={book.pageCount + ' páginas'} /> : null}
        {book.publisher ? <Badge label={book.publisher} variant="violet" /> : null}
      </View>
      {book.owner ? (
        <View style={styles.owner}>
          <Avatar name={book.owner.name} url={book.owner.avatarUrl} />
          <View><Text style={styles.ownerName}>{book.owner.name}</Text><Text style={styles.ownerCity}>{book.owner.city || 'Localização não informada'}</Text></View>
        </View>
      ) : null}
      <Text style={styles.section}>Sobre esta edição</Text>
      <Text style={styles.body}>{book.synopsis || 'Nenhuma sinopse foi informada.'}</Text>
      {book.isbn ? <><Text style={styles.section}>ISBN</Text><Text style={styles.body}>{book.isbn}</Text></> : null}
      {book.owner?.id === me.data?.id
        ? <AppButton label="Editar livro" variant="outline" icon="edit" onPress={() => navigation.navigate('BookEdit', { bookId: book.id })} />
        : null}
    </ScrollView>
  );
}
