import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';

const cache = new Map();
const cacheTtlMs = 10 * 60 * 1000;

export async function fetchBookByIsbn(isbn) {
  const cached = cache.get(isbn);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.ISBN_API_TIMEOUT_MS);

  try {
    const response = await fetch(env.ISBN_API_BASE_URL + '/isbn/v1/' + encodeURIComponent(isbn), {
      headers: { accept: 'application/json' },
      signal: controller.signal
    });

    if (response.status === 404) {
      throw new AppError('Nenhum livro foi encontrado para este ISBN.', {
        statusCode: 404,
        code: 'ISBN_NOT_FOUND'
      });
    }

    if (response.status === 400) {
      throw new AppError('O ISBN informado é inválido.', {
        statusCode: 422,
        code: 'ISBN_INVALID'
      });
    }

    if (response.status === 429) {
      throw new AppError('O serviço de ISBN recebeu muitas consultas. Tente novamente em instantes.', {
        statusCode: 503,
        code: 'ISBN_PROVIDER_RATE_LIMITED'
      });
    }

    if (!response.ok) {
      throw new AppError('O serviço de ISBN está temporariamente indisponível.', {
        statusCode: 503,
        code: 'ISBN_PROVIDER_UNAVAILABLE'
      });
    }

    const value = await response.json();
    cache.set(isbn, { value, expiresAt: Date.now() + cacheTtlMs });
    return value;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('O serviço de ISBN está temporariamente indisponível.', {
      statusCode: 503,
      code: 'ISBN_PROVIDER_UNAVAILABLE',
      cause: error
    });
  } finally {
    clearTimeout(timer);
  }
}
