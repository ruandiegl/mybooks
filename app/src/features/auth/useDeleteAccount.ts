import { useEffect, useRef, useState } from 'react';
import { useSession } from '../../providers/SessionProvider';
import { apiErrorMessage } from '../../services/api';

export function useDeleteAccount() {
  const session = useSession();
  const actor = session.captureActor();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const ticket = useRef(0);
  const pending = useRef<number | null>(null);
  function reset() {
    if (pending.current !== null) return;
    ticket.current++;
    setPassword(''); setConfirmation(''); setError(undefined); setPasswordError(undefined);
  }
  useEffect(() => {
    ticket.current++; pending.current = null;
    setPassword(''); setConfirmation(''); setError(undefined); setPasswordError(undefined); setBusy(false);
  }, [actor?.userId, actor?.epoch]);
  async function submit() {
    if (pending.current !== null) return;
    if (!password) { setPasswordError('Digite sua senha atual.'); return; }
    if (new TextEncoder().encode(password).byteLength > 72) { setPasswordError('A senha deve ter no máximo 72 bytes UTF-8.'); return; }
    if (confirmation !== 'EXCLUIR') { setError('Digite EXCLUIR para confirmar.'); return; }
    const owner = session.captureActor();
    if (!owner) { setError('A sessão mudou. Entre novamente.'); return; }
    const current = ++ticket.current; pending.current = current; setBusy(true); setError(undefined); setPasswordError(undefined);
    try {
      await session.deleteAccount({ currentPassword: password, confirmation: 'EXCLUIR' }, owner);
      if (ticket.current === current) { setPassword(''); setConfirmation(''); }
    } catch (reason) {
      if (ticket.current !== current || !session.isActorCurrent(owner)) return;
      const code = (reason as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
      if (code === 'CURRENT_PASSWORD_INVALID') setPasswordError('A senha atual está incorreta.');
      else if (code === 'SETTINGS_SESSION_CHANGED') setError('A sessão mudou. Feche e abra as configurações novamente.');
      else setError(apiErrorMessage(reason, 'Não foi possível excluir a conta. Confira a conexão e tente novamente.'));
    } finally {
      if (pending.current === current) { pending.current = null; setBusy(false); }
    }
  }
  return { password, confirmation, error, passwordError, busy, dirty: Boolean(password || confirmation), reset, submit,
    setPassword(value: string) { if (pending.current === null) { setPassword(value); setPasswordError(undefined); } },
    setConfirmation(value: string) { if (pending.current === null) { setConfirmation(value); setError(undefined); } } };
}
