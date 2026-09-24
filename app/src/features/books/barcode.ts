export type BarcodePayload = {
  data: string;
  type?: string;
};

function hasValidIsbn13CheckDigit(isbn: string) {
  const weightedTotal = isbn
    .slice(0, 12)
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  const expectedCheckDigit = (10 - (weightedTotal % 10)) % 10;
  return expectedCheckDigit === Number(isbn[12]);
}

export function extractIsbnFromBarcode(payload: BarcodePayload): string | null {
  if (payload.type !== 'ean13' || !/^\d(?:-?\d){12}$/.test(payload.data)) return null;

  const isbn = payload.data.replaceAll('-', '');
  if (!isbn.startsWith('978') && !isbn.startsWith('979')) return null;

  return hasValidIsbn13CheckDigit(isbn) ? isbn : null;
}
