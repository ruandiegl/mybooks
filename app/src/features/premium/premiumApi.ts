import { api } from '../../services/api';
import type { ApiEnvelope } from '../../types/api';
import type { PremiumStatus } from './premium.types';

export const premiumStatusQueryKey = (userId: string | undefined) =>
  ['premium', 'status', userId] as const;

export const premiumApi = {
  async getStatus() {
    return (await api.get<ApiEnvelope<PremiumStatus>>('/api/v1/premium/status')).data.data;
  },
  async markOfferPrompted() {
    return (await api.post<ApiEnvelope<PremiumStatus>>('/api/v1/premium/offer/prompted', {})).data.data;
  },
  async activateTrial() {
    return (await api.post<ApiEnvelope<PremiumStatus>>('/api/v1/premium/trial/activate', {})).data.data;
  }
};
