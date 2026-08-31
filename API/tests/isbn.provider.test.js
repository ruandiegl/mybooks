import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBookByIsbn } from '../src/modules/isbn/isbn.provider.js';

describe('fetchBookByIsbn', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('mantém cache curto para respostas válidas', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({ title: 'Livro em cache' }) });
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchBookByIsbn('9780000000001');
    const second = await fetchBookByIsbn('9780000000001');

    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('mapeia não encontrado sem esconder o motivo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404, ok: false }));

    await expect(fetchBookByIsbn('9780000000002')).rejects.toMatchObject({ statusCode: 404, code: 'ISBN_NOT_FOUND' });
  });

  it('mapeia limite do provedor para indisponibilidade temporária', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 429, ok: false }));

    await expect(fetchBookByIsbn('9780000000003')).rejects.toMatchObject({ statusCode: 503, code: 'ISBN_PROVIDER_RATE_LIMITED' });
  });
});
