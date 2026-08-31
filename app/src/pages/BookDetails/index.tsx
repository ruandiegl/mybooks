import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Image, ScrollView, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { IsbnBadge } from '../../components/IsbnBadge';
import { StateView } from '../../components/StateView';
import { api } from '../../services/api';
import type { ApiEnvelope, Book, User } from '../../types/api';
import type { RootStackParamList } from '../../types/navigation';
import { styles } from './styles';
type Props = NativeStackScreenProps<RootStackParamList, 'BookDetails'>;
export function BookDetails({ route, navigation }: Props) {
  const query = useQuery({ queryKey: ['book', route.params.bookId], queryFn: async () => (await api.get<ApiEnvelope<Book>>('/api/v1/books/' + route.params.bookId)).data.data });
  const me = useQuery({ queryKey: ['me'], queryFn: async () => (await api.get<ApiEnvelope<User>>('/api/v1/me')).data.data });
  if (query.isLoading) return <View style={styles.page}><StateView loading title="Abrindo o livro" /></View>;
  if (!query.data) return <View style={styles.page}><StateView title="Livro não encontrado" icon="menu-book" actionLabel="Tentar novamente" onAction={() => query.refetch()} /></View>;
  const book = query.data;
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}><View style={styles.cover}>{book.coverUrl ? <Image source={{ uri: book.coverUrl }} style={styles.image} /> : <View style={styles.fallback}><Text style={styles.fallbackText}>{book.title}</Text></View>}</View>{book.hasIsbnBadge ? <IsbnBadge /> : null}<View><Text style={styles.title}>{book.title}</Text><Text style={styles.author}>{book.authors.join(', ') || 'Autor não informado'}</Text></View><View style={styles.meta}>{book.year ? <Badge label={String(book.year)} /> : null}{book.pageCount ? <Badge label={book.pageCount + ' páginas'} /> : null}{book.publisher ? <Badge label={book.publisher} variant="violet" /> : null}</View>{book.owner ? <View style={styles.owner}><Avatar name={book.owner.name} url={book.owner.avatarUrl} /><View><Text style={styles.ownerName}>{book.owner.name}</Text><Text style={styles.ownerCity}>{book.owner.city || 'Localização não informada'}</Text></View></View> : null}<Text style={styles.section}>Sobre esta edição</Text><Text style={styles.body}>{book.synopsis || 'Nenhuma sinopse foi informada.'}</Text>{book.isbn ? <><Text style={styles.section}>ISBN</Text><Text style={styles.body}>{book.isbn}</Text></> : null}{book.owner?.id === me.data?.id ? <AppButton label="Editar livro" variant="outline" icon="edit" onPress={() => route.params.bookId && navigation.navigate('BookEdit', { bookId: route.params.bookId })} /> : null}</ScrollView>;
}
