import { describe, expect, it } from 'vitest';
import {
  getIsbnLookupCandidate,
  getScannedIsbnLookupDecision,
  mergeIsbnLookup,
  shouldApplyIsbnLookup
} from '../isbnForm';

describe('getIsbnLookupCandidate', () => {
  it('normalizes a newly scanned ISBN for lookup', () => {
    expect(getIsbnLookupCandidate('978-85-457-0287-0', null, null)).toBe('9788545702870');
  });

  it('does not repeat an ISBN lookup that is pending or already confirmed', () => {
    expect(getIsbnLookupCandidate('9788545702870', '9788545702870', null)).toBeNull();
    expect(getIsbnLookupCandidate('9788545702870', null, '9788545702870')).toBeNull();
  });

  it('does not create a lookup for an empty value', () => {
    expect(getIsbnLookupCandidate(' - ', null, null)).toBeNull();
  });
});

describe('getScannedIsbnLookupDecision', () => {
  it('keeps a confirmed lookup and skips GET when the same ISBN is scanned again', () => {
    expect(getScannedIsbnLookupDecision('9788545702870', null, '9788545702870')).toEqual({
      normalizedIsbn: '9788545702870',
      shouldClearConfirmedLookup: false,
      shouldLookup: false
    });
  });

  it('clears the obsolete confirmed lookup before requesting a different ISBN', () => {
    expect(getScannedIsbnLookupDecision('9791234567896', null, '9788545702870')).toEqual({
      normalizedIsbn: '9791234567896',
      shouldClearConfirmedLookup: true,
      shouldLookup: true
    });
  });
});

describe('shouldApplyIsbnLookup', () => {
  it('ignores response A after the form has started lookup B', () => {
    expect(shouldApplyIsbnLookup('9788545702870', '9791234567896')).toBe(false);
    expect(shouldApplyIsbnLookup('9791234567896', '979-12-34567-89-6')).toBe(true);
  });
});

describe('mergeIsbnLookup', () => {
  it('preserves a field edited by the user while filling untouched fields', () => {
    const current = {
      isbn: '9788545702870',
      title: 'Meu título',
      authors: '',
      publisher: '',
      synopsis: '',
      year: '',
      pageCount: '',
      subjects: ''
    };
    const lookup = {
      isbn: '9788545702870',
      status: 'FOUND' as const,
      source: 'BRASIL_API',
      book: {
        title: 'Título do provedor',
        authors: ['Autora'],
        publisher: 'Editora',
        synopsis: null,
        year: 2024,
        pageCount: 320,
        subjects: ['Ficção'],
        coverUrl: null
      }
    };

    expect(mergeIsbnLookup(current, lookup, new Set(['title']))).toMatchObject({
      isbn: '9788545702870',
      title: 'Meu título',
      authors: 'Autora',
      publisher: 'Editora'
    });
  });
});
