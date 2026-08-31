export function normalizeIsbn(value) {
  if (!value) return '';
  return String(value).replace(/[^0-9Xx]/g, '').toUpperCase();
}

function isValidIsbn10(isbn) {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  const total = isbn.split('').reduce((sum, char, index) => {
    const value = char === 'X' ? 10 : Number(char);
    return sum + value * (10 - index);
  }, 0);
  return total % 11 === 0;
}

function isValidIsbn13(isbn) {
  if (!/^\d{13}$/.test(isbn)) return false;
  const total = isbn
    .slice(0, 12)
    .split('')
    .reduce((sum, char, index) => sum + Number(char) * (index % 2 === 0 ? 1 : 3), 0);
  const checkDigit = (10 - (total % 10)) % 10;
  return checkDigit === Number(isbn[12]);
}

export function isValidIsbn(value) {
  const isbn = normalizeIsbn(value);
  return isbn.length === 10 ? isValidIsbn10(isbn) : isValidIsbn13(isbn);
}
