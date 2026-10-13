import { useEffect, useRef, useState } from 'react';
import { useSession } from '../../providers/SessionProvider';
import { apiErrorMessage } from '../../services/api';
import { passwordIssues, validatePasswordConfirmation } from './passwordRules';
export type PasswordDraft = { currentPassword: string; newPassword: string; confirmation: string };
const empty = (): PasswordDraft => ({ currentPassword: '', newPassword: '', confirmation: '' });
export function useAccountSecurity() {
  const session = useSession();
  const actor = session.captureActor();
  const [draft, setDraft] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof PasswordDraft, string>>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const ticket = useRef(0), pending = useRef<number | null>(null);
  useEffect(() => { ticket.current++; pending.current = null; setDraft(empty()); setErrors({}); setError(undefined); setBusy(false); }, [actor?.userId, actor?.epoch]);
  function reset() { if (pending.current !== null) return; setDraft(empty()); setErrors({}); setError(undefined); }
  async function execute(operation: 'password' | 'logout' | 'logoutAll') {
    if (pending.current !== null) return;
    const owner = session.captureActor();
    if (!owner) { setError('A sessão precisa ser renovada. Entre novamente.'); return; }
    const current = ++ticket.current; pending.current = current; setBusy(true); setError(undefined); setErrors({});
    try {
      if (operation === 'password') await session.changePassword({ currentPassword: draft.currentPassword, newPassword: draft.newPassword }, owner);
      else if (operation === 'logoutAll') await session.signOutAll(owner);
      else await session.signOut(owner);
      if (ticket.current === current && session.isActorCurrent(owner)) setDraft(empty());
    } catch (reason) {
      if (ticket.current !== current || !session.isActorCurrent(owner)) return;
      const code = (reason as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
      if (code === 'CURRENT_PASSWORD_INVALID') setErrors({ currentPassword: 'A senha atual está incorreta.' });
      else if (code === 'SETTINGS_SESSION_CHANGED') setError('A sessão mudou. Feche e abra as configurações novamente.');
      else setError(apiErrorMessage(reason, 'Não foi possível concluir a ação. Confira a conexão e tente novamente.'));
    } finally { if (pending.current === current) { pending.current = null; setBusy(false); } }
  }
  function submitPassword() {
    if (pending.current !== null) return;
    const issues: Partial<Record<keyof PasswordDraft, string>> = {};
    if (!draft.currentPassword) issues.currentPassword = 'Digite sua senha atual.';
    else if (new TextEncoder().encode(draft.currentPassword).byteLength > 72) issues.currentPassword = 'A senha deve ter no máximo 72 bytes UTF-8.';
    const passwordError = passwordIssues(draft.newPassword)[0];
    if (passwordError) issues.newPassword = passwordError;
    const confirmationError = validatePasswordConfirmation(draft.newPassword, draft.confirmation);
    if (confirmationError) issues.confirmation = confirmationError;
    setErrors(issues); setError(undefined);
    if (Object.keys(issues).length) return;
    void execute('password');
  }
  return { draft, errors, error, busy, dirty: Object.values(draft).some(Boolean), reset, submitPassword,
    setField(field: keyof PasswordDraft, value: string) { if (pending.current !== null) return; setDraft(old => ({ ...old, [field]: value })); setErrors(old => ({ ...old, [field]: undefined })); },
    signOut: () => execute('logout'), signOutAll: () => execute('logoutAll') };
}
