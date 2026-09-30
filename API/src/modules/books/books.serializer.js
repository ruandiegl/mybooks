import { storageService } from '../media/storage.service.js';

function compareImages(a, b) {
  if (Number.isInteger(a.sortOrder) && Number.isInteger(b.sortOrder)) {
    return a.sortOrder - b.sortOrder || a.id.localeCompare(b.id);
  }
  if (a.isCover !== b.isCover) return Number(b.isCover) - Number(a.isCover);
  const createdAtOrder = new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0);
  return createdAtOrder || a.id.localeCompare(b.id);
}

async function serializeImage(image, sortOrder) {
  const signed = image.storageKey
    ? await storageService.getPresignedGetUrl(image.storageKey)
    : null;

  return {
    id: image.id,
    url: signed?.url ?? image.url ?? null,
    sortOrder,
    isCover: sortOrder === 0,
    expiresAt: signed?.expiresAt ?? null
  };
}

export async function serializeBook(book) {
  if (!book) return null;

  const sortedImages = [...(book.images ?? [])].sort(compareImages);
  const images = await Promise.all(sortedImages.map(serializeImage));
  const cover = images[0] ?? null;

  return {
    id: book.id,
    title: book.title,
    subtitle: book.subtitle,
    authors: book.authors,
    publisher: book.publisher,
    synopsis: book.synopsis,
    year: book.year,
    pageCount: book.pageCount,
    subjects: book.subjects,
    isbn: book.isbn,
    hasIsbnBadge: book.isbnStatus === 'VALID',
    isbnProvider: book.isbnProvider,
    availability: book.availability,
    coverUrl: cover?.url ?? book.coverExternalUrl ?? null,
    coverUrlExpiresAt: cover?.url ? cover.expiresAt : null,
    images,
    owner: book.owner ?? null,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt
  };
}
