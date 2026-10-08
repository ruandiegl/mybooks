import { useThemedStyles } from '../../styles/useThemedStyles';
import { useIsFocused } from '@react-navigation/native';
import { useAvatarRefresh } from '../../features/avatar/useAvatarRefresh';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AppScreen } from '../../components/AppScreen';
import { Avatar } from '../../components/Avatar';
import { AvatarEditor } from '../../components/AvatarEditor';
import { AvatarPhotoModal } from '../../components/AvatarPhotoModal';
import { useAvatarEditor } from '../../features/avatar/useAvatarEditor';
import { avatarDescriptorOf } from '../../features/avatar/avatarTypes';
import { avatarLongPressFeedback } from '../../features/avatar/avatarLongPressFeedback';
import { BookCard } from '../../components/BookCard';
import { ProfileMetricRow, type ProfileMetric } from '../../components/ProfileMetricRow';
import { ProfileTabs, type ProfileTabKey } from '../../components/ProfileTabs';
import { StateView } from '../../components/StateView';
import { TopBar } from '../../components/TopBar';
import { ProfileSettingsModal } from '../../components/ProfileSettingsModal';
import { ProfileEditForm } from '../../components/ProfileEditForm';
import { AppearanceSettingsPanel } from '../../components/AppearanceSettingsPanel';
import { NotificationSettingsPanel } from '../../components/NotificationSettingsPanel';
import { AccountSettingsPanel } from '../../components/AccountSettingsPanel';
import { PasswordChangeForm } from '../../components/PasswordChangeForm';
import { ProfileHelpPanel } from '../../components/ProfileHelpPanel';
import { AboutAppPanel } from '../../components/AboutAppPanel';
import { useAccountSecurity } from '../../features/auth/useAccountSecurity';
import { useAccountPreferences } from '../../features/settings/useAccountPreferences';
import { useProfileSettings } from '../../features/settings/useProfileSettings';
import { useProfileEditor } from '../../features/profile/useProfileEditor';
import type { SettingsRoute } from '../../features/settings/settingsTypes';
import { PremiumStatusCard, usePremiumOffer } from '../../features/premium/PremiumOfferProvider';
import { usePremiumStatus } from '../../features/premium/usePremiumStatus';
import { useSession } from '../../providers/SessionProvider';
import { api } from '../../services/api';
import { useAppTheme } from '../../providers/ThemeProvider';
import type { ApiEnvelope, Book, Paginated, User } from '../../types/api';
import type { RootStackParamList } from '../../types/navigation';
import { createStyles } from './styles';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type Props = { navigation: Navigation };

export function Profile({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const { theme, preference } = useAppTheme();

  const session = useSession();
  const premiumOffer = usePremiumOffer();
  const premiumQuery = usePremiumStatus(session.user?.id, session.isSignedIn);
  const { width, fontScale } = useWindowDimensions();
  const stackedIdentity = width < 360 || fontScale > 1.3;
  const bookWidth = (Math.min(width, 672) - theme.spacing.md * 3) / 2;
  const [activeTab, setActiveTab] = useState<ProfileTabKey>('shelf');
  const [viewingPhoto, setViewingPhoto] = useState(false);
  const photoOpened = useRef(false);
  const menuButton = useRef<View>(null);
  const [menuFocused, setMenuFocused] = useState(false);
  const settingsOwner = useRef<ReturnType<typeof session.captureActor>>(null);

  const profileQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get<ApiEnvelope<User>>('/api/v1/me')).data.data
  });
  const avatarEditor = useAvatarEditor(session.user?.id, (avatar) => {
    if (session.user) session.updateAvatar(avatar, session.user.id);
    setViewingPhoto(false);
  });
  const completedEdit = useRef<ReturnType<typeof session.captureActor>>(null);
  const editor = useProfileEditor(profileQuery.data, () => { completedEdit.current = session.captureActor(); });
  const actor = session.captureActor();
  const accountPreferences = useAccountPreferences();
  const security = useAccountSecurity();
  const busy = avatarEditor.busy || editor.pending || security.busy || accountPreferences.saving;
  const settings = useProfileSettings({ actor, isBusy: busy,
    hasUnsavedChanges: editor.dirty || security.dirty,
    isDirtyForRoute: route => route === 'editProfile' ? editor.dirty : (route === 'password' || route === 'confirmSignOutAll') && security.dirty,
    cropActive: Boolean(avatarEditor.source), onCancelCrop: avatarEditor.cancel,
    onDiscard: () => { editor.reset(); security.reset(); } });
  const wasSettingsOpen = useRef(false);
  useEffect(() => {
    if (busy || !completedEdit.current) return;
    const owner = completedEdit.current; completedEdit.current = null;
    if (session.isActorCurrent(owner) && settings.visible) settings.openMenu();
  }, [busy, settings.visible, actor?.userId, actor?.epoch]);
  useEffect(() => {
    if (settings.visible && !wasSettingsOpen.current) settingsOwner.current = actor;
    if (!settings.visible && wasSettingsOpen.current) {
      security.reset(); editor.reset(); avatarEditor.cancel();
      if (Platform.OS === 'web' && settingsOwner.current && session.isActorCurrent(settingsOwner.current)) menuButton.current?.focus();
      settingsOwner.current = null;
    }
    wasSettingsOpen.current = settings.visible;
    if (settings.visible && !['password', 'confirmSignOutAll', 'confirmDiscard'].includes(settings.route)) security.reset();
  }, [settings.visible, settings.route]);
  useLayoutEffect(() => {
    premiumOffer.setPresentationBlocked('profile-overlay', settings.visible || viewingPhoto);
    return () => premiumOffer.setPresentationBlocked('profile-overlay', false);
  }, [premiumOffer.setPresentationBlocked, settings.visible, viewingPhoto]);
  const booksQuery = useInfiniteQuery({
    queryKey: ['books', 'mine', 'profile'],
    initialPageParam: '',
    queryFn: async ({ pageParam }) => (await api.get<ApiEnvelope<Paginated<Book>>>('/api/v1/books', { params: { limit: 12, cursor: pageParam || undefined, sort: 'recent' } })).data.data,
    getNextPageParam: (lastPage) => lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.nextCursor || undefined : undefined
  });

  useAvatarRefresh(booksQuery.data, booksQuery.refetch, useIsFocused());

  useEffect(() => {
    if ((avatarEditor.source || avatarEditor.error) && !settings.visible && !viewingPhoto) openEditor();
    // Only a new source/error opens an editor; closing a modal must not reopen it.
  }, [avatarEditor.source, avatarEditor.error]);

  useEffect(() => { photoOpened.current = false; setViewingPhoto(false); }, [actor?.userId, actor?.epoch]);
  useEffect(() => { photoOpened.current = viewingPhoto; }, [viewingPhoto]);

  const books = booksQuery.data?.pages.flatMap((page) => page.items) || [];
  const profile = profileQuery.data;
  const stats = profile?.stats;
  const metrics: ProfileMetric[] = stats ? [
    { value: stats.bookCount, label: 'livros', accessibilityLabel: `${stats.bookCount} livros na estante` },
    { value: stats.matchCount, label: 'matches', accessibilityLabel: `${stats.matchCount} matches ativos` },
    { value: stats.conversationCount, label: 'conversas', accessibilityLabel: `${stats.conversationCount} conversas` }
  ] : [];

  function openPhoto(longPress = false) {
    if (avatarEditor.busy || editor.pending || settings.visible || photoOpened.current) return;
    photoOpened.current = true;
    if (longPress) void avatarLongPressFeedback();
    setViewingPhoto(true);
  }

  function closePhoto() {
    if (avatarEditor.busy || editor.pending) return;
    avatarEditor.cancel();
    setViewingPhoto(false);
  }

  function openEditor() {
    if (viewingPhoto || editor.pending) return;
    if (!settings.visible) settings.openMenu();
    editor.reset(); settings.openRoute('editProfile');
  }
  function openRoute(route: SettingsRoute) {
    if (route === 'editProfile') { openEditor(); return; }
    settings.openRoute(route);
  }

  function refreshAll() {
    void Promise.all([profileQuery.refetch(), booksQuery.refetch()]);
  }

  const profileIntro = (
    <View style={styles.introStack}>
      <TopBar title="Meu perfil" action={
        <Pressable ref={menuButton} accessibilityRole="button" accessibilityLabel="Abrir configurações" accessibilityState={{ expanded: settings.visible }} onFocus={() => setMenuFocused(true)} onBlur={() => setMenuFocused(false)} style={({ pressed }) => [styles.modalClose, { borderWidth: 2, borderColor: menuFocused ? theme.colors.primary : 'transparent' }, pressed && styles.modalPressed]} onPress={() => { if (!viewingPhoto) settings.openMenu(); }}><MaterialIcons accessible={false} name="menu" size={26} color={theme.colors.foreground} /></Pressable>
      } />
      <View style={styles.identity}>
        <View style={[styles.identityRow, stackedIdentity && styles.identityStacked]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Ver foto de perfil" accessibilityHint="Toque ou mantenha pressionado para ampliar a foto e abrir as opções." disabled={avatarEditor.busy || editor.pending} onPress={() => openPhoto()} onLongPress={() => openPhoto(true)} delayLongPress={500}>
            <Avatar name={profile?.name || 'Leitor TrocaLivros'} url={profile?.avatarUrl} version={profile?.avatarVersion} onImageError={session.refreshAvatar} size={72} suppressBrowserActions />
          </Pressable>
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
      </ScrollView>}
      <ProfileSettingsModal visible={settings.visible} route={settings.route} busy={busy} cropping={Boolean(avatarEditor.source)} onBack={settings.back} onClose={settings.requestClose} onRoute={openRoute} available={['editProfile', 'account', 'appearance', 'notifications', 'help', 'about', 'confirmSignOut', ...(accountPreferences.data?.capabilities.changePassword ? ['password' as const] : [])]} appearanceLabel={preference === 'system' ? 'Dispositivo' : preference === 'dark' ? 'Escuro' : 'Claro'}>
        {avatarEditor.source ? <AvatarEditor key={avatarEditor.source.uri} source={avatarEditor.source} busy={avatarEditor.busy} error={avatarEditor.error} statusLabel={avatarEditor.statusLabel} previewUri={avatarEditor.previewUri} onSave={avatarEditor.save} onCancel={avatarEditor.cancel} onChooseAnother={avatarEditor.choose} />
          : settings.route === 'editProfile' ? <ProfileEditForm editor={editor} avatarEditor={avatarEditor} profile={profile} />
          : settings.route === 'appearance' ? <AppearanceSettingsPanel />
          : settings.route === 'notifications' ? <NotificationSettingsPanel preferences={accountPreferences} />
          : settings.route === 'account' ? <AccountSettingsPanel />
          : settings.route === 'help' ? <ProfileHelpPanel />
          : settings.route === 'about' ? <AboutAppPanel />
          : settings.route === 'password' ? <PasswordChangeForm security={security} enabled={Boolean(accountPreferences.data?.capabilities.changePassword)} logoutAllEnabled={Boolean(accountPreferences.data?.capabilities.logoutAll)} onSignOutAll={() => settings.openRoute('confirmSignOutAll')} />
          : settings.route === 'confirmDiscard' ? <View style={styles.aboutSection}><Text style={styles.aboutValue}>As alterações ainda não foram salvas.</Text><AppButton label="Continuar editando" variant="outline" onPress={settings.back} /><AppButton label="Descartar alterações" onPress={settings.confirmDiscard} /></View>
          : settings.route === 'confirmSignOut' || settings.route === 'confirmSignOutAll' ? <View style={styles.aboutSection}><Text style={styles.aboutValue}>{settings.route === 'confirmSignOutAll' ? 'Todos os dispositivos serão desconectados. Você precisará entrar novamente.' : 'Você precisará entrar novamente para acessar sua conta neste dispositivo.'}</Text>{security.error ? <Text style={{ color: theme.colors.danger }} accessibilityLiveRegion="polite">{security.error}</Text> : null}<AppButton label={settings.route === 'confirmSignOutAll' ? 'Sair de todos os dispositivos' : 'Sair da conta'} loading={security.busy} onPress={() => { void (settings.route === 'confirmSignOutAll' ? security.signOutAll() : security.signOut()); }} /><AppButton label="Cancelar" variant="outline" disabled={security.busy} onPress={settings.back} /></View> : null}
      </ProfileSettingsModal>
      <AvatarPhotoModal visible={viewingPhoto} name={profile.name} avatar={avatarDescriptorOf(profile)} source={avatarEditor.source} busy={avatarEditor.busy || editor.pending} error={avatarEditor.error} previewUri={avatarEditor.previewUri} statusLabel={avatarEditor.statusLabel} onClose={closePhoto} onEdit={avatarEditor.choose} onTakePhoto={avatarEditor.takePhoto} onRemove={avatarEditor.remove} onCancelCrop={avatarEditor.cancel} onSave={avatarEditor.save} onImageError={session.refreshAvatar} onOpenSettings={avatarEditor.permissionBlocked ? avatarEditor.openSettings : undefined} />
    </AppScreen>
  );
}
