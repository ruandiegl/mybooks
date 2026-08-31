export function serializeBook(book) {
  if (!book) return null;

  const coverImage = book.images?.find((image) => image.isCover) ?? book.images?.[0];

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
    coverUrl: coverImage?.url ?? book.coverExternalUrl ?? null,
    images: (book.images ?? []).map((image) => ({
      id: image.id,
      url: image.url,
      isCover: image.isCover
    })),
    owner: book.owner ?? null,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt
  };
}
