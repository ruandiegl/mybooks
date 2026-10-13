import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSession } from '../../providers/SessionProvider';
import { api, apiErrorMessage } from '../../services/api';
import { maskBrazilianPhone } from '../auth/inputMasks';
import { settingsActorHeaders, type SessionActor } from '../auth/sessionActor';
import type { ApiEnvelope, User } from '../../types/api';
export type ProfileDraft = { firstName: string; lastName: string; city: string; bio: string; phone: string; interestsText: string };
const draftOf = (profile?: User): ProfileDraft => ({ firstName: profile?.firstName || '', lastName: profile?.lastName || '', city: profile?.city || '', bio: profile?.bio || '', phone: maskBrazilianPhone(profile?.phone || ''), interestsText: profile?.interests.join(', ') || '' });
export function useProfileEditor(profile: User | undefined, onSaved: () => void) {
  const session = useSession();
  const [draft, setDraft] = useState(() => draftOf(profile));
  const [nameError, setNameError] = useState<string>();
  const [error, setError] = useState<string>();
  const pending = useRef(false);
  useEffect(() => { setDraft(draftOf(profile)); setNameError(undefined); setError(undefined); }, [profile?.id, session.user?.id]);
  const mutation = useMutation({
    mutationFn: async ({ actor, value }: { actor: SessionActor; value: ProfileDraft }) => {
      if (!session.isActorCurrent(actor)) throw new Error('A sessão mudou. Abra o perfil novamente.');
      return (await api.patch<ApiEnvelope<User>>('/api/v1/me', {
        firstName: value.firstName.trim(), lastName: value.lastName.trim() || null,
        city: value.city.trim() || null, bio: value.bio.trim() || null, phone: value.phone.trim() || null,
        interests: value.interestsText.split(',').map(item => item.trim()).filter(Boolean)
      }, { headers: settingsActorHeaders(actor) })).data.data;
    },
    onSuccess(user, variables) {
      if (!session.isActorCurrent(variables.actor)) return;
      session.updateUser(user, variables.actor); setDraft(draftOf(user)); setError(undefined); onSaved();
    },
    onError(reason, variables) { if (session.isActorCurrent(variables.actor)) setError(apiErrorMessage(reason, 'Não foi possível salvar. Confira a conexão e tente novamente.')); },
    onSettled() { pending.current = false; }
  });
  function reset() { setDraft(draftOf(profile)); setNameError(undefined); setError(undefined); }
  function submit() {
    if (pending.current) return;
    if (!draft.firstName.trim()) { setNameError('Digite seu nome.'); return; }
    const actor = session.captureActor();
    if (!actor) { setError('A sessão precisa ser renovada. Feche e abra o perfil novamente.'); return; }
    pending.current = true; setNameError(undefined); setError(undefined); mutation.mutate({ actor, value: { ...draft } });
  }
  return { draft, setField<K extends keyof ProfileDraft>(field: K, value: ProfileDraft[K]) { setDraft(old => ({ ...old, [field]: value })); if (field === 'firstName') setNameError(undefined); },
    reset, submit, pending: mutation.isPending, error, nameError,
    dirty: Object.entries(draft).some(([key, value]) => value !== draftOf(profile)[key as keyof ProfileDraft]) };
}
