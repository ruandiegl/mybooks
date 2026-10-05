import type { Book, BookImage } from '../../types/api';

export function getBookGalleryPhotos(book: Pick<Book, 'images' | 'coverUrl' | 'coverUrlExpiresAt'>): BookImage[] {
  const photos = [...book.images].sort((first, second) => first.sortOrder - second.sortOrder);
  if (photos.length > 0) {
    return photos.map((photo) => photo.sortOrder === 0 && !photo.url && book.coverUrl
      ? { ...photo, url: book.coverUrl, expiresAt: book.coverUrlExpiresAt ?? null }
      : photo);
  }
  return book.coverUrl ? [{
    id: 'external-cover', url: book.coverUrl, sortOrder: 0, isCover: true,
    expiresAt: book.coverUrlExpiresAt ?? null
  }] : [];
}
