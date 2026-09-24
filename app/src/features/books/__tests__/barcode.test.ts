import { describe, expect, it } from 'vitest';
import { extractIsbnFromBarcode } from '../barcode';

describe('extractIsbnFromBarcode', () => {
  it('returns a normalized ISBN-13 from an EAN-13 book barcode', () => {
    expect(extractIsbnFromBarcode({ type: 'ean13', data: '978-85-457-0287-0' }))
      .toBe('9788545702870');
    expect(extractIsbnFromBarcode({ type: 'ean13', data: '9791234567896' }))
      .toBe('9791234567896');
  });

  it('rejects a valid EAN-13 that is not an ISBN', () => {
    expect(extractIsbnFromBarcode({ type: 'ean13', data: '7891234567895' })).toBeNull();
  });

  it('rejects unsupported barcode types', () => {
    expect(extractIsbnFromBarcode({ type: 'qr', data: '9788545702870' })).toBeNull();
    expect(extractIsbnFromBarcode({ data: '9788545702870' })).toBeNull();
  });

  it('rejects an ISBN with an invalid check digit', () => {
    expect(extractIsbnFromBarcode({ type: 'ean13', data: '9788545702871' })).toBeNull();
  });

  it('rejects URLs, free text and malformed separators', () => {
    expect(extractIsbnFromBarcode({
      type: 'ean13',
      data: 'https://example.com/9788545702870'
    })).toBeNull();
    expect(extractIsbnFromBarcode({ type: 'ean13', data: 'ISBN 9788545702870' })).toBeNull();
    expect(extractIsbnFromBarcode({ type: 'ean13', data: '978--8545702870' })).toBeNull();
  });
});
