// @vitest-environment jsdom
import React, { useLayoutEffect } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
const io = vi.hoisted(() => ({ marks: vi.fn(), status: undefined as any }));
vi.mock('react-native', async () => ({ ...(await import('react-native-web')) }));
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: () => null }));
vi.mock('../../../providers/SessionProvider', () => ({ useSession: () => ({ isSignedIn: true, user: { id: 'ana', isActive: true, emailVerifiedAt: '2026-10-08', interests: [], profileCompletedAt: '2026-10-08', booksOnboardingCompletedAt: '2026-10-08' } }) }));
vi.mock('../../premium/usePremiumStatus', () => ({ usePremiumStatus: () => ({ data: io.status }) }));
vi.mock('../../premium/premiumApi', () => ({ premiumApi: { markOfferPrompted: io.marks, activateTrial: async () => io.status }, premiumStatusQueryKey: (id: string) => ['premium', 'status', id] }));
vi.mock('../../premium/PremiumOfferModal', () => ({ PremiumOfferModal: ({ visible }: { visible: boolean }) => visible ? <output>Oferta aberta</output> : null }));
import { PremiumOfferProvider, usePremiumOffer } from '../../premium/PremiumOfferProvider';
function Blocker() {
  const { setPresentationBlocked } = usePremiumOffer();
  const [blocked, setBlocked] = React.useState(true);
  useLayoutEffect(() => { setPresentationBlocked('profile-overlay', blocked); return () => setPresentationBlocked('profile-overlay', false); }, [blocked, setPresentationBlocked]);
  return <button onClick={() => setBlocked(false)}>Fechar configurações</button>;
}
afterEach(cleanup);
it('defers the offer without marking it consumed while settings are open', async () => {
  io.status = { serverNow: '2026-10-08T12:00:00Z', eligible: true, trialState: 'NOT_STARTED', trialStartedAt: null, trialEndsAt: null, promptMode: 'LOGIN_MODAL', benefits: { seeReceivedLikes: false, unlimitedLikes: false, dailyLikeLimit: 15 } };
  io.marks.mockResolvedValue(io.status);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><PremiumOfferProvider><Blocker /></PremiumOfferProvider></QueryClientProvider>);
  expect(screen.queryByText('Oferta aberta')).toBeNull();
  expect(io.marks).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Fechar configurações'));
  expect(await screen.findByText('Oferta aberta')).toBeTruthy();
  expect(io.marks).toHaveBeenCalledTimes(1);
  client.clear();
});
