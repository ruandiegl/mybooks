import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { BookPhotoPicker } from '../../components/BookPhotoPicker';
import { IsbnBadge } from '../../components/IsbnBadge';
import { StateView } from '../../components/StateView';
import { TextField } from '../../components/TextField';
import { normalizeIsbnInput } from '../../features/books/isbnForm';
import {
  appendBookPhotos,
  BookPhotoError,
  createBookPhoto,
  getSignedBookImageRefreshDelay,
  MAX_BOOK_PHOTOS,
  moveBookPhoto,
  removeBookPhoto,
  type BookPhotoDraft
} from '../../features/books/bookPhotos';
import { deleteBookPhoto, saveBookPhotoOrder, uploadBookPhoto } from '../../features/books/bookPhotoUpload';
import { api, apiErrorMessage } from '../../services/api';
import type { ApiEnvelope, Book } from '../../types/api';
import type { RootStackParamList } from '../../types/navigation';
import { styles } from './styles';

type Props = NativeStackScreenProps<RootStackParamList, 'BookEdit'>;
type Form = { title: string; authors: string; publisher: string; synopsis: string; year: string; pageCount: string; subjects: string; isbn: string };
type PhotoDraftCache = { mode: 'append' | 'replace'; photos: BookPhotoDraft[] };

const empty: Form = { title: '', authors: '', publisher: '', synopsis: '', year: '', pageCount: '', subjects: '', isbn: '' };
const split = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);

export function BookEdit({ route, navigation }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(empty);
  const [photos, setPhotos] = useState<BookPhotoDraft[]>([]);
  const hasLoadedBook = useRef(false);
  const photosAreDirty = useRef(false);
  const photoDraftKey = ['book-photos-draft', route.params.bookId];
  const query = useQuery({
    queryKey: ['book', route.params.bookId],
    queryFn: async () => (await api.get<ApiEnvelope<Book>>('/api/v1/books/' + route.params.bookId)).data.data,
    refetchInterval: (currentQuery) => getSignedBookImageRefreshDelay(currentQuery.state.data ? [currentQuery.state.data] : [])
  });

  useEffect(() => {
    const book = query.data;
    if (!book) return;
    const remotePhotos: BookPhotoDraft[] = (book.images ?? []).map((image) => ({
      id: image.id,
      imageId: image.id,
      uri: image.url ?? ''
    }));
    if (!hasLoadedBook.current) {
      setForm({ title: book.title, authors: book.authors.join(', '), publisher: book.publisher || '', synopsis: book.synopsis || '', year: book.year ? String(book.year) : '', pageCount: book.pageCount ? String(book.pageCount) : '', subjects: book.subjects.join(', '), isbn: book.isbn || '' });
      const cached = queryClient.getQueryData<PhotoDraftCache>(photoDraftKey);
      if (cached?.mode === 'replace') {
        const currentIds = new Set(remotePhotos.map((photo) => photo.imageId));
        setPhotos(cached.photos.filter((photo) => !photo.imageId || currentIds.has(photo.imageId)));
        photosAreDirty.current = true;
      } else {
        setPhotos(appendBookPhotos(remotePhotos, cached?.photos ?? []));
      }
      hasLoadedBook.current = true;
      return;
    }
    const latestUrlById = new Map(remotePhotos.map((photo) => [photo.imageId, photo.uri]));
    setPhotos((current) => photosAreDirty.current
      ? current.map((photo) => photo.imageId && latestUrlById.has(photo.imageId)
        ? { ...photo, uri: latestUrlById.get(photo.imageId) ?? photo.uri }
        : photo)
      : remotePhotos);
  }, [query.data, queryClient, route.params.bookId]);

  const set = (key: keyof Form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  async function pickPhotos() {
    const remaining = MAX_BOOK_PHOTOS - photos.length;
    if (remaining <= 0) return;
    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        selectionLimit: remaining,
        quality: 0.82
      });
    } catch {
      Alert.alert('Não foi possível abrir as fotos', 'Confira a permissão da galeria e tente novamente.');
      return;
    }
    if (result.canceled) return;

    const validPhotos: BookPhotoDraft[] = [];
    let firstValidationError: unknown;
    for (const asset of result.assets) {
      try {
        validPhotos.push(createBookPhoto(asset, Crypto.randomUUID()));
      } catch (error) {
        firstValidationError ??= error;
      }
    }
    try {
      if (validPhotos.length) photosAreDirty.current = true;
      setPhotos((current) => appendBookPhotos(current, validPhotos.slice(0, remaining)));
    } catch (error) {
      Alert.alert('Limite de fotos', error instanceof Error ? error.message : 'Um livro pode ter até três fotos.');
      return;
    }
    if (firstValidationError) {
      Alert.alert(
        'Foto não adicionada',
        firstValidationError instanceof BookPhotoError ? firstValidationError.message : 'Uma das imagens não pôde ser usada.'
      );
    }
    if (validPhotos.length > remaining) Alert.alert('Limite de fotos', 'Um livro pode ter até três fotos.');
  }

  function confirmRemovePhoto(index: number) {
    const photo = photos[index];
    const remove = () => {
      photosAreDirty.current = true;
      setPhotos((current) => removeBookPhoto(current, index));
    };
    if (!photo?.imageId) {
      remove();
      return;
    }
    Alert.alert('Remover esta foto?', 'A alteração será aplicada quando você salvar as fotos do livro.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: remove }
    ]);
  }

  const update = useMutation({
    mutationFn: async () => (await api.patch<ApiEnvelope<Book>>('/api/v1/books/' + route.params.bookId, {
      title: form.title.trim(),
      authors: split(form.authors),
      publisher: form.publisher.trim() || null,
      synopsis: form.synopsis.trim() || null,
      year: form.year ? Number(form.year) : null,
      pageCount: form.pageCount ? Number(form.pageCount) : null,
      subjects: split(form.subjects),
      isbn: form.isbn.trim() || null
    })).data.data,
    onSuccess: (book) => {
      queryClient.setQueryData(['book', book.id], book);
      void queryClient.invalidateQueries({ queryKey: ['books'] });
      Alert.alert('Livro atualizado', 'As alterações foram salvas.', [{ text: 'Voltar', onPress: () => navigation.goBack() }]);
    },
    onError: (error) => Alert.alert('Não foi possível salvar', apiErrorMessage(error))
  });
  const savePhotos = useMutation({
    mutationFn: async () => {
      const working = photos.map((photo) => ({ ...photo }));
      const persistDraft = () => queryClient.setQueryData<PhotoDraftCache>(photoDraftKey, {
        mode: 'replace',
        photos: working
      });
      const readLatestBook = async () => (
        await api.get<ApiEnvelope<Book>>('/api/v1/books/' + route.params.bookId)
      ).data.data;
      const partialResult = async () => {
        persistDraft();
        const latest = await readLatestBook().catch(() => query.data as Book);
        const latestIds = new Set(latest.images.map((image) => image.id));
        const reconciled = working.filter((photo) => !photo.imageId || latestIds.has(photo.imageId));
        queryClient.setQueryData<PhotoDraftCache>(photoDraftKey, { mode: 'replace', photos: reconciled });
        return { book: latest, photos: reconciled, partial: true };
      };

      for (const [index, photo] of working.entries()) {
        if (photo.imageId) continue;
        try {
          const image = await uploadBookPhoto(route.params.bookId, photo);
          working[index] = { ...photo, imageId: image.id, uri: image.url ?? photo.uri };
          persistDraft();
        } catch {
          return partialResult();
        }
      }

      const desiredIds = new Set(working.flatMap((photo) => photo.imageId ? [photo.imageId] : []));
      try {
        for (const image of query.data?.images ?? []) {
          if (!desiredIds.has(image.id)) await deleteBookPhoto(route.params.bookId, image.id);
        }
        const book = await saveBookPhotoOrder(
          route.params.bookId,
          working.map((photo) => photo.imageId as string)
        );
        return { book, photos: working, partial: false };
      } catch {
        return partialResult();
      }
    },
    onSuccess: ({ book, photos: savedPhotos, partial }) => {
      queryClient.setQueryData(['book', book.id], book);
      if (partial) {
        photosAreDirty.current = true;
        queryClient.setQueryData<PhotoDraftCache>(photoDraftKey, { mode: 'replace', photos: savedPhotos });
        setPhotos(savedPhotos);
        Alert.alert('Fotos salvas parcialmente', 'Algumas alterações ainda não foram concluídas. Confira a conexão e tente salvar novamente.');
        return;
      }
      photosAreDirty.current = false;
      queryClient.removeQueries({ queryKey: photoDraftKey, exact: true });
      setPhotos(book.images.map((image) => ({ id: image.id, imageId: image.id, uri: image.url ?? '' })));
      void queryClient.invalidateQueries({ queryKey: ['books'] });
      void queryClient.invalidateQueries({ queryKey: ['discover'] });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      Alert.alert('Fotos atualizadas', 'A capa e a sequência foram salvas.');
    },
    onError: (error) => Alert.alert('Não foi possível salvar as fotos', apiErrorMessage(error))
  });
  const remove = useMutation({
    mutationFn: () => api.delete('/api/v1/books/' + route.params.bookId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['books'] });
      navigation.popToTop();
    },
    onError: (error) => Alert.alert('Não foi possível excluir', apiErrorMessage(error))
  });

  function confirmDelete() {
    Alert.alert('Excluir este livro?', 'A capa e o histórico de interações ligados a ele também serão removidos. Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => remove.mutate() }
    ]);
  }

  if (query.isLoading) return <View style={styles.page}><StateView loading title="Carregando dados" /></View>;
  if (!query.data) return <View style={styles.page}><StateView title="Livro indisponível" actionLabel="Tentar novamente" onAction={() => query.refetch()} /></View>;

  const showIsbnBadge = query.data.hasIsbnBadge && normalizeIsbnInput(form.isbn) === normalizeIsbnInput(query.data.isbn || '');
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>Atualize os dados da sua edição. O ISBN continua sendo validado pela API antes de receber o selo.</Text>
      {showIsbnBadge ? <IsbnBadge /> : null}
      <TextField label="Título *" value={form.title} onChangeText={(value) => set('title', value)} />
      <TextField label="Autores" value={form.authors} onChangeText={(value) => set('authors', value)} help="Separe por vírgulas" />
      <TextField label="Editora" value={form.publisher} onChangeText={(value) => set('publisher', value)} />
      <View style={styles.row}>
        <View style={styles.half}><TextField label="Ano" keyboardType="number-pad" value={form.year} onChangeText={(value) => set('year', value)} /></View>
        <View style={styles.half}><TextField label="Páginas" keyboardType="number-pad" value={form.pageCount} onChangeText={(value) => set('pageCount', value)} /></View>
      </View>
      <TextField label="Temas" value={form.subjects} onChangeText={(value) => set('subjects', value)} />
      <TextField label="ISBN" keyboardType="number-pad" value={form.isbn} onChangeText={(value) => set('isbn', value)} />
      <TextField label="Sinopse" value={form.synopsis} onChangeText={(value) => set('synopsis', value)} multiline />
      <BookPhotoPicker
        photos={photos}
        onAdd={() => void pickPhotos()}
        onMove={(from, to) => { photosAreDirty.current = true; setPhotos((current) => moveBookPhoto(current, from, to)); }}
        onRemove={confirmRemovePhoto}
        disabled={savePhotos.isPending}
      />
      <AppButton label="Salvar fotos" variant="secondary" loading={savePhotos.isPending} disabled={update.isPending} onPress={() => savePhotos.mutate()} />
      <AppButton label="Salvar alterações" loading={update.isPending} onPress={() => update.mutate()} />
      <View style={styles.danger}><AppButton label="Excluir livro" variant="ghost" icon="delete-outline" loading={remove.isPending} onPress={confirmDelete} /></View>
    </ScrollView>
  );
}
