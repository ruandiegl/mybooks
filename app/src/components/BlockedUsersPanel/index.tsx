import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { AppButton } from '../AppButton';
import { Avatar } from '../Avatar';
import { useMediaBinding } from '../../features/media/useMediaBinding';
import { listBlockedUsers, setUserBlocked } from '../../features/moderation/api';
import { refreshRelationshipCaches } from '../../features/moderation/refreshRelationshipCaches';
import { useAppTheme } from '../../providers/ThemeProvider';

export function BlockedUsersPanel() {
  const { theme } = useAppTheme();
  const binding = useMediaBinding();
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ['blocked-users'], queryFn: ({ signal }) => listBlockedUsers(signal) });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  async function unblock(id: string) {
    if (busyId) return;
    setBusyId(id); setError('');
    try {
      await setUserBlocked(id, false);
      await refreshRelationshipCaches(queryClient);
    } catch { setError('Não foi possível desbloquear esta pessoa.'); }
    finally { setBusyId(null); }
  }
  if (users.isLoading) return <Text style={{ color: theme.colors.mutedForeground }}>Carregando pessoas bloqueadas…</Text>;
  if (users.isError) return <AppButton label="Tentar novamente" variant="outline" onPress={() => { void users.refetch(); }} />;
  return <View style={{ gap: theme.spacing.md }}>
    <Text style={{ color: theme.colors.mutedForeground }}>Pessoas bloqueadas não aparecem na descoberta, nos matches ou nas conversas. Desbloquear restaura as conversas preservadas.</Text>
    {error ? <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.danger }}>{error}</Text> : null}
    {users.data?.length ? users.data.map(person => <View key={person.id} style={{ backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.md, padding: theme.spacing.md, gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Avatar subjectId={person.id} binding={binding} name={person.name} url={person.avatarUrl} version={person.avatarVersion} size={44} />
        <View><Text style={{ color: theme.colors.foreground, fontFamily: theme.typography.semibold }}>{person.name}</Text>{person.city ? <Text style={{ color: theme.colors.mutedForeground }}>{person.city}</Text> : null}</View>
      </View>
      <AppButton label={`Desbloquear ${person.name}`} variant="outline" loading={busyId === person.id} disabled={Boolean(busyId && busyId !== person.id)} onPress={() => { void unblock(person.id); }} />
    </View>) : <Text style={{ color: theme.colors.mutedForeground }}>Nenhuma pessoa bloqueada.</Text>}
  </View>;
}
