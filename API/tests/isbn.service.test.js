import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/shared/errors/AppError.js';

const mocks = vi.hoisted(() => ({
  fetchBookByIsbn: vi.fn()
}));

vi.mock('../src/modules/isbn/isbn.provider.js', () => ({
  fetchBookByIsbn: mocks.fetchBookByIsbn
}));

const { isbnService } = await import('../src/modules/isbn/isbn.service.js');

describe('isbnService', () => {
  beforeEach(() => {
    mocks.fetchBookByIsbn.mockReset();
  });

  it('normaliza o ISBN e expõe somente o mapeamento público do provedor', async () => {
    mocks.fetchBookByIsbn.mockResolvedValue({
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
      raw_payload: { internalId: 'provider-secret' }
    });

    const result = await isbnService.lookup('978-85-457-0287-0');

    expect(mocks.fetchBookByIsbn).toHaveBeenCalledWith('9788545702870');
    expect(result).toEqual({
      isbn: '9788545702870',
      status: 'FOUND',
      source: 'BRASIL_API',
      book: {
        title: 'Domain-Driven Design',
        subtitle: 'Atacando as complexidades',
        authors: ['Eric Evans'],
        publisher: 'Alta Books',
        synopsis: 'Modelagem estratégica.',
        year: 2016,
        pageCount: 560,
        subjects: ['Software'],
        coverUrl: 'https://example.com/cover.jpg'
      }
    });
    expect(JSON.stringify(result)).not.toContain('provider-secret');
  });

  it('rejeita ISBN matematicamente inválido sem consultar o provedor', async () => {
    await expect(isbnService.lookup('9788545702871')).rejects.toMatchObject({
      statusCode: 422,
      code: 'ISBN_INVALID'
    });
    expect(mocks.fetchBookByIsbn).not.toHaveBeenCalled();
  });

  it.each([
    ['ISBN_NOT_FOUND', 404],
    ['ISBN_PROVIDER_RATE_LIMITED', 503],
    ['ISBN_PROVIDER_UNAVAILABLE', 503]
  ])('preserva o erro %s retornado pelo provedor', async (code, statusCode) => {
    mocks.fetchBookByIsbn.mockRejectedValue(new AppError('Falha controlada.', { code, statusCode }));

    await expect(isbnService.lookup('9788545702870')).rejects.toMatchObject({ code, statusCode });
  });
});
