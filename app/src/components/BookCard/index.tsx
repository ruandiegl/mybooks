import { Pressable, Text, View, type ViewStyle } from 'react-native';
import type { Book } from '../../types/api';
import { IsbnBadge } from '../IsbnBadge';
import { getBookGalleryPhotos } from '../../features/books/bookPresentation';
import { createBookMedia } from '../../features/media/mediaIdentity';
import type { MediaBinding } from '../../features/media/mediaTypes';
import { BookPhoto } from '../BookPhoto';
import { useThemedStyles } from '../../styles/useThemedStyles';
import { createStyles } from './styles';
type Props = { onImageError?: () => void; retryToken?: number; binding?: MediaBinding; book: Book; onPress?: () => void; style?: ViewStyle };
export function BookCard({ book, binding, onImageError, retryToken, onPress, style }: Props) {
  const styles = useThemedStyles(createStyles);
  const photo = getBookGalleryPhotos(book)[0];
  const media = binding?.scope && photo ? createBookMedia(binding.scope, book.id, photo) : null;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={'Abrir livro ' + book.title} onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.84 }]}>
      <View style={styles.cover}>
        <BookPhoto onImageError={onImageError} retryToken={retryToken} media={media} binding={binding} title={book.title} label={'Capa de ' + book.title} compact fit="cover" fallback={<View style={styles.fallback}><Text style={styles.monogram}>MB</Text><Text style={styles.fallbackTitle} numberOfLines={4}>{book.title}</Text></View>} />
        {book.hasIsbnBadge ? <View style={styles.badge}><IsbnBadge /></View> : null}
      </View>
      <View><Text numberOfLines={2} style={styles.title}>{book.title}</Text><Text numberOfLines={1} style={styles.author}>{book.authors.join(', ') || 'Autor não informado'}</Text></View>
    </Pressable>
  );
}
