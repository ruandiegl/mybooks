import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { useSession } from '../../providers/SessionProvider';
import { api, apiErrorMessage } from '../../services/api';
import { theme } from '../../styles/theme';
import type { ApiEnvelope, Book, Paginated } from '../../types/api';
import type { RootStackParamList } from '../../types/navigation';
import { styles } from './styles';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingBooks'>;

export function OnboardingBooks({ navigation }: Props) {
  const { refreshUser } = useSession();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const books = useQuery({
    queryKey: ['books', 'onboarding'],
    queryFn: async () => (await api.get<ApiEnvelope<Paginated<Book>>>('/api/v1/books', { params: { limit: 20, sort: 'recent' } })).data.data
  });

  const remove = (book: Book) => Alert.alert('Remover livro?', `“${book.title}” será removido da sua biblioteca.`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Remover', style: 'destructive', onPress: async () => {
      try {
        await api.delete(`/api/v1/books/${book.id}`);
        await Promise.all([books.refetch(), queryClient.invalidateQueries({ queryKey: ['books'] })]);
      } catch (error) { Alert.alert('Não foi possível remover', apiErrorMessage(error)); }
    } }
  ]);

  const finish = async () => {
    setBusy(true);
    try {
      await api.post('/api/v1/me/onboarding/books/complete');
      await refreshUser();
    } catch (error) {
      Alert.alert('Não foi possível continuar', apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <OnboardingProgress step={3} />
        <Text style={styles.title}>Comece sua biblioteca</Text>
        <Text style={styles.description}>Cadastre agora os livros que deseja colocar em circulação ou faça isso depois.</Text>
        <AppButton label="Adicionar livro" icon="add" variant="secondary" onPress={() => navigation.navigate('BookCreate')} />
        <View style={styles.list}>
          {books.data?.items.map((book) => (
            <Card key={book.id} style={styles.book}>
              <View style={styles.bookInfo}><Text style={styles.bookTitle}>{book.title}</Text><Text style={styles.bookMeta}>{book.authors.join(', ') || 'Autor não informado'}</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${book.title}`} onPress={() => navigation.navigate('BookEdit', { bookId: book.id })}><MaterialIcons name="edit" size={22} color={theme.colors.secondary} /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remover ${book.title}`} onPress={() => remove(book)}><MaterialIcons name="delete-outline" size={22} color={theme.colors.danger} /></Pressable>
            </Card>
          ))}
          {!books.isLoading && !books.data?.items.length ? <Text style={styles.empty}>Nenhum livro cadastrado ainda — tudo bem continuar depois.</Text> : null}
        </View>
        <AppButton label={books.data?.items.length ? 'Finalizar cadastro' : 'Entrar no aplicativo'} loading={busy} onPress={finish} />
        <AppButton label="Concluir depois" variant="ghost" disabled={busy} onPress={finish} />
      </ScrollView>
    </SafeAreaView>
  );
}
