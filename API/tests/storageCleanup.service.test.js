import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  env: { STORAGE_MODE: 'r2' },
  storageCleanupRepository: { delete: vi.fn(), listDue: vi.fn(), recordFailure: vi.fn() },
  storageService: { delete: vi.fn() }
}));

vi.mock('../src/config/env.js', () => ({ env: mocks.env }));
vi.mock('../src/modules/media/storageCleanup.repository.js', () => ({
  storageCleanupRepository: mocks.storageCleanupRepository
}));
vi.mock('../src/modules/media/storage.service.js', () => ({ storageService: mocks.storageService }));

const { storageCleanupService } = await import('../src/modules/media/storageCleanup.service.js');

describe('storageCleanupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.env.STORAGE_MODE = 'r2';
  });

  it('remove job depois da exclusão confirmada do objeto', async () => {
    await expect(storageCleanupService.process('books/user/book/photo.jpg')).resolves.toBe(true);

    expect(mocks.storageService.delete).toHaveBeenCalledWith('books/user/book/photo.jpg');
    expect(mocks.storageCleanupRepository.delete).toHaveBeenCalledWith('books/user/book/photo.jpg');
    expect(mocks.storageCleanupRepository.recordFailure).not.toHaveBeenCalled();
  });

  it('mantém e agenda retry quando o objeto não pode ser excluído', async () => {
    const error = Object.assign(new Error('não registrar credenciais'), { code: 'R2_UNAVAILABLE' });
    mocks.storageService.delete.mockRejectedValue(error);

    await expect(storageCleanupService.process('books/user/book/photo.jpg')).resolves.toBe(false);

    expect(mocks.storageCleanupRepository.recordFailure).toHaveBeenCalledWith(
      'books/user/book/photo.jpg',
      'R2_UNAVAILABLE'
    );
    expect(mocks.storageCleanupRepository.delete).not.toHaveBeenCalled();
  });

  it('ignora a fila quando o R2 não está configurado neste processo', async () => {
    mocks.env.STORAGE_MODE = 'development';

    await expect(storageCleanupService.processDue()).resolves.toBe(0);
    expect(mocks.storageCleanupRepository.listDue).not.toHaveBeenCalled();
  });
});
