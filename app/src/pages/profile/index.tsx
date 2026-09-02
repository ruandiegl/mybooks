import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/AppButton';
import { AppScreen } from '../../components/AppScreen';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { BookCard } from '../../components/BookCard';
import { Card } from '../../components/Card';
import { ProfileHero } from '../../components/ProfileHero';
import { ProfileMetricRow, type ProfileMetric } from '../../components/ProfileMetricRow';
import { ProfileTabs, type ProfileTabKey } from '../../components/ProfileTabs';
import { StateView } from '../../components/StateView';
import { TextField } from '../../components/TextField';
import { useSession } from '../../providers/SessionProvider';
import { api, apiErrorMessage } from '../../services/api';
import { theme } from '../../styles/theme';
import type { ApiEnvelope, Book, Paginated, User } from '../../types/api';
import type { RootStackParamList } from '../../types/navigation';
import { styles } from './styles';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type Props = { navigation: Navigation };

export function Profile({ navigation }: Props) {
  const session = useSession();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProfileTabKey>('shelf');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();

  const profileQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get<ApiEnvelope<User>>('/api/v1/me')).data.data
  });
  const booksQuery = useInfiniteQuery({
    queryKey: ['books', 'mine', 'profile'],
    initialPageParam: '',
    queryFn: async ({ pageParam }) => (await api.get<ApiEnvelope<Paginated<Book>>>('/api/v1/books', { params: { limit: 12, cursor: pageParam || undefined, sort: 'recent' } })).data.data,
    getNextPageParam: (lastPage) => lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.nextCursor || undefined : undefined
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setName(profileQuery.data.name);
    setCity(profileQuery.data.city || '');
    setBio(profileQuery.data.bio || '');
    setPhone(profileQuery.data.phone || '');
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => (await api.patch<ApiEnvelope<User>>('/api/v1/me', { name: name.trim(), city: city.trim() || null, bio: bio.trim() || null, phone: phone.trim() || null })).data.data,
    onSuccess: (user) => {
      queryClient.setQueryData(['me'], user);
      setEditing(false);
      Alert.alert('Perfil atualizado', 'Suas informações foram salvas.');
    },
    onError: (error) => Alert.alert('Não foi possível salvar', apiErrorMessage(error))
  });

  const books = booksQuery.data?.pages.flatMap((page) => page.items) || [];
  const profile = profileQuery.data;
  const stats = profile?.stats;
  const metrics: ProfileMetric[] = stats ? [
    { value: stats.bookCount, label: 'livros', accessibilityLabel: `${stats.bookCount} livros na estante` },
    { value: stats.matchCount, label: 'matches', accessibilityLabel: `${stats.matchCount} matches ativos` },
    { value: stats.conversationCount, label: 'conversas', accessibilityLabel: `${stats.conversationCount} conversas` }
  ] : [];

  function openEditor() {
    setNameError(undefined);
    setEditing(true);
  }

  function hasChanges() {
    return Boolean(profile && (name !== profile.name || city !== (profile.city || '') || bio !== (profile.bio || '') || phone !== (profile.phone || '')));
  }

  function closeEditor() {
    if (!hasChanges()) return setEditing(false);
    Alert.alert('Descartar alterações?', 'As informações editadas ainda não foram salvas.', [
      { text: 'Continuar editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => setEditing(false) }
    ]);
  }

  function saveProfile() {
    if (name.trim().length < 2) {
      setNameError('Digite pelo menos 2 caracteres.');
      return;
    }
    setNameError(undefined);
    saveMutation.mutate();
  }

  function refreshAll() {
    void Promise.all([profileQuery.refetch(), booksQuery.refetch()]);
  }

  const profileIntro = (
    <View style={styles.introStack}>
      <View style={styles.heroWrap}>
        <ProfileHero onEdit={openEditor} />
        <View style={styles.identityCard}>
          <View style={styles.avatarFrame}>
            <Avatar name={profile?.name || 'Leitor MyBooks'} url={profile?.avatarUrl} size={92} />
          </View>
          <Text style={styles.name}>{profile?.name}</Text>
          {profile?.city ? <View style={styles.location}><MaterialIcons name="place" size={16} color={theme.colors.primary} /><Text style={styles.locationText}>{profile.city}</Text></View> : null}
          <Text numberOfLines={3} style={styles.bio}>{profile?.bio || 'Conte um pouco sobre as histórias que você quer colocar em circulação.'}</Text>
          <Badge label={session.mode === 'clerk' ? 'Conta protegida' : 'Ambiente local'} variant="violet" />
        </View>
      </View>
      {metrics.length === 3 ? <Card style={styles.metricCard}><ProfileMetricRow metrics={metrics} /></Card> : null}
    </View>
  );

  const shelfHeader = (
    <View style={styles.listHeader}>
      {profileIntro}
      <View style={styles.collectionHeader}>
        <View style={styles.collectionCopy}>
          <Text style={styles.eyebrow}>Minha biblioteca</Text>
          <Text style={styles.sectionTitle}>Livros em circulação</Text>
        </View>
        <AppButton label="Adicionar" variant="outline" icon="add" style={styles.addBook} onPress={() => navigation.navigate('BookCreate')} />
      </View>
      <ProfileTabs value={activeTab} onChange={setActiveTab} />
    </View>
  );

  const aboutHeader = (
    <View style={styles.listHeader}>
      {profileIntro}
      <ProfileTabs value={activeTab} onChange={setActiveTab} />
    </View>
  );

  const emptyLibrary = booksQuery.isLoading
    ? <StateView loading title="Abrindo sua estante" />
    : booksQuery.isError
      ? <StateView title="Não foi possível abrir sua estante" description="Confira a conexão e tente novamente." icon="cloud-off" actionLabel="Tentar novamente" onAction={() => booksQuery.refetch()} />
      : <StateView title="Sua estante está esperando uma história" description="Cadastre seu primeiro livro e coloque uma nova leitura em circulação." icon="auto-stories" actionLabel="Adicionar livro" onAction={() => navigation.navigate('BookCreate')} />;

  if (profileQuery.isLoading) return <AppScreen><StateView loading title="Preparando seu perfil" /></AppScreen>;
  if (profileQuery.isError || !profile) return <AppScreen><StateView title="Perfil indisponível" description="Não foi possível carregar sua identidade agora." icon="cloud-off" actionLabel="Tentar novamente" onAction={() => profileQuery.refetch()} /></AppScreen>;

  return (
    <AppScreen>
      {activeTab === 'shelf' ? <FlatList
        data={books}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.bookRow}
        contentContainerStyle={styles.bookList}
        ListHeaderComponent={shelfHeader}
        ListEmptyComponent={emptyLibrary}
        ListFooterComponent={<View style={styles.footer}>
          {booksQuery.isFetchingNextPage ? <Text style={styles.footerText}>Carregando mais livros…</Text> : booksQuery.hasNextPage ? <AppButton label="Carregar mais" variant="outline" onPress={() => booksQuery.fetchNextPage()} /> : null}
          <AppButton label="Sair da conta" variant="ghost" icon="logout" onPress={() => session.signOut()} />
        </View>}
        refreshControl={<RefreshControl refreshing={profileQuery.isRefetching || booksQuery.isRefetching} onRefresh={refreshAll} tintColor={theme.colors.primary} />}
        onEndReached={() => { if (booksQuery.hasNextPage && !booksQuery.isFetchingNextPage) void booksQuery.fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => <BookCard book={item} style={styles.bookItem} onPress={() => navigation.navigate('BookDetails', { bookId: item.id })} />}
      /> : <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(112, insets.bottom + 72) }]}
        refreshControl={<RefreshControl refreshing={profileQuery.isRefetching || booksQuery.isRefetching} onRefresh={refreshAll} tintColor={theme.colors.primary} />}
      >
        {aboutHeader}
        <Card style={styles.aboutCard}>
          <View style={styles.aboutIntro}><Text style={styles.eyebrow}>Sobre você</Text><Text style={styles.aboutTitle}>Uma pequena apresentação para cada troca.</Text></View>
          <View style={styles.aboutRow}><MaterialIcons name="person-outline" size={20} color={theme.colors.secondary} /><View style={styles.aboutCopy}><Text style={styles.aboutLabel}>Nome</Text><Text style={styles.aboutValue}>{profile.name}</Text></View></View>
          <View style={styles.aboutRow}><MaterialIcons name="place" size={20} color={theme.colors.secondary} /><View style={styles.aboutCopy}><Text style={styles.aboutLabel}>Cidade</Text><Text style={styles.aboutValue}>{profile.city || 'Ainda não informada'}</Text></View></View>
          <View style={styles.aboutRow}><MaterialIcons name="mail-outline" size={20} color={theme.colors.secondary} /><View style={styles.aboutCopy}><Text style={styles.aboutLabel}>E-mail</Text><Text style={styles.aboutValue}>{profile.email || 'Ainda não informado'}</Text></View></View>
          <View style={styles.aboutRow}><MaterialIcons name="menu-book" size={20} color={theme.colors.secondary} /><View style={styles.aboutCopy}><Text style={styles.aboutLabel}>Bio</Text><Text style={styles.aboutValue}>{profile.bio || 'Você ainda não escreveu uma bio.'}</Text></View></View>
          <AppButton label="Editar perfil" variant="outline" icon="edit" onPress={openEditor} />
        </Card>
        <AppButton label="Sair da conta" variant="ghost" icon="logout" onPress={() => session.signOut()} />
      </ScrollView>}
      <Modal visible={editing} animationType="slide" onRequestClose={closeEditor}>
        <View style={[styles.modalSafe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <KeyboardAvoidingView style={styles.modalKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalHeader}>
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar edição de perfil" style={({ pressed }) => [styles.modalClose, pressed && styles.modalPressed]} onPress={closeEditor}><MaterialIcons name="close" size={24} color={theme.colors.foreground} /></Pressable>
              <Text style={styles.modalTitle}>Editar perfil</Text>
              <View style={styles.modalHeaderSpacer} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScroll}>
              <View style={styles.editorIdentity}><View style={styles.editorAvatar}><Avatar name={name || 'Leitor MyBooks'} url={profile.avatarUrl} size={72} /></View><Text style={styles.editorHint}>Sua foto vem da conta conectada e poderá ser alterada quando o perfil tiver um fluxo de mídia próprio.</Text></View>
              <TextField label="Nome" value={name} onChangeText={(value) => { setName(value); if (nameError) setNameError(undefined); }} error={nameError} autoCapitalize="words" />
              <TextField label="Cidade" value={city} onChangeText={setCity} placeholder="Ex.: São Paulo" />
              <TextField label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" textContentType="telephoneNumber" />
              <TextField label="Bio" value={bio} onChangeText={setBio} multiline placeholder="Conte um pouco sobre seus gostos literários" help="Use até 280 caracteres." />
              <AppButton label="Salvar alterações" icon="check" loading={saveMutation.isPending} onPress={saveProfile} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </AppScreen>
  );
}
