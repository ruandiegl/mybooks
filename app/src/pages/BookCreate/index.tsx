import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { IsbnBadge } from '../../components/IsbnBadge';
import { TextField } from '../../components/TextField';
import {
  mergeIsbnLookup,
  normalizeIsbnInput,
  type BookDraft,
  type EditableBookField
} from '../../features/books/isbnForm';
import { api, apiErrorMessage } from '../../services/api';
import { theme } from '../../styles/theme';
import type { ApiEnvelope, Book, IsbnLookup } from '../../types/api';
import type { RootStackParamList } from '../../types/navigation';
import { styles } from './styles';

type Props = NativeStackScreenProps<RootStackParamList, 'BookCreate'>;
type PickedImage = { uri: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; size: number };
type Presign = { imageId: string; uploadUrl: string; storageKey: string; headers: Record<string, string> };

const initialForm: BookDraft = { isbn: '', title: '', authors: '', publisher: '', synopsis: '', year: '', pageCount: '', subjects: '' };
const splitList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const isAllowedImageType = (value?: string): value is PickedImage['mimeType'] => value === 'image/jpeg' || value === 'image/png' || value === 'image/webp';

export function BookCreate({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [lookup, setLookup] = useState<IsbnLookup | null>(null);
  const [image, setImage] = useState<PickedImage | null>(null);
  const dirtyFields = useRef(new Set<EditableBookField>());
  const pendingIsbn = useRef<string | null>(null);
  const lastConfirmedIsbn = useRef<string | null>(null);

  const set = (key: keyof BookDraft, value: string) => {
    if (key !== 'isbn') dirtyFields.current.add(key);
    setForm((current) => ({ ...current, [key]: value }));
    if (key === 'isbn') {
      setLookup(null);
      lastConfirmedIsbn.current = null;
    }
  };

  const isbnMutation = useMutation({
    mutationFn: async (isbn: string) => (await api.get<ApiEnvelope<IsbnLookup>>('/api/v1/isbn/' + encodeURIComponent(isbn))).data.data,
    onSuccess: (data) => {
      lastConfirmedIsbn.current = data.isbn;
      setLookup(data);
      setForm((current) => mergeIsbnLookup(current, data, dirtyFields.current));
    },
    onError: (error) => Alert.alert('ISBN não encontrado', apiErrorMessage(error, 'Confira o número digitado ou continue o cadastro manualmente.')),
    onSettled: () => { pendingIsbn.current = null; }
  });

  function lookupIsbn() {
    const normalized = normalizeIsbnInput(form.isbn);
    if (!normalized || pendingIsbn.current === normalized || lastConfirmedIsbn.current === normalized) return;
    pendingIsbn.current = normalized;
    isbnMutation.mutate(normalized);
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [2, 3], quality: 0.82 });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.fileSize) return Alert.alert('Imagem inválida', 'Não foi possível identificar o tamanho da imagem.');
    if (!isAllowedImageType(asset.mimeType)) return Alert.alert('Formato não aceito', 'Escolha uma imagem JPEG, PNG ou WebP.');
    if (asset.fileSize > 8 * 1024 * 1024) return Alert.alert('Imagem muito grande', 'Escolha uma imagem de até 8 MB.');
    setImage({ uri: asset.uri, mimeType: asset.mimeType, size: asset.fileSize });
  }

  async function uploadCover(bookId: string, picked: PickedImage) {
    const presign = (await api.post<ApiEnvelope<Presign>>('/api/v1/books/' + bookId + '/images/presign', { mimeType: picked.mimeType, size: picked.size })).data.data;
    const blob = await (await fetch(picked.uri)).blob();
    const upload = await fetch(presign.uploadUrl, { method: 'PUT', headers: presign.headers, body: blob });
    if (!upload.ok) throw new Error('Falha no envio da imagem.');
    await api.post('/api/v1/books/' + bookId + '/images/complete', { imageId: presign.imageId, storageKey: presign.storageKey, mimeType: picked.mimeType, size: picked.size, isCover: true });
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
      let coverFailed = false;
      if (image) {
        try { await uploadCover(book.id, image); } catch { coverFailed = true; }
      }
      return { book, coverFailed };
    },
    onSuccess: ({ book, coverFailed }) => {
      void queryClient.invalidateQueries({ queryKey: ['books'] });
      Alert.alert(
        coverFailed ? 'Livro salvo sem a capa' : 'Livro publicado',
        coverFailed ? 'Os dados foram salvos, mas a capa não foi enviada. Você poderá tentar novamente na edição.' : 'Ele já está disponível na sua biblioteca.',
        [{ text: 'Ver livro', onPress: () => navigation.replace('BookDetails', { bookId: book.id }) }]
      );
    },
    onError: (error) => Alert.alert('Não foi possível publicar', apiErrorMessage(error, error instanceof Error ? error.message : undefined))
  });

  const lookupConfirmed = lookup?.isbn === normalizeIsbnInput(form.isbn);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Text style={styles.title}>Coloque um livro em circulação</Text>
          <Text style={styles.description}>O ISBN agiliza o preenchimento, mas não é obrigatório.</Text>
        </View>
        <Card style={styles.isbnCard}>
          <View style={styles.isbnRow}>
            <View style={styles.isbnField}><TextField label="ISBN" value={form.isbn} onChangeText={(value) => set('isbn', value)} onBlur={lookupIsbn} keyboardType="number-pad" placeholder="978..." help="Aceita ISBN-10 ou ISBN-13" /></View>
            <AppButton style={styles.lookup} label="Buscar" variant="secondary" loading={isbnMutation.isPending} disabled={!form.isbn.trim()} onPress={lookupIsbn} />
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
        <Text style={styles.section}>Capa</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={image ? 'Trocar imagem da capa' : 'Escolher imagem da capa'} onPress={pickImage} style={({ pressed }) => [styles.imageButton, pressed && styles.imagePressed]}>
          {image ? <Image source={{ uri: image.uri }} accessibilityLabel="Prévia da capa selecionada" style={styles.image} resizeMode="cover" /> : <><MaterialIcons name="add-photo-alternate" size={34} color={theme.colors.primary} /><Text style={styles.imageLabel}>Escolher imagem da capa</Text></>}
        </Pressable>
        <AppButton label="Publicar livro" icon="arrow-forward" loading={createMutation.isPending} onPress={() => createMutation.mutate()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
