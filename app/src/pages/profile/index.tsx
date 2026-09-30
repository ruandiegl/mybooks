import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/AppButton';
import { AppScreen } from '../../components/AppScreen';
import { Avatar } from '../../components/Avatar';
import { AvatarPicker } from '../../components/AvatarPicker';
import { Badge } from '../../components/Badge';
import { BookCard } from '../../components/BookCard';
import { ProfileMetricRow, type ProfileMetric } from '../../components/ProfileMetricRow';
import { ProfileTabs, type ProfileTabKey } from '../../components/ProfileTabs';
import { StateView } from '../../components/StateView';
import { TextField } from '../../components/TextField';
import { TopBar } from '../../components/TopBar';
import { maskBrazilianPhone } from '../../features/auth/inputMasks';
import { PremiumStatusCard, usePremiumOffer } from '../../features/premium/PremiumOfferProvider';
import { usePremiumStatus } from '../../features/premium/usePremiumStatus';
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
  const premiumOffer = usePremiumOffer();
  const premiumQuery = usePremiumStatus(session.user?.id, session.isSignedIn);
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const stackedIdentity = width < 360 || fontScale > 1.3;
  const bookWidth = (Math.min(width, 672) - theme.spacing.md * 3) / 2;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProfileTabKey>('shelf');
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [interests, setInterests] = useState('');
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
    setFirstName(profileQuery.data.firstName || '');
    setLastName(profileQuery.data.lastName || '');
    setCity(profileQuery.data.city || '');
    setBio(profileQuery.data.bio || '');
    setPhone(maskBrazilianPhone(profileQuery.data.phone || ''));
    setInterests(profileQuery.data.interests.join(', '));
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => (await api.patch<ApiEnvelope<User>>('/api/v1/me', {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      city: city.trim() || null,
      bio: bio.trim() || null,
      phone: phone.trim() || null,
      interests: interests.split(',').map((item) => item.trim()).filter(Boolean)
    })).data.data,
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
    setFirstName(profile?.firstName || '');
    setLastName(profile?.lastName || '');
    setCity(profile?.city || '');
    setBio(profile?.bio || '');
    setPhone(maskBrazilianPhone(profile?.phone || ''));
    setInterests(profile?.interests.join(', ') || '');
    setNameError(undefined);
    setEditing(true);
  }

  function hasChanges() {
    return Boolean(profile && (
      firstName !== (profile.firstName || '')
      || lastName !== (profile.lastName || '')
      || city !== (profile.city || '')
      || bio !== (profile.bio || '')
      || phone !== maskBrazilianPhone(profile.phone || '')
      || interests !== profile.interests.join(', ')
    ));
  }

  function closeEditor() {
    if (!hasChanges()) return setEditing(false);
    Alert.alert('Descartar alterações?', 'As informações editadas ainda não foram salvas.', [
      { text: 'Continuar editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => setEditing(false) }
    ]);
  }

  function saveProfile() {
    if (!firstName.trim()) {
      setNameError('Digite seu nome.');
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
      <TopBar title="Meu perfil" action={
        <AppButton label="Editar" accessibilityLabel="Editar perfil" variant="outline" icon="edit" style={styles.editButton} onPress={openEditor} />
      } />
      <View style={styles.identity}>
        <View style={[styles.identityRow, stackedIdentity && styles.identityStacked]}>
          <Avatar name={profile?.name || 'Leitor TrocaLivros'} url={profile?.avatarUrl} size={72} />
          <View style={[styles.identityCopy, stackedIdentity && styles.identityCopyStacked]}>
            <Text accessibilityRole="header" style={styles.name}>{profile?.name}</Text>
            {profile?.city ? <View style={styles.location}>
              <MaterialIcons name="place" size={16} color={theme.colors.secondary} />
              <Text style={styles.locationText}>{profile.city}</Text>
            </View> : null}
          </View>
        </View>
        {profile?.bio ? <Text numberOfLines={3} style={styles.bio}>{profile.bio}</Text> : null}
      </View>
      <PremiumStatusCard
        status={premiumQuery.data}
        loading={premiumQuery.isLoading}
        unavailable={premiumQuery.isError}
        verified={Boolean(profile?.emailVerifiedAt)}
        onPress={() => {
          if (premiumQuery.isError) void premiumQuery.refetch();
          premiumOffer.openOffer();
        }}
      />
      {metrics.length === 3 ? <View style={styles.metrics}><ProfileMetricRow metrics={metrics} /></View> : null}
      <ProfileTabs value={activeTab} onChange={setActiveTab} />
    </View>
  );

  const shelfHeader = (
    <View style={styles.listHeader}>
      {profileIntro}
      <View style={[styles.collectionHeader, fontScale > 1.3 && styles.collectionStacked]}>
        <View style={styles.collectionCopy}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Seus livros</Text>
        </View>
        {books.length > 0 ? <AppButton label="Adicionar" accessibilityLabel="Adicionar livro" icon="add" style={styles.addBook} onPress={() => navigation.navigate('BookCreate')} /> : null}
      </View>
    </View>
  );

  const aboutHeader = (
    <View style={styles.listHeader}>
      {profileIntro}
    </View>
  );

  const emptyLibrary = booksQuery.isLoading
    ? <StateView compact loading title="Abrindo sua estante" />
    : booksQuery.isError
      ? <StateView compact title="Não foi possível abrir sua estante" description="Confira a conexão e tente novamente." icon="cloud-off" actionLabel="Tentar novamente" onAction={() => booksQuery.refetch()} />
      : <StateView compact title="Sua estante começa aqui" description="Adicione seu primeiro livro para encontrar leitores e combinar trocas." icon="auto-stories" actionLabel="Adicionar livro" actionVariant="primary" onAction={() => navigation.navigate('BookCreate')} />;

  if (profileQuery.isLoading) return <AppScreen><StateView loading title="Preparando seu perfil" /></AppScreen>;
  if (profileQuery.isError || !profile) return <AppScreen><StateView title="Perfil indisponível" description="Não foi possível carregar sua identidade agora." icon="cloud-off" actionLabel="Tentar novamente" onAction={() => profileQuery.refetch()} /></AppScreen>;

  return (
    <AppScreen style={styles.screen}>
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
        </View>}
        refreshControl={<RefreshControl refreshing={profileQuery.isRefetching || booksQuery.isRefetching} onRefresh={refreshAll} tintColor={theme.colors.primary} />}
        onEndReached={() => { if (booksQuery.hasNextPage && !booksQuery.isFetchingNextPage) void booksQuery.fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => <BookCard book={item} style={{ flexGrow: 0, flexShrink: 0, flexBasis: bookWidth, width: bookWidth }} onPress={() => navigation.navigate('BookDetails', { bookId: item.id })} />}
      /> : <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={profileQuery.isRefetching || booksQuery.isRefetching} onRefresh={refreshAll} tintColor={theme.colors.primary} />}
      >
        {aboutHeader}
        <View style={styles.aboutSection}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Suas informações</Text>
          <View style={styles.aboutRow}><MaterialIcons name="person-outline" size={20} color={theme.colors.secondary} /><View style={styles.aboutCopy}><Text style={styles.aboutLabel}>Nome</Text><Text style={styles.aboutValue}>{profile.name}</Text></View></View>
          <View style={styles.aboutRow}><MaterialIcons name="place" size={20} color={theme.colors.secondary} /><View style={styles.aboutCopy}><Text style={styles.aboutLabel}>Cidade</Text><Text style={styles.aboutValue}>{profile.city || 'Ainda não informada'}</Text></View></View>
          <View style={styles.aboutRow}><MaterialIcons name="mail-outline" size={20} color={theme.colors.secondary} /><View style={styles.aboutCopy}><Text style={styles.aboutLabel}>E-mail</Text><Text style={styles.aboutValue}>{profile.email || 'Ainda não informado'}</Text></View></View>
          <View style={styles.aboutRow}><MaterialIcons name="phone" size={20} color={theme.colors.secondary} /><View style={styles.aboutCopy}><Text style={styles.aboutLabel}>Telefone</Text><Text style={styles.aboutValue}>{profile.phone || 'Ainda não informado'}</Text></View></View>
          <View style={styles.aboutRow}><MaterialIcons name="menu-book" size={20} color={theme.colors.secondary} /><View style={styles.aboutCopy}><Text style={styles.aboutLabel}>Bio</Text><Text style={styles.aboutValue}>{profile.bio || 'Você ainda não escreveu uma bio.'}</Text></View></View>
        </View>
        <View style={styles.accountSection}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Conta</Text>
          <Badge label="Conta protegida" variant="violet" />
          <AppButton label="Sair da conta" variant="ghost" icon="logout" style={styles.signOut} onPress={() => {
            void session.signOut().catch((error) => {
              Alert.alert('Não foi possível sair', apiErrorMessage(error, 'Não foi possível revogar a sessão. Confira a conexão e tente novamente.'));
            });
          }} />
        </View>
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
              <View style={styles.editorIdentity}><AvatarPicker name={[firstName, lastName].filter(Boolean).join(' ')} avatarUrl={profile.avatarUrl} onUploaded={() => { void profileQuery.refetch(); void session.refreshUser(); }} /></View>
              <TextField label="Nome" value={firstName} maxLength={50} onChangeText={(value) => { setFirstName(value); if (nameError) setNameError(undefined); }} error={nameError} autoCapitalize="words" />
              <TextField label="Sobrenome" value={lastName} maxLength={80} onChangeText={setLastName} autoCapitalize="words" />
              <TextField label="Cidade" value={city} maxLength={100} onChangeText={setCity} placeholder="Ex.: São Paulo" />
              <TextField label="Telefone" value={phone} onChangeText={(value) => setPhone(maskBrazilianPhone(value))} keyboardType="phone-pad" textContentType="telephoneNumber" placeholder="(11) 91234-5678" maxLength={15} />
              <TextField label="Bio" value={bio} onChangeText={setBio} maxLength={280} multiline placeholder="Conte um pouco sobre seus gostos literários" help={`${bio.length}/280 caracteres`} />
              <TextField label="Interesses" value={interests} onChangeText={setInterests} placeholder="Fantasia, clássicos, romance" help="Separe por vírgulas." />
              <AppButton label="Salvar alterações" icon="check" loading={saveMutation.isPending} onPress={saveProfile} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </AppScreen>
  );
}
