import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  fileUpload: vi.fn(),
  fileUri: null as string | null,
  uploadUrl: null as string | null,
  uploadOptions: null as Record<string, unknown> | null
}));
vi.mock('../../../services/api', () => ({ api: mocks }));
vi.mock('expo-file-system', () => ({
  File: class {
    constructor(uri: string) {
      mocks.fileUri = uri;
    }

    upload(url: string, options: Record<string, unknown>) {
      mocks.uploadUrl = url;
      mocks.uploadOptions = options;
      return mocks.fileUpload(url, options);
    }
  },
  UploadType: { BINARY_CONTENT: 0 }
}));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

const {
  BookPhotoUploadError,
  bookPhotoPartialSaveMessage,
  deleteBookPhoto,
  saveBookPhotoOrder,
  uploadBookPhoto
} = await import('../bookPhotoUpload');
let fetchMock: ReturnType<typeof vi.fn>;

describe('book photo upload contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.post
      .mockResolvedValueOnce({ data: { data: {
        imageId: '30000000-0000-4000-8000-000000000003',
        uploadUrl: 'https://r2.example/signed-put',
        storageKey: 'pending/books/owner/book/image.jpg',
        headers: { 'Content-Type': 'image/jpeg' },
        expiresIn: 300
      } } })
      .mockResolvedValueOnce({ data: { data: {
        id: '30000000-0000-4000-8000-000000000003',
        url: 'https://r2.example/signed-get',
        sortOrder: 0,
        isCover: true,
        expiresAt: '2026-10-01T00:00:00.000Z'
      } } });
    mocks.put.mockResolvedValue({ data: { data: {} } });
    mocks.fileUpload.mockResolvedValue({ status: 200, body: '', headers: {} });
    fetchMock = vi.fn()
      .mockResolvedValueOnce({ blob: async () => new Blob(['photo']) })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('envia a URI local como conteúdo binário pelo PUT assinado antes de confirmar', async () => {
    const image = await uploadBookPhoto('book/one', {
      id: 'local',
      uri: 'file://cover.jpg',
      mimeType: 'image/jpeg',
      size: 5
    });

    expect(mocks.post).toHaveBeenNthCalledWith(1, '/api/v1/books/book%2Fone/images/presign', {
      mimeType: 'image/jpeg',
      size: 5
    });
    expect(mocks.fileUri).toBe('file://cover.jpg');
    expect(mocks.uploadUrl).toBe('https://r2.example/signed-put');
    expect(mocks.uploadOptions).toEqual({
      httpMethod: 'PUT',
      uploadType: 0,
      headers: { 'Content-Type': 'image/jpeg' }
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.post).toHaveBeenNthCalledWith(2, '/api/v1/books/book%2Fone/images/complete', {
      imageId: '30000000-0000-4000-8000-000000000003',
      storageKey: 'pending/books/owner/book/image.jpg',
      mimeType: 'image/jpeg',
      size: 5
    });
    expect(image).toMatchObject({ id: '30000000-0000-4000-8000-000000000003', sortOrder: 0, isCover: true });
  });

  it('não confirma quando o PUT falha', async () => {
    mocks.fileUpload.mockResolvedValue({ status: 403, body: 'signature details', headers: {} });

    await expect(uploadBookPhoto('book', {
      id: 'local', uri: 'file://cover.jpg', mimeType: 'image/jpeg', size: 5
    })).rejects.toMatchObject({
      name: 'BookPhotoUploadError',
      code: 'BOOK_PHOTO_UPLOAD_REJECTED',
      status: 403
    });
    expect(mocks.post).toHaveBeenCalledOnce();
  });

  it('preserves the safe storage status in the partial-save message', () => {
    const failure = new BookPhotoUploadError(
      'O armazenamento recusou a foto (HTTP 403).',
      'BOOK_PHOTO_UPLOAD_REJECTED',
      403
    );

    expect(bookPhotoPartialSaveMessage(failure)).toBe('O armazenamento recusou a foto (HTTP 403).');
  });

  it('does not label every partial save as a connection problem', () => {
    expect(bookPhotoPartialSaveMessage(new Error('unexpected internal detail'))).toBe(
      'Algumas alterações ficaram pendentes. Revise as fotos e tente salvar novamente.'
    );
  });

  it('envia a lista completa na ordem desejada e remove pelo endpoint do livro', async () => {
    await saveBookPhotoOrder('book', ['first', 'second']);
    await deleteBookPhoto('book', 'second');

    expect(mocks.put).toHaveBeenCalledWith('/api/v1/books/book/images/order', { imageIds: ['first', 'second'] });
    expect(mocks.delete).toHaveBeenCalledWith('/api/v1/books/book/images/second');
  });
});
