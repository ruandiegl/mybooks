import { afterEach, describe, expect, it, vi } from 'vitest';

const fullPayload = {
  provider: 'BRASIL_API',
  title: 'Domain-Driven Design',
  subtitle: 'Atacando as complexidades',
  authors: ['Eric Evans'],
  publisher: 'Alta Books',
  synopsis: 'Modelagem estratégica.',
  year: 2016,
  page_count: 560,
  subjects: ['Software'],
  cover_url: 'https://example.com/cover.jpg',
  provider_extra: { edition: '1' }
};

const okResponse = (payload) => ({
  status: 200,
  ok: true,
  json: vi.fn().mockResolvedValue(payload)
});

async function loadProvider() {
  vi.resetModules();
  return import('../src/modules/isbn/isbn.provider.js');
}

describe('fetchBookByIsbn', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('aceita payload completo da BrasilAPI e campos extras', async () => {
    const { fetchBookByIsbn } = await loadProvider();
    const fetchMock = vi.fn().mockResolvedValue(okResponse(fullPayload));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchBookByIsbn('9788545702870');

    expect(result).toEqual(fullPayload);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/isbn\/v1\/9788545702870$/),
      expect.objectContaining({ headers: { accept: 'application/json' }, signal: expect.any(AbortSignal) })
    );
  });

  it('mantém cache curto para respostas válidas', async () => {
    const { fetchBookByIsbn } = await loadProvider();
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ title: 'Livro em cache' }));
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchBookByIsbn('9780000000001');
    const second = await fetchBookByIsbn('9780000000001');

    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('remove entrada expirada e consulta novamente', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-11T12:00:00Z'));
    const { fetchBookByIsbn } = await loadProvider();
    const response = okResponse({ title: 'Primeira versão' });
    response.json.mockResolvedValueOnce({ title: 'Primeira versão' }).mockResolvedValueOnce({ title: 'Segunda versão' });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);

    await fetchBookByIsbn('9780000000010');
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000 + 1);
    const refreshed = await fetchBookByIsbn('9780000000010');

    expect(refreshed).toEqual({ title: 'Segunda versão' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('limita o cache a 500 ISBNs e remove o mais antigo', async () => {
    const { fetchBookByIsbn } = await loadProvider();
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ title: 'Livro válido' }));
    vi.stubGlobal('fetch', fetchMock);

    for (let index = 0; index <= 500; index += 1) {
      await fetchBookByIsbn(`cache-${String(index).padStart(3, '0')}`);
    }
    await fetchBookByIsbn('cache-000');

    expect(fetchMock).toHaveBeenCalledTimes(502);
  });

  it('mapeia não encontrado sem esconder o motivo', async () => {
    const { fetchBookByIsbn } = await loadProvider();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404, ok: false }));

    await expect(fetchBookByIsbn('9780000000002')).rejects.toMatchObject({ statusCode: 404, code: 'ISBN_NOT_FOUND' });
  });

  it('mapeia ISBN recusado pelo provedor', async () => {
    const { fetchBookByIsbn } = await loadProvider();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 400, ok: false }));

    await expect(fetchBookByIsbn('9780000000004')).rejects.toMatchObject({ statusCode: 422, code: 'ISBN_INVALID' });
  });

  it('mapeia limite do provedor para indisponibilidade temporária', async () => {
    const { fetchBookByIsbn } = await loadProvider();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 429, ok: false }));

    await expect(fetchBookByIsbn('9780000000003')).rejects.toMatchObject({ statusCode: 503, code: 'ISBN_PROVIDER_RATE_LIMITED' });
  });

  it('mapeia erro de rede para indisponibilidade', async () => {
    const { fetchBookByIsbn } = await loadProvider();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')));

    await expect(fetchBookByIsbn('9780000000005')).rejects.toMatchObject({ statusCode: 503, code: 'ISBN_PROVIDER_UNAVAILABLE' });
  });

  it('aborta a consulta no timeout e retorna indisponibilidade', async () => {
    vi.useFakeTimers();
    const { fetchBookByIsbn } = await loadProvider();
    let receivedSignal;
    const fetchMock = vi.fn((_url, { signal }) => {
      receivedSignal = signal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const lookup = fetchBookByIsbn('9780000000006');
    const rejection = expect(lookup).rejects.toMatchObject({ statusCode: 503, code: 'ISBN_PROVIDER_UNAVAILABLE' });
    await vi.advanceTimersByTimeAsync(6_000);

    await rejection;
    expect(receivedSignal.aborted).toBe(true);
  });

  it.each([
    ['null', null],
    ['objeto vazio', {}],
    ['título vazio', { ...fullPayload, title: '   ' }],
    ['tipo inesperado', { ...fullPayload, authors: 'Eric Evans' }],
    ['URL inválida', { ...fullPayload, cover_url: 'não é uma URL' }],
    ['provider excessivo', { ...fullPayload, provider: 'p'.repeat(65) }],
    ['título excessivo', { ...fullPayload, title: 't'.repeat(161) }],
    ['subtítulo excessivo', { ...fullPayload, subtitle: 's'.repeat(181) }],
    ['autores excessivos', { ...fullPayload, authors: Array.from({ length: 13 }, (_, index) => `Autor ${index}`) }],
    ['autor excessivo', { ...fullPayload, authors: ['a'.repeat(121)] }],
    ['editora excessiva', { ...fullPayload, publisher: 'e'.repeat(121) }],
    ['sinopse excessiva', { ...fullPayload, synopsis: 's'.repeat(3001) }],
    ['ano fora da faixa', { ...fullPayload, year: 999 }],
    ['páginas fora da faixa', { ...fullPayload, page_count: 20001 }],
    ['assuntos excessivos', { ...fullPayload, subjects: Array.from({ length: 21 }, (_, index) => `Tema ${index}`) }],
    ['assunto excessivo', { ...fullPayload, subjects: ['t'.repeat(81)] }],
    ['URL excessiva', { ...fullPayload, cover_url: `https://example.com/${'a'.repeat(2030)}` }]
  ])('rejeita payload inválido: %s', async (_label, payload) => {
    const { fetchBookByIsbn } = await loadProvider();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse(payload)));

    await expect(fetchBookByIsbn(`invalid-${_label}`)).rejects.toMatchObject({
      statusCode: 503,
      code: 'ISBN_PROVIDER_UNAVAILABLE'
    });
  });

  it('não armazena payload inválido no cache', async () => {
    const { fetchBookByIsbn } = await loadProvider();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(okResponse({ title: '' }))
      .mockResolvedValueOnce(okResponse({ title: 'Resposta válida' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchBookByIsbn('9780000000007')).rejects.toMatchObject({ code: 'ISBN_PROVIDER_UNAVAILABLE' });
    await expect(fetchBookByIsbn('9780000000007')).resolves.toEqual({ title: 'Resposta válida' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
