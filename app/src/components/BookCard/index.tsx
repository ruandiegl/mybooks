import { Image, Pressable, Text, View, type ViewStyle } from 'react-native';
import type { Book } from '../../types/api';
import { IsbnBadge } from '../IsbnBadge';
import { styles } from './styles';
type Props = { book: Book; onPress?: () => void; style?: ViewStyle };
export function BookCard({ book, onPress, style }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={'Abrir livro ' + book.title} onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.84 }]}>
      <View style={styles.cover}>
        {book.coverUrl ? <Image source={{ uri: book.coverUrl }} accessibilityLabel={'Capa de ' + book.title} style={styles.image} resizeMode="cover" /> : <View style={styles.fallback}><Text style={styles.monogram}>MB</Text><Text style={styles.fallbackTitle} numberOfLines={4}>{book.title}</Text></View>}
        {book.hasIsbnBadge ? <View style={styles.badge}><IsbnBadge /></View> : null}
      </View>
      <View><Text numberOfLines={2} style={styles.title}>{book.title}</Text><Text numberOfLines={1} style={styles.author}>{book.authors.join(', ') || 'Autor não informado'}</Text></View>
    </Pressable>
  );
}
