import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../providers/SessionProvider';
import { apiErrorMessage } from '../../services/api';
import type { SessionActor } from '../auth/sessionActor';
import { settingsApi } from './settingsApi';
export function useAccountPreferences() {
  const session = useSession(), client = useQueryClient();
  const actor = session.captureActor();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const retryValue = useRef<boolean | null>(null);
  const pending = useRef(false);
  const query = useQuery({ queryKey: ['account-preferences', session.user?.id], enabled: Boolean(actor), retry: false,
    queryFn: () => { const current = session.captureActor(); if (!current) throw Error('Sessão indisponível.'); return settingsApi.getPreferences(current); } });
  const mutation = useMutation({ mutationFn: ({ value, actor }: { value: boolean; actor: SessionActor }) => {
      if (!session.isActorCurrent(actor)) throw Error('A sessão mudou.');
      return settingsApi.updatePreferences({ showLikesBadge: value }, actor);
    },
    onSuccess(data, variables) { if (session.isActorCurrent(variables.actor)) { client.setQueryData(['account-preferences', variables.actor.userId], data); retryValue.current = null; setSaved(true); setError(undefined); } },
    onError(reason, variables) { if (session.isActorCurrent(variables.actor)) setError(apiErrorMessage(reason, 'Não foi possível salvar. Confira a conexão e tente novamente.')); },
    onSettled() { pending.current = false; }
  });
  useEffect(() => { setError(undefined); setSaved(false); retryValue.current = null; }, [actor?.userId, actor?.epoch]);
  function save(value: boolean) {
    const owner = session.captureActor(); if (!owner || pending.current || !query.data) return;
    pending.current = true; retryValue.current = value; setError(undefined); setSaved(false); mutation.mutate({ value, actor: owner });
  }
  const unavailable = (query.error as { response?: { status?: number } })?.response?.status === 404;
  return { ...query, errorMessage: error, saved, saving: mutation.isPending, unavailable,
    showLikesBadge: query.data?.notifications.showLikesBadge ?? true, save,
    retry() { if (retryValue.current !== null) save(retryValue.current); else void query.refetch(); } };
}
