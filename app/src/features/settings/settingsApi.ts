import { api } from '../../services/api';
import type { AccountPreferencesDTO, ApiEnvelope } from '../../types/api';
import { settingsActorHeaders, type SessionActor } from '../auth/sessionActor';
function ownPreferences(value: AccountPreferencesDTO, actor: SessionActor): AccountPreferencesDTO {
  if (value.userId !== actor.userId || value.schemaVersion !== 1 || typeof value.notifications?.showLikesBadge !== 'boolean') throw Error('Resposta de preferências inválida para esta conta.');
  return value;
}
export const settingsApi = {
  async getPreferences(actor: SessionActor) { return ownPreferences((await api.get<ApiEnvelope<AccountPreferencesDTO>>('/api/v1/me/preferences', { headers: settingsActorHeaders(actor) })).data.data, actor); },
  async updatePreferences(input: { showLikesBadge: boolean }, actor: SessionActor) { return ownPreferences((await api.patch<ApiEnvelope<AccountPreferencesDTO>>('/api/v1/me/preferences', input, { headers: settingsActorHeaders(actor) })).data.data, actor); }
};
