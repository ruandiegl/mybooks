import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { IsbnBadge } from '../../components/IsbnBadge';
import { StateView } from '../../components/StateView';
import { TextField } from '../../components/TextField';
import { normalizeIsbnInput } from '../../features/books/isbnForm';
import { api, apiErrorMessage } from '../../services/api';
import type { ApiEnvelope, Book } from '../../types/api';
import type { RootStackParamList } from '../../types/navigation';
import { styles } from './styles';

type Props = NativeStackScreenProps<RootStackParamList, 'BookEdit'>;
type Form = { title: string; authors: string; publisher: string; synopsis: string; year: string; pageCount: string; subjects: string; isbn: string };

const empty: Form = { title: '', authors: '', publisher: '', synopsis: '', year: '', pageCount: '', subjects: '', isbn: '' };
const split = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);

export function BookEdit({ route, navigation }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(empty);
  const query = useQuery({ queryKey: ['book', route.params.bookId], queryFn: async () => (await api.get<ApiEnvelope<Book>>('/api/v1/books/' + route.params.bookId)).data.data });

  useEffect(() => {
    const book = query.data;
    if (!book) return;
    setForm({ title: book.title, authors: book.authors.join(', '), publisher: book.publisher || '', synopsis: book.synopsis || '', year: book.year ? String(book.year) : '', pageCount: book.pageCount ? String(book.pageCount) : '', subjects: book.subjects.join(', '), isbn: book.isbn || '' });
  }, [query.data]);

  const set = (key: keyof Form, value: string) => setForm((current) => ({ ...current, [key]: value }));
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
      <AppButton label="Salvar alterações" loading={update.isPending} onPress={() => update.mutate()} />
      <View style={styles.danger}><AppButton label="Excluir livro" variant="ghost" icon="delete-outline" loading={remove.isPending} onPress={confirmDelete} /></View>
    </ScrollView>
  );
}
