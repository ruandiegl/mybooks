export const MAX_BOOK_PHOTOS = 3;
export const MAX_BOOK_PHOTO_SIZE = 8 * 1024 * 1024;
const SIGNED_IMAGE_REFRESH_BUFFER_MS = 20_000;
const MIN_SIGNED_IMAGE_REFRESH_DELAY_MS = 5_000;

export type SignedBookImageSource = {
  coverUrlExpiresAt?: string | null;
  images?: Array<{ expiresAt?: string | null }> | null;
};

export function getSignedBookImageRefreshDelay(
  books: Array<SignedBookImageSource | null | undefined>,
  now = Date.now()
): number | false {
  const expirations = books.flatMap((book) => [
    book?.coverUrlExpiresAt,
    ...(book?.images ?? []).map((image) => image.expiresAt)
  ]).filter((expiresAt): expiresAt is string => Boolean(expiresAt))
    .map((expiresAt) => Date.parse(expiresAt))
    .filter(Number.isFinite);

  if (expirations.length === 0) return false;

  return Math.max(
    MIN_SIGNED_IMAGE_REFRESH_DELAY_MS,
    Math.min(...expirations) - now - SIGNED_IMAGE_REFRESH_BUFFER_MS
  );
}

export type BookPhotoMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

export type BookPhotoDraft = {
  id: string;
  uri: string;
  mimeType?: BookPhotoMimeType;
  size?: number;
  imageId?: string;
};

export type PickedPhotoAsset = {
  uri?: string;
  mimeType?: string | null;
  fileSize?: number;
};

export class BookPhotoError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'BookPhotoError';
  }
}

function isAllowedMimeType(value?: string | null): value is BookPhotoMimeType {
  return value === 'image/jpeg' || value === 'image/png' || value === 'image/webp';
}

export function createBookPhoto(asset: PickedPhotoAsset, id: string): BookPhotoDraft {
  if (!asset.uri) {
    throw new BookPhotoError('Não foi possível abrir essa foto. Escolha outra imagem.', 'IMAGE_INVALID');
  }
  if (!isAllowedMimeType(asset.mimeType)) {
    throw new BookPhotoError('Use uma foto JPEG, PNG ou WebP.', 'IMAGE_TYPE_INVALID');
  }
  if (!Number.isInteger(asset.fileSize) || !asset.fileSize || asset.fileSize > MAX_BOOK_PHOTO_SIZE) {
    throw new BookPhotoError('Cada foto precisa ter entre 1 byte e 8 MB.', 'IMAGE_SIZE_INVALID');
  }

  return { id, uri: asset.uri, mimeType: asset.mimeType, size: asset.fileSize };
}

export function appendBookPhotos(current: BookPhotoDraft[], incoming: BookPhotoDraft[]) {
  const uris = new Set(current.map((photo) => photo.uri));
  const unique = incoming.filter((photo) => {
    if (uris.has(photo.uri)) return false;
    uris.add(photo.uri);
    return true;
  });

  if (current.length + unique.length > MAX_BOOK_PHOTOS) {
    throw new BookPhotoError('Um livro pode ter até três fotos.', 'IMAGE_LIMIT_REACHED');
  }

  return [...current, ...unique];
}

export function moveBookPhoto(photos: BookPhotoDraft[], from: number, to: number) {
  if (
    from < 0
    || to < 0
    || from >= photos.length
    || to >= photos.length
    || from === to
  ) return photos;

  const result = [...photos];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
}

export function removeBookPhoto(photos: BookPhotoDraft[], index: number) {
  if (index < 0 || index >= photos.length) return photos;
  return photos.filter((_, photoIndex) => photoIndex !== index);
}
