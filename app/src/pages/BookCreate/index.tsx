import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { BarcodeScannerModal } from '../../components/BarcodeScannerModal';
import { BookPhotoPicker } from '../../components/BookPhotoPicker';
import { Card } from '../../components/Card';
import { IsbnBadge } from '../../components/IsbnBadge';
import { TextField } from '../../components/TextField';
import {
  getIsbnLookupCandidate,
  getScannedIsbnLookupDecision,
  mergeIsbnLookup,
  normalizeIsbnInput,
  shouldApplyIsbnLookup,
  type BookDraft,
  type EditableBookField
} from '../../features/books/isbnForm';
import {
  appendBookPhotos,
  BookPhotoError,
  createBookPhoto,
  MAX_BOOK_PHOTOS,
  moveBookPhoto,
  removeBookPhoto,
  type BookPhotoDraft
} from '../../features/books/bookPhotos';
import { uploadBookPhoto } from '../../features/books/bookPhotoUpload';
import { api, apiErrorMessage } from '../../services/api';
import { Alert } from '../../services/notice';
import { preparePickedImage, releasePreparedImage, type PreparedUploadImage } from '../../features/media/preparePickedImage';
import { theme } from '../../styles/theme';
import type { ApiEnvelope, Book, IsbnLookup } from '../../types/api';
import type { RootStackParamList } from '../../types/navigation';
import { styles } from './styles';

type Props = NativeStackScreenProps<RootStackParamList, 'BookCreate'>;

const initialForm: BookDraft = { isbn: '', title: '', authors: '', publisher: '', synopsis: '', year: '', pageCount: '', subjects: '' };
const splitList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
export function BookCreate({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [lookup, setLookup] = useState<IsbnLookup | null>(null);
  const [photos, setPhotos] = useState<BookPhotoDraft[]>([]);
  const preparedImages = useRef(new Map<string, PreparedUploadImage>());
  const pendingPhotosBookId = useRef<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const dirtyFields = useRef(new Set<EditableBookField>());
  const currentIsbn = useRef('');
  const pendingIsbn = useRef<string | null>(null);
  const lastConfirmedIsbn = useRef<string | null>(null);

  useEffect(() => () => {
    const draft = pendingPhotosBookId.current
      ? queryClient.getQueryData<{ photos: BookPhotoDraft[] }>(['book-photos-draft', pendingPhotosBookId.current])
      : null;
    const retainedUris = new Set(draft?.photos.map((photo) => photo.uri));
    for (const image of preparedImages.current.values()) {
      if (!retainedUris.has(image.uri)) releasePreparedImage(image);
    }
  }, [queryClient]);

  const set = (key: keyof BookDraft, value: string) => {
    if (key !== 'isbn') dirtyFields.current.add(key);
    setForm((current) => ({ ...current, [key]: value }));
    if (key === 'isbn') {
      currentIsbn.current = value;
      pendingIsbn.current = null;
      setLookup(null);
      lastConfirmedIsbn.current = null;
    }
  };

  const isbnMutation = useMutation({
    mutationFn: async (isbn: string) => (await api.get<ApiEnvelope<IsbnLookup>>('/api/v1/isbn/' + encodeURIComponent(isbn))).data.data,
    onSuccess: (data, requestedIsbn) => {
      if (!shouldApplyIsbnLookup(requestedIsbn, currentIsbn.current)) return;
      lastConfirmedIsbn.current = data.isbn;
      setLookup(data);
      setForm((current) => mergeIsbnLookup(current, data, dirtyFields.current));
    },
    onError: (error, requestedIsbn) => {
      if (!shouldApplyIsbnLookup(requestedIsbn, currentIsbn.current)) return;
      Alert.alert('ISBN não encontrado', apiErrorMessage(error, 'Confira o número digitado ou continue o cadastro manualmente.'));
    },
    onSettled: (_data, _error, requestedIsbn) => {
      if (pendingIsbn.current === requestedIsbn) pendingIsbn.current = null;
    }
  });

  function lookupIsbn(value = form.isbn) {
    const normalized = getIsbnLookupCandidate(value, pendingIsbn.current, lastConfirmedIsbn.current);
    if (!normalized) return;
    currentIsbn.current = normalized;
    setForm((current) => ({ ...current, isbn: normalized }));
    pendingIsbn.current = normalized;
    isbnMutation.mutate(normalized);
  }

  function handleScannedIsbn(isbn: string) {
    const decision = getScannedIsbnLookupDecision(
      isbn,
      pendingIsbn.current,
      lastConfirmedIsbn.current
    );
    setScannerVisible(false);
    currentIsbn.current = decision.normalizedIsbn;
    setForm((current) => ({ ...current, isbn: decision.normalizedIsbn }));

    if (decision.shouldClearConfirmedLookup) {
      lastConfirmedIsbn.current = null;
      setLookup(null);
    }
    if (decision.shouldLookup) lookupIsbn(decision.normalizedIsbn);
  }

  function openScanner() {
    Keyboard.dismiss();
    setScannerVisible(true);
  }

  async function pickImages() {
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
        const prepared = Platform.OS === 'web' ? await preparePickedImage(asset) : null;
        const photo = createBookPhoto(prepared
          ? { uri: prepared.uri, mimeType: prepared.mimeType, fileSize: prepared.size }
          : asset, Crypto.randomUUID());
        validPhotos.push(photo);
        if (prepared) preparedImages.current.set(photo.uri, prepared);
      } catch (error) {
        firstValidationError ??= error;
      }
    }
    try {
      setPhotos((current) => appendBookPhotos(current, validPhotos.slice(0, remaining)));
    } catch (error) {
      Alert.alert('Limite de fotos', apiErrorMessage(error, error instanceof Error ? error.message : undefined));
      return;
    }
    if (firstValidationError) {
      const message = firstValidationError instanceof BookPhotoError
        ? firstValidationError.message
        : 'Uma das imagens não pôde ser usada.';
      Alert.alert('Foto não adicionada', message);
    }
    if (validPhotos.length > remaining) Alert.alert('Limite de fotos', 'Um livro pode ter até três fotos.');
  }

  function removePhoto(index: number) {
    const photo = photos[index];
    const prepared = photo && preparedImages.current.get(photo.uri);
    if (prepared) {
      releasePreparedImage(prepared);
      preparedImages.current.delete(photo.uri);
    }
    setPhotos((current) => removeBookPhoto(current, index));
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error('Informe o título do livro.');
      const payload = {
        title: form.title.trim(),
        authors: splitList(form.authors),
        publisher: form.publisher.trim() || null,
        synopsis: form.synopsis.trim() || null,
        year: form.year ? Number(form.year) : null,
        pageCount: form.pageCount ? Number(form.pageCount) : null,
        subjects: splitList(form.subjects),
        isbn: form.isbn.trim() || null
      };
      const book = (await api.post<ApiEnvelope<Book>>('/api/v1/books', payload)).data.data;
      let photosPending: BookPhotoDraft[] = [];
      for (const [index, photo] of photos.entries()) {
        try {
          await uploadBookPhoto(book.id, photo);
        } catch {
          photosPending = photos.slice(index);
          break;
        }
      }
      return { book, photosPending };
    },
    onSuccess: ({ book, photosPending }) => {
      void queryClient.invalidateQueries({ queryKey: ['books'] });
      void queryClient.invalidateQueries({ queryKey: ['discover'] });
      if (photosPending.length) {
        pendingPhotosBookId.current = book.id;
        queryClient.setQueryData(['book-photos-draft', book.id], { mode: 'append', photos: photosPending });
        Alert.alert('Livro publicado; fotos pendentes', 'O livro já está na sua biblioteca. Algumas fotos não foram enviadas; você pode tentar novamente na edição.', [
          { text: 'Ver livro', onPress: () => navigation.replace('BookDetails', { bookId: book.id }) },
          { text: 'Editar fotos', onPress: () => navigation.replace('BookEdit', { bookId: book.id }) }
        ]);
        return;
      }
      Alert.alert('Livro publicado', 'Ele já está disponível na sua biblioteca.', [
        { text: 'Ver livro', onPress: () => navigation.replace('BookDetails', { bookId: book.id }) }
      ]);
    },
    onError: (error) => Alert.alert('Não foi possível publicar', apiErrorMessage(error, error instanceof Error ? error.message : undefined))
  });

  const lookupConfirmed = lookup?.isbn === normalizeIsbnInput(form.isbn);

  return (
    <>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.intro}>
            <Text style={styles.title}>Coloque um livro em circulação</Text>
            <Text style={styles.description}>O ISBN agiliza o preenchimento, mas não é obrigatório.</Text>
          </View>
          <Card style={styles.isbnCard}>
            <TextField label="ISBN" value={form.isbn} onChangeText={(value) => set('isbn', value)} autoCapitalize="characters" autoCorrect={false} placeholder="978..." help="Aceita ISBN-10 ou ISBN-13" />
            <View style={styles.isbnActions}>
              <AppButton style={styles.isbnAction} label="Buscar" variant="secondary" loading={isbnMutation.isPending} disabled={!form.isbn.trim()} onPress={() => lookupIsbn()} />
              <AppButton accessibilityLabel="Ler código de barras do ISBN" style={styles.isbnAction} label="Ler código" icon="qr-code-scanner" variant="outline" disabled={isbnMutation.isPending} onPress={openScanner} />
            </View>
            {lookupConfirmed ? <IsbnBadge /> : null}
          </Card>
          <Text style={styles.section}>Dados do livro</Text>
          <TextField label="Título *" value={form.title} onChangeText={(value) => set('title', value)} placeholder="Ex.: Torto Arado" />
          <TextField label="Autores" value={form.authors} onChangeText={(value) => set('authors', value)} placeholder="Separe por vírgulas" />
          <TextField label="Editora" value={form.publisher} onChangeText={(value) => set('publisher', value)} />
          <View style={styles.row}>
            <View style={styles.half}><TextField label="Ano" value={form.year} keyboardType="number-pad" onChangeText={(value) => set('year', value)} /></View>
            <View style={styles.half}><TextField label="Páginas" value={form.pageCount} keyboardType="number-pad" onChangeText={(value) => set('pageCount', value)} /></View>
          </View>
          <TextField label="Temas" value={form.subjects} onChangeText={(value) => set('subjects', value)} placeholder="Romance, Brasil, Ficção" />
          <TextField label="Sinopse" value={form.synopsis} onChangeText={(value) => set('synopsis', value)} multiline />
          <BookPhotoPicker
            photos={photos}
            onAdd={() => void pickImages()}
            onMove={(from, to) => setPhotos((current) => moveBookPhoto(current, from, to))}
            onRemove={removePhoto}
            disabled={createMutation.isPending}
          />
          <AppButton label="Publicar livro" icon="arrow-forward" loading={createMutation.isPending} onPress={() => createMutation.mutate()} />
        </ScrollView>
      </KeyboardAvoidingView>
      <BarcodeScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onIsbnScanned={handleScannedIsbn}
      />
    </>
  );
}
