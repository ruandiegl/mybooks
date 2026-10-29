import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { AppButton } from '../../components/AppButton';
import { ReputationStars } from '../../components/ReputationStars';
import { StateView } from '../../components/StateView';
import { useMediaBinding } from '../../features/media/useMediaBinding';
import { getPublicProfile, reportReasons, reportUser, setUserBlocked, type ReportReason } from '../../features/moderation/api';
import { refreshRelationshipCaches } from '../../features/moderation/refreshRelationshipCaches';
import { useAppTheme } from '../../providers/ThemeProvider';
import { useSession } from '../../providers/SessionProvider';
import type { RootStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'PublicProfile'>;
type Dialog = 'report' | 'block' | null;

export function PublicProfile({ route, navigation }: Props) {
  const { userId } = route.params;
  const { theme } = useAppTheme();
  const { user } = useSession();
  const isSelf = user?.id === userId;
  const binding = useMediaBinding();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ['public-profile', userId], queryFn: ({ signal }) => getPublicProfile(userId, signal) });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function refreshRelationships() {
    await refreshRelationshipCaches(queryClient);
  }

  async function confirm() {
    if (busy || !dialog) return;
    if (dialog === 'report' && !reason) { setError('Selecione um motivo.'); return; }
    setBusy(true); setError('');
    try {
      if (dialog === 'report' && reason) {
        await reportUser(userId, reason);
        setSuccess('Denúncia enviada. Obrigado por nos avisar.');
      } else if (dialog === 'block') {
        await setUserBlocked(userId, true);
        setSuccess('Pessoa bloqueada. A conversa ficará oculta até você desbloqueá-la.');
      }
      setDialog(null);
      if (dialog === 'report') await queryClient.invalidateQueries({ queryKey: ['public-profile', userId] });
      else await refreshRelationships();
    } catch {
      setError('Não foi possível concluir. Tente novamente.');
    } finally { setBusy(false); }
  }

  async function unblock() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await setUserBlocked(userId, false);
      setSuccess('Pessoa desbloqueada. A conversa voltará a aparecer.');
      await refreshRelationships();
    } catch { setError('Não foi possível desbloquear. Tente novamente.'); }
    finally { setBusy(false); }
  }

  const person = profile.data;
  if (profile.isLoading) return <View style={{ flex: 1, backgroundColor: theme.colors.background }}><StateView loading title="Abrindo perfil" /></View>;
  if (profile.isError || !person) return <View style={{ flex: 1, backgroundColor: theme.colors.background }}><StateView title="Perfil indisponível" description="Este perfil não pode ser exibido agora." actionLabel="Voltar" onAction={() => navigation.goBack()} /></View>;

  return <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.xl, gap: theme.spacing.lg }}>
      <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.lg, alignItems: 'center', gap: theme.spacing.sm }}>
        <Avatar subjectId={person.id} binding={binding} name={person.name} url={person.avatarUrl} version={person.avatarVersion} size={88} onImageError={() => { void profile.refetch(); }} />
        <Text accessibilityRole="header" style={{ fontFamily: theme.typography.bold, fontSize: 24, color: theme.colors.foreground, textAlign: 'center' }}>{person.name}</Text>
        {person.city ? <Text style={{ color: theme.colors.mutedForeground }}>{person.city}</Text> : null}
        <ReputationStars stars={person.reputation.stars} />
        {person.bio ? <Text style={{ color: theme.colors.foreground, textAlign: 'center', lineHeight: 23 }}>{person.bio}</Text> : null}
      </View>
      {success ? <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.success }}>{success}</Text> : null}
      {error ? <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.danger }}>{error}</Text> : null}
      {isSelf ? <Text style={{ color: theme.colors.mutedForeground }}>Este é seu perfil público.</Text> : person.viewer.blockedByMe
        ? <AppButton label="Desbloquear pessoa" variant="outline" loading={busy} onPress={() => { void unblock(); }} />
        : <AppButton label="Bloquear pessoa" variant="outline" icon="block" onPress={() => { setError(''); setDialog('block'); }} />}
      {!isSelf ? (!person.viewer.reportedByMe ? <AppButton label="Denunciar pessoa" variant="ghost" icon="flag" onPress={() => { setError(''); setReason(null); setDialog('report'); }} /> : <Text style={{ color: theme.colors.mutedForeground }}>Você já enviou uma denúncia sobre esta pessoa.</Text>) : null}
    </ScrollView>
    <Modal visible={Boolean(dialog)} transparent animationType="fade" onRequestClose={() => { if (!busy) setDialog(null); }}>
      <Pressable accessibilityLabel="Fechar janela" onPress={() => { if (!busy) setDialog(null); }} style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: theme.spacing.lg }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, maxHeight: '85%', overflow: 'hidden' }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
          <Text accessibilityRole="header" style={{ fontFamily: theme.typography.bold, fontSize: 20, color: theme.colors.foreground }}>{dialog === 'report' ? 'Denunciar pessoa' : 'Bloquear pessoa?'}</Text>
          {dialog === 'report' ? <>
            <Text style={{ color: theme.colors.mutedForeground }}>Selecione o motivo. A denúncia é privada.</Text>
            {reportReasons.map(item => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ selected: reason === item.value }} onPress={() => setReason(item.value)} style={{ padding: 12, borderWidth: 1, borderColor: reason === item.value ? theme.colors.primary : theme.colors.outline, borderRadius: theme.radius.sm }}><Text style={{ color: theme.colors.foreground }}>{item.label}</Text></Pressable>)}
          </> : <Text style={{ color: theme.colors.foreground, lineHeight: 22 }}>Os livros e a conversa com {person.name} ficarão ocultos para os dois. As mensagens serão preservadas e voltarão após o desbloqueio.</Text>}
          {error ? <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.danger }}>{error}</Text> : null}
          <AppButton label={dialog === 'report' ? 'Enviar denúncia' : 'Bloquear'} loading={busy} onPress={() => { void confirm(); }} />
          <AppButton label="Cancelar" variant="outline" disabled={busy} onPress={() => setDialog(null)} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  </View>;
}
