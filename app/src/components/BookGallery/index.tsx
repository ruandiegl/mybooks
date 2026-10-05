import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import type { BookImage } from '../../types/api';
import { theme } from '../../styles/theme';
import { BookPhoto } from '../BookPhoto';
import { styles } from './styles';

type Props = { title: string; photos: BookImage[]; onRefresh: () => void; refreshing: boolean; refreshVersion: number };

export function BookGallery({ title, photos, onRefresh, refreshing, refreshVersion }: Props) {
  const { width, height } = useWindowDimensions();
  const pager = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedIndex = Math.min(activeIndex, Math.max(photos.length - 1, 0));
  const photoHeight = width > height ? Math.min(height * 0.72, 360) : Math.min(pageWidth * 1.18, 480);

  // Keep the selected photo aligned after rotation or removal, without automatic motion.
  useEffect(() => {
    pager.current?.scrollTo({ x: selectedIndex * pageWidth, animated: false });
  }, [pageWidth, selectedIndex]);

  return (
    <View style={styles.gallery}>
      <View style={styles.stage} onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)}>
        {photos.length > 0 && pageWidth > 0 ? (
          <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event) => setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / pageWidth))}>
            {photos.map((photo, index) => (
              <View key={photo.id} style={{ width: pageWidth, height: photoHeight }}>
                <BookPhoto key={(photo.url ?? photo.id) + refreshVersion} url={photo.url} hasPhoto title={title} label={`Foto ${index + 1} de ${photos.length}: ${title}${index === 0 ? ', capa' : ''}`} />
              </View>
            ))}
          </ScrollView>
        ) : <View style={{ height: Math.max(photoHeight, 240) }}><BookPhoto title={title} label={`Capa de ${title}`} /></View>}
      </View>
      {photos.length > 0 ? (
        <View style={styles.controls}>
          <Pressable accessibilityRole="button" accessibilityLabel="Foto anterior" disabled={selectedIndex === 0} accessibilityState={{ disabled: selectedIndex === 0 }} onPress={() => setActiveIndex(selectedIndex - 1)} style={({ pressed }) => [styles.arrow, selectedIndex === 0 && styles.disabled, pressed && styles.pressed]}><MaterialIcons name="chevron-left" size={24} color={theme.colors.foreground} /></Pressable>
          <Text style={styles.counter} accessibilityLiveRegion="polite">{selectedIndex + 1} de {photos.length} · {selectedIndex === 0 ? 'Capa' : 'Foto do livro'}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Próxima foto" disabled={selectedIndex === photos.length - 1} accessibilityState={{ disabled: selectedIndex === photos.length - 1 }} onPress={() => setActiveIndex(selectedIndex + 1)} style={({ pressed }) => [styles.arrow, selectedIndex === photos.length - 1 && styles.disabled, pressed && styles.pressed]}><MaterialIcons name="chevron-right" size={24} color={theme.colors.foreground} /></Pressable>
        </View>
      ) : null}
      {photos.length > 1 ? (
        <View style={styles.thumbnails}>
          {photos.map((photo, index) => (
            <Pressable key={photo.id} accessibilityRole="button" accessibilityLabel={index === 0 ? 'Mostrar capa' : `Mostrar foto ${index + 1}`} accessibilityState={{ selected: selectedIndex === index }} onPress={() => setActiveIndex(index)} style={({ pressed }) => [styles.thumbnail, selectedIndex === index && styles.selectedThumbnail, pressed && styles.pressed]}>
              <View style={styles.thumbnailImage}><BookPhoto key={(photo.url ?? photo.id) + refreshVersion} url={photo.url} hasPhoto title={title} label={`Miniatura ${index + 1}`} compact /></View>
              <Text style={[styles.thumbnailLabel, selectedIndex === index && styles.selectedLabel]}>{index === 0 ? 'Capa' : `Foto ${index + 1}`}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {photos.length > 0 ? <Pressable accessibilityRole="button" disabled={refreshing} accessibilityState={{ disabled: refreshing, busy: refreshing }} onPress={onRefresh} style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}><Text style={styles.refreshLabel}>{refreshing ? 'Atualizando fotos…' : 'Recarregar fotos'}</Text></Pressable> : null}
    </View>
  );
}
