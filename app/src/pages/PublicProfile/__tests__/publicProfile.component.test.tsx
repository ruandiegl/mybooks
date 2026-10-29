// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  selfId: 'viewer',
  blockedByMe: false,
  reportedByMe: false,
  setUserBlocked: vi.fn(),
  reportUser: vi.fn(),
  refresh: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('react-native', async () => await import('react-native-web'));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
vi.mock('../../../providers/SessionProvider', () => ({ useSession: () => ({ user: { id: state.selfId } }) }));
vi.mock('../../../providers/ThemeProvider', async () => {
  const { lightTheme } = await import('../../../styles/theme');
  return { useAppTheme: () => ({ theme: lightTheme }) };
});
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ isLoading: false, isError: false, data: {
    id: 'reader', name: 'Leitora', city: 'Recife', bio: 'Gosto de livros',
    avatarUrl: null, avatarUrlExpiresAt: null, avatarVersion: 0,
    reputation: { stars: 4.5 }, viewer: { blockedByMe: state.blockedByMe, reportedByMe: state.reportedByMe }
  } }),
  useQueryClient: () => ({ invalidateQueries: state.refresh })
}));
vi.mock('../../../features/media/useMediaBinding', () => ({ useMediaBinding: () => null }));
vi.mock('../../../features/moderation/api', () => ({
  getPublicProfile: vi.fn(),
  reportReasons: [{ value: 'FRAUD', label: 'Fraude ou golpe' }],
  reportUser: state.reportUser,
  setUserBlocked: state.setUserBlocked
}));
vi.mock('../../../features/moderation/refreshRelationshipCaches', () => ({ refreshRelationshipCaches: state.refresh }));
vi.mock('../../../components/Avatar', () => ({ Avatar: () => <span>Avatar</span> }));
vi.mock('../../../components/ReputationStars', () => ({ ReputationStars: ({ stars }: { stars: number }) => <span>Nota {stars}</span> }));
vi.mock('../../../components/StateView', () => ({ StateView: ({ title }: { title: string }) => <div>{title}</div> }));
vi.mock('../../../components/AppButton', () => ({ AppButton: ({ label, onPress, disabled }: { label: string; onPress?: () => void; disabled?: boolean }) => <button disabled={disabled} onClick={onPress}>{label}</button> }));

import { PublicProfile } from '../index';

beforeEach(() => { state.selfId = 'viewer'; state.blockedByMe = false; state.reportedByMe = false; vi.clearAllMocks(); });
afterEach(cleanup);

function mount() {
  return render(<PublicProfile route={{ params: { userId: 'reader' } } as any} navigation={{ goBack: vi.fn() } as any} />);
}

describe('perfil público', () => {
  it('mostra nota e exige confirmação antes de bloquear', async () => {
    mount();
    expect(screen.getByText('Nota 4.5')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Bloquear pessoa' }));
    expect(state.setUserBlocked).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Bloquear' }));
    await waitFor(() => expect(state.setUserBlocked).toHaveBeenCalledWith('reader', true));
  });

  it('não oferece denúncia ou bloqueio do próprio perfil', () => {
    state.selfId = 'reader';
    mount();
    expect(screen.getByText('Este é seu perfil público.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Bloquear pessoa' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Denunciar pessoa' })).toBeNull();
  });

  it('envia a denúncia somente após escolher o motivo e confirmar', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Denunciar pessoa' }));
    expect(state.reportUser).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('radio', { name: 'Fraude ou golpe' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar denúncia' }));
    await waitFor(() => expect(state.reportUser).toHaveBeenCalledWith('reader', 'FRAUD'));
  });
});
