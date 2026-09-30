import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image, Pressable, Text, View } from 'react-native';
import type { BookPhotoDraft } from '../../features/books/bookPhotos';
import { MAX_BOOK_PHOTOS } from '../../features/books/bookPhotos';
import { theme } from '../../styles/theme';
import { styles } from './styles';

type Props = {
  photos: BookPhotoDraft[];
  onAdd: () => void;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
};

export function BookPhotoPicker({ photos, onAdd, onMove, onRemove, disabled = false }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.title}>Fotos do livro</Text>
        <Text style={styles.description}>A primeira foto será a capa. Você pode adicionar até três.</Text>
      </View>
      <View style={styles.tiles}>
        {photos.map((photo, index) => (
          <View key={photo.id} style={styles.tile}>
            <View style={styles.imageFrame}>
              {photo.uri ? <Image source={{ uri: photo.uri }} style={styles.image} accessibilityLabel={`Foto ${index + 1} de ${photos.length}`} resizeMode="cover" /> : <View style={styles.imagePlaceholder} />}
              <View style={[styles.orderBadge, index === 0 && styles.coverBadge]}>
                <Text style={[styles.orderText, index === 0 && styles.coverText]}>{index === 0 ? 'Capa' : `${index + 1}`}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remover foto ${index + 1}`}
                accessibilityHint="Remove esta foto do livro"
                accessibilityState={{ disabled }}
                disabled={disabled}
                hitSlop={4}
                style={({ pressed }) => [styles.remove, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
                onPress={() => onRemove(index)}
              >
                <MaterialIcons name="close" size={18} color={theme.colors.foreground} />
              </Pressable>
            </View>
            <View style={styles.controls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mover foto ${index + 1} para a esquerda`}
                accessibilityState={{ disabled: disabled || index === 0 }}
                disabled={disabled || index === 0}
                style={({ pressed }) => [styles.control, (disabled || index === 0) && styles.disabled, pressed && styles.pressed]}
                onPress={() => onMove(index, index - 1)}
              >
                <MaterialIcons name="arrow-back" size={18} color={theme.colors.primary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mover foto ${index + 1} para a direita`}
                accessibilityState={{ disabled: disabled || index === photos.length - 1 }}
                disabled={disabled || index === photos.length - 1}
                style={({ pressed }) => [styles.control, (disabled || index === photos.length - 1) && styles.disabled, pressed && styles.pressed]}
                onPress={() => onMove(index, index + 1)}
              >
                <MaterialIcons name="arrow-forward" size={18} color={theme.colors.primary} />
              </Pressable>
            </View>
          </View>
        ))}
        {photos.length < MAX_BOOK_PHOTOS ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Adicionar foto ${photos.length + 1} de ${MAX_BOOK_PHOTOS}`}
            accessibilityHint="Abre a galeria de fotos"
            accessibilityState={{ disabled }}
            disabled={disabled}
            style={({ pressed }) => [styles.addTile, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
            onPress={onAdd}
          >
            <MaterialIcons name="add-photo-alternate" size={25} color={theme.colors.primary} />
            <Text style={styles.addText}>Adicionar</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.counter}>{photos.length}/{MAX_BOOK_PHOTOS} fotos</Text>
    </View>
  );
}
