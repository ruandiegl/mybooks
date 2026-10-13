import { api } from '../../services/api';
import type { ApiEnvelope } from '../../types/api';
import type { PremiumStatus } from './premium.types';
import { settingsActorHeaders, type SessionActor } from '../auth/sessionActor';

export const premiumStatusQueryKey = (userId: string | undefined) =>
  ['premium', 'status', userId] as const;

export const premiumApi = {
  async getStatus() {
    return (await api.get<ApiEnvelope<PremiumStatus>>('/api/v1/premium/status')).data.data;
  },
  async markOfferPrompted(actor?: SessionActor) {
    return (await api.post<ApiEnvelope<PremiumStatus>>('/api/v1/premium/offer/prompted', {}, { headers: actor ? settingsActorHeaders(actor) : {} })).data.data;
  },
  async activateTrial(actor?: SessionActor) {
    return (await api.post<ApiEnvelope<PremiumStatus>>('/api/v1/premium/trial/activate', {}, { headers: actor ? settingsActorHeaders(actor) : {} })).data.data;
  }
};
