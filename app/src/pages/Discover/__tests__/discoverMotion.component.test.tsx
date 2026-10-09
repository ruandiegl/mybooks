// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const device = vi.hoisted(() => ({ reduced: false, focused: true, owner: 'reader', epoch: 0, height: 812, listener: undefined as ((value: boolean) => void) | undefined, resolvePreference: undefined as ((value: boolean) => void) | undefined, delayPreference: false, width: 375 }));
const network = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), alert: vi.fn() }));
vi.mock('react-native', async () => {
  const native = await vi.importActual<typeof import('react-native')>('react-native-web');
  const implementation = await vi.importActual<{ default: typeof native.Animated }>('react-native-web/dist/cjs/vendor/react-native/Animated/AnimatedImplementation');
  return { ...native, Animated: { ...native.Animated, ...implementation.default },
    useWindowDimensions: () => ({ width: device.width, height: device.height, fontScale: 1, scale: 1 }),
    AccessibilityInfo: { isReduceMotionEnabled: () => device.delayPreference ? new Promise<boolean>(resolve => { device.resolvePreference = resolve; }) : Promise.resolve(device.reduced), addEventListener: (_event: string, listener: (value: boolean) => void) => { device.listener = listener; return { remove() { device.listener = undefined; } }; } }
  };
});
vi.mock('react-native-safe-area-context', async () => ({ SafeAreaView: (await import('react-native-web')).View }));
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: () => null }));
vi.mock('expo-crypto', () => ({ randomUUID: () => '40000000-0000-4000-8000-000000000004' }));
vi.mock('@react-navigation/native', () => ({ useIsFocused: () => device.focused, useNavigation: () => ({ navigate: vi.fn() }) }));
vi.mock('../../../providers/SessionProvider', () => ({ useSession: () => ({ user: { id: device.owner }, getSessionScope: () => ({ userId: device.owner, epoch: device.epoch }) }) }));
vi.mock('../../../services/api', () => ({ api: { get: network.get, post: network.post }, apiErrorMessage: () => 'Falha de conexão' }));
vi.mock('../../../services/notice', () => ({ Alert: { alert: network.alert } }));
import { Discover } from '../index';

const first = { id: 'first', title: 'Primeiro livro', authors: ['Autora'], subjects: [], availability: 'AVAILABLE', owner: { id: 'owner', name: 'Ana' }, images: [] };
const second = { ...first, id: 'second', title: 'Segundo livro' };
const third = { ...first, id: 'third', title: 'Terceiro livro' };
const pageInfo = { hasNextPage: false, nextCursor: null };
const clients: QueryClient[] = [];
let accept: () => void, reject: (error: Error) => void;
function tree(client: QueryClient) { return <QueryClientProvider client={client}><Discover /></QueryClientProvider>; }
async function host(items = [first, second, third]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  clients.push(client);
  client.setQueryData(['books', 'discover'], { pages: [{ items, pageInfo }], pageParams: [''] });
  const mounted = render(tree(client));
  await act(async () => {});
  return { client, mounted };
}
function card(title = first.title) { return screen.getByRole('button', { name: `Ver ${title}, de Autora. Livro de Ana` }).parentElement!; }
function x(element = card()) { return Number(element.style.transform.match(/translateX\((-?[\d.]+)px\)/)?.[1] ?? 0); }
function alpha(element = card()) { const value = getComputedStyle(element).opacity; return value === '' ? 1 : Number(value); }
async function frames(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
beforeEach(() => {
  accept = () => { throw new Error('No pending request'); }; reject = () => { throw new Error('No pending request'); };
  device.reduced = false; device.focused = true; device.owner = 'reader'; device.epoch = 0; device.height = 812; device.delayPreference = false; device.resolvePreference = undefined; device.width = 375;
  network.get.mockReset(); network.post.mockReset(); network.alert.mockReset();
  network.get.mockResolvedValue({ data: { data: { items: [second, third], pageInfo } } });
  network.post.mockImplementation((url: string, input: { targetBookId: string; action: string }) => {
    expect(url).toBe('/api/v1/interactions'); expect(input.targetBookId).toBe(first.id);
    return new Promise((resolve, fail) => { accept = () => resolve({ data: { data: { interaction: { id: 'interaction' }, match: null } } }); reject = fail; });
  });
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('animação dos cards Descobrir', () => {
  it.each([['Passar livro', 'PASS', -1, 'discover-pass-feedback'], ['Gostei do livro', 'LIKE', 1, 'discover-like-feedback']] as const)('desliza %s na direção correta com feedback breve', async (label, action, direction, feedbackId) => {
    await host();
    fireEvent.click(screen.getByRole('button', { name: label }));
    await act(async () => {});
    expect(network.post.mock.calls[0][1].action).toBe(action);
    await frames(80);
    expect(x() * direction).toBeGreaterThan(0);
    expect(alpha()).toBeLessThan(1);
    const feedback = screen.getByTestId(feedbackId);
    expect(Number(getComputedStyle(feedback).opacity)).toBeGreaterThan(0.1);
    expect(Number(getComputedStyle(feedback).opacity)).toBeLessThan(0.5);
    await act(async () => accept());
    await frames(240);
    expect(screen.queryByTestId(feedbackId)).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver Segundo livro, de Autora. Livro de Ana' })).toBeTruthy();
    await frames(200);
    expect(x(card(second.title))).toBe(0); expect(alpha(card(second.title))).toBe(1);
  });
  it('não troca o livro antes da saída terminar quando a API responde imediatamente', async () => {
    await host();
    fireEvent.click(screen.getByRole('button', { name: 'Gostei do livro' }));
    await act(async () => {});
    await act(async () => accept());
    await frames(80);
    expect(card()).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ver Segundo livro, de Autora. Livro de Ana' })).toBeNull();
    await frames(240);
    expect(card(second.title)).toBeTruthy();
  });
  it('não duplica a interação durante a saída ou espera de rede', async () => {
    await host();
    const pass = screen.getByRole('button', { name: 'Passar livro' });
    fireEvent.click(pass); fireEvent.click(pass);
    await frames(320);
    fireEvent.click(screen.getByRole('button', { name: 'Gostei do livro' }));
    expect(network.post).toHaveBeenCalledTimes(1);
    expect(card()).toBeTruthy();
  });
  it('restaura o mesmo livro e remove o feedback se a API falha', async () => {
    await host();
    fireEvent.click(screen.getByRole('button', { name: 'Passar livro' }));
    await frames(96);
    await act(async () => reject(new Error('offline')));
    await frames(240);
    expect(x()).toBe(0); expect(alpha()).toBe(1);
    expect(screen.queryByTestId('discover-pass-feedback')).toBeNull();
    expect((screen.getByRole('button', { name: 'Passar livro' }) as HTMLButtonElement).disabled).toBe(false);
    expect(network.alert).toHaveBeenCalledWith('A ação não foi salva', 'Falha de conexão');
  });
  it('mantém feedback de salvamento enquanto espera uma API lenta', async () => {
    await host();
    fireEvent.click(screen.getByRole('button', { name: 'Passar livro' }));
    await frames(320);
    expect(screen.getByText('Salvando sua escolha…')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Passar livro' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('não sobrepõe o aviso de rede ao ícone e ao card durante a saída', async () => {
    await host();
    fireEvent.click(screen.getByRole('button', { name: 'Passar livro' })); await frames(80);
    expect(screen.queryByText('Salvando sua escolha…')).toBeNull();
    expect(Number(getComputedStyle(screen.getByTestId('discover-pass-feedback')).opacity)).toBeGreaterThan(0);
  });
  it('devolve o mesmo livro ao centro após erro mesmo se um refetch trocar o primeiro card', async () => {
    const { client } = await host();
    fireEvent.click(screen.getByRole('button', { name: 'Gostei do livro' })); await frames(80);
    const inserted = { ...first, id: 'inserted', title: 'Livro que voltou' };
    act(() => client.setQueryData(['books', 'discover'], { pages: [{ items: [inserted, first, second], pageInfo }], pageParams: [''] }));
    await frames(16); await act(async () => reject(new Error('offline'))); await frames(240);
    expect(card()).toBeTruthy(); expect(x()).toBe(0); expect(alpha()).toBe(1);
  });
  it('ignora o resultado de uma conta anterior sem modificar a fila da nova conta', async () => {
    const { client, mounted } = await host();
    fireEvent.click(screen.getByRole('button', { name: 'Gostei do livro' })); await frames(32);
    device.owner = 'other-reader';
    act(() => client.setQueryData(['books', 'discover'], { pages: [{ items: [second, third], pageInfo }], pageParams: [''] }));
    mounted.rerender(tree(client)); await frames(16);
    await act(async () => accept()); await frames(400);
    expect(card(second.title)).toBeTruthy(); expect(alpha(card(second.title))).toBe(1);
    const cached = client.getQueryData<{ pages: { items: { id: string }[] }[] }>(['books', 'discover']);
    expect(cached?.pages[0].items.map(item => item.id)).toEqual(['second', 'third']);
  });
  it.each([true, 'unknown'] as const)('não desloca o card com preferência de movimento %s', async preference => {
    device.reduced = preference === true; device.delayPreference = preference === 'unknown';
    await host();
    fireEvent.click(screen.getByRole('button', { name: 'Passar livro' }));
    await frames(80);
    expect(x()).toBe(0); expect(alpha()).toBe(1);
    expect(screen.queryByTestId('discover-pass-feedback')).toBeNull();
    await act(async () => accept()); await frames(32);
    expect(card(second.title)).toBeTruthy(); expect(alpha(card(second.title))).toBe(1);
  });
  it('cancela a saída ao ativar Reduzir movimento sem perder o sucesso da API', async () => {
    await host();
    fireEvent.click(screen.getByRole('button', { name: 'Gostei do livro' }));
    await frames(80);
    act(() => device.listener?.(true));
    expect(x()).toBe(0);
    await act(async () => accept()); await frames(32);
    expect(card(second.title)).toBeTruthy(); expect(alpha(card(second.title))).toBe(1);
  });
  it('mantém o livro enviado durante refetch e remove somente o ID confirmado', async () => {
    const { client } = await host();
    fireEvent.click(screen.getByRole('button', { name: 'Gostei do livro' }));
    await frames(80);
    const inserted = { ...first, id: 'inserted', title: 'Livro que voltou' };
    act(() => client.setQueryData(['books', 'discover'], { pages: [{ items: [inserted, first, second], pageInfo }], pageParams: [''] }));
    await frames(16);
    expect(card()).toBeTruthy();
    await act(async () => accept()); await frames(320);
    expect(card(inserted.title)).toBeTruthy();
    const cached = client.getQueryData<{ pages: { items: { id: string }[] }[] }>(['books', 'discover']);
    expect(cached?.pages.flatMap(page => page.items.map(item => item.id))).toEqual(['inserted', 'second']);
  });
  it('não aplica callbacks antigos após desmontar', async () => {
    const { mounted, client } = await host();
    fireEvent.click(screen.getByRole('button', { name: 'Gostei do livro' }));
    await frames(32); mounted.unmount();
    await act(async () => accept()); await frames(400);
    const cached = client.getQueryData<{ pages: { items: { id: string }[] }[] }>(['books', 'discover']);
    expect(cached?.pages[0].items.map(item => item.id)).toEqual(['first', 'second', 'third']);
  });
  it('invalida as listas da mesma sessão quando a confirmação chega após sair da tela', async () => {
    const { mounted, client } = await host();
    for (const key of [['likes', 'sent'], ['matches'], ['conversations']]) client.setQueryData(key, []);
    fireEvent.click(screen.getByRole('button', { name: 'Gostei do livro' })); await frames(32);
    mounted.unmount(); await act(async () => accept()); await frames(32);
    for (const key of [['books', 'discover'], ['likes', 'sent'], ['matches'], ['conversations']]) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  });
  it('não invalida uma nova sessão da mesma conta após desmontar', async () => {
    const { mounted, client } = await host(); client.setQueryData(['likes', 'sent'], []);
    fireEvent.click(screen.getByRole('button', { name: 'Gostei do livro' })); await frames(32); mounted.unmount();
    device.epoch++; await act(async () => accept()); await frames(32);
    expect(client.getQueryState(['likes', 'sent'])?.isInvalidated).toBe(false);
  });
  it('mantém o snapshot pendente mesmo quando um refetch da fila falha', async () => {
    const { client } = await host();
    fireEvent.click(screen.getByRole('button', { name: 'Gostei do livro' })); await frames(64);
    network.get.mockRejectedValueOnce(new Error('refresh offline'));
    await act(async () => { await client.refetchQueries({ queryKey: ['books', 'discover'] }); }); await frames(16);
    expect(client.getQueryState(['books', 'discover'])?.status).toBe('error');
    expect(card()).toBeTruthy(); expect(screen.queryByText('A descoberta falhou')).toBeNull();
    await act(async () => accept()); await frames(320); expect(card(second.title)).toBeTruthy();
  });
  it('cancela a saída em uma mudança somente de altura sem perder a confirmação', async () => {
    const { client, mounted } = await host();
    fireEvent.click(screen.getByRole('button', { name: 'Gostei do livro' })); await frames(80);
    device.height = 300; mounted.rerender(tree(client));
    expect(x()).toBe(0); expect(alpha()).toBe(1);
    await act(async () => accept()); await frames(320); expect(card(second.title)).toBeTruthy();
  });
  it('limpa a animação ao sair da aba sem impedir o salvamento', async () => {
    const { mounted, client } = await host();
    fireEvent.click(screen.getByRole('button', { name: 'Passar livro' })); await frames(80);
    device.focused = false; mounted.rerender(tree(client));
    expect(x()).toBe(0); expect(alpha()).toBe(1);
    await act(async () => accept()); await frames(32);
    device.focused = true; mounted.rerender(tree(client));
    expect(card(second.title)).toBeTruthy(); expect(alpha(card(second.title))).toBe(1);
  });
});
