import type { IsbnLookup } from '../../types/api';

export type BookDraft = {
  isbn: string;
  title: string;
  authors: string;
  publisher: string;
  synopsis: string;
  year: string;
  pageCount: string;
  subjects: string;
};

export type EditableBookField = Exclude<keyof BookDraft, 'isbn'>;

export function normalizeIsbnInput(value: string) {
  return value.toUpperCase().replace(/[^0-9X]/g, '');
}

export function getIsbnLookupCandidate(
  value: string,
  pendingIsbn: string | null,
  confirmedIsbn: string | null
) {
  const normalized = normalizeIsbnInput(value);
  if (!normalized || pendingIsbn === normalized || confirmedIsbn === normalized) return null;
  return normalized;
}

export function getScannedIsbnLookupDecision(
  value: string,
  pendingIsbn: string | null,
  confirmedIsbn: string | null
) {
  const normalizedIsbn = normalizeIsbnInput(value);
  return {
    normalizedIsbn,
    shouldClearConfirmedLookup: Boolean(
      normalizedIsbn && confirmedIsbn && confirmedIsbn !== normalizedIsbn
    ),
    shouldLookup: getIsbnLookupCandidate(value, pendingIsbn, confirmedIsbn) !== null
  };
}

export function shouldApplyIsbnLookup(requestedIsbn: string, currentValue: string) {
  return normalizeIsbnInput(currentValue) === requestedIsbn;
}

export function mergeIsbnLookup(
  current: BookDraft,
  lookup: IsbnLookup,
  dirtyFields: ReadonlySet<EditableBookField>
): BookDraft {
  const suggestions: Record<EditableBookField, string> = {
    title: lookup.book.title || '',
    authors: lookup.book.authors.join(', '),
    publisher: lookup.book.publisher || '',
    synopsis: lookup.book.synopsis || '',
    year: lookup.book.year ? String(lookup.book.year) : '',
    pageCount: lookup.book.pageCount ? String(lookup.book.pageCount) : '',
    subjects: lookup.book.subjects.join(', ')
  };

  const merged = { ...current, isbn: lookup.isbn };
  for (const [field, suggestion] of Object.entries(suggestions) as Array<[EditableBookField, string]>) {
    if (suggestion && !dirtyFields.has(field)) merged[field] = suggestion;
  }
  return merged;
}
