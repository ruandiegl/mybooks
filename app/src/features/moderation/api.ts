import { api } from '../../services/api';
import type { ApiEnvelope, AvatarDescriptor } from '../../types/api';

export type PublicProfile = AvatarDescriptor & {
  id: string;
  name: string;
  city: string | null;
  bio: string | null;
  reputation: { stars: number };
  viewer: { blockedByMe: boolean; reportedByMe: boolean };
};

export type BlockedUser = Pick<PublicProfile, 'id' | 'name' | 'city' | 'avatarUrl' | 'avatarUrlExpiresAt' | 'avatarVersion'>;
export type ReportReason = 'HARASSMENT' | 'FRAUD' | 'INAPPROPRIATE_CONTENT' | 'SPAM' | 'OTHER';

export const reportReasons: { value: ReportReason; label: string }[] = [
  { value: 'HARASSMENT', label: 'Assédio ou ameaça' },
  { value: 'FRAUD', label: 'Fraude ou golpe' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Conteúdo inadequado' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'OTHER', label: 'Outro motivo' }
];

export async function getPublicProfile(userId: string, signal?: AbortSignal) {
  return (await api.get<ApiEnvelope<PublicProfile>>(`/api/v1/users/${userId}/public`, { signal })).data.data;
}

export async function listBlockedUsers(signal?: AbortSignal) {
  return (await api.get<ApiEnvelope<BlockedUser[]>>('/api/v1/me/blocks', { signal })).data.data;
}

export async function reportUser(userId: string, reason: ReportReason) {
  await api.post(`/api/v1/users/${userId}/reports`, { reason });
}

export async function setUserBlocked(userId: string, blocked: boolean) {
  if (blocked) await api.put(`/api/v1/users/${userId}/block`);
  else await api.delete(`/api/v1/users/${userId}/block`);
}
