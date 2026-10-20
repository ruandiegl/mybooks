import { describe, expect, it } from 'vitest';
import { getExchangeBookSlots, getAvailabilityLabel, isExchangeBookSelectable } from '../exchangeBooks';

const mine = {
  id: 'book-mine',
  title: 'A mão esquerda da escuridão',
  authors: ['Ursula K. Le Guin'],
  coverUrl: 'https://covers.test/mine.jpg',
  availability: 'AVAILABLE' as const
};
const theirs = {
  id: 'book-theirs',
  title: 'Kindred',
  authors: ['Octavia E. Butler'],
  coverUrl: null,
  availability: 'EXCHANGED' as const
};

describe('exchange book presentation policy', () => {
  it('keeps each book on the side assigned by the conversation response', () => {
    expect(getExchangeBookSlots({ mine, theirs })).toEqual([
      { side: 'mine', label: 'Seu livro', book: mine },
      { side: 'theirs', label: 'Livro da outra pessoa', book: theirs }
    ]);
  });

  it('keeps legacy exchanges visible as unavailable slots', () => {
    expect(getExchangeBookSlots(null)).toEqual([
      { side: 'mine', label: 'Seu livro', book: null },
      { side: 'theirs', label: 'Livro da outra pessoa', book: null }
    ]);
    expect(isExchangeBookSelectable(null)).toBe(false);
  });

  it('leaves a missing book side visible but disabled', () => {
    const slots = getExchangeBookSlots({ mine, theirs: null });

    expect(slots[0]).toMatchObject({ side: 'mine', book: mine });
    expect(slots[1]).toMatchObject({ side: 'theirs', book: null });
    expect(isExchangeBookSelectable(slots[1].book)).toBe(false);
  });

  it('does not block linked books just because they are reserved or exchanged', () => {
    expect(isExchangeBookSelectable(theirs)).toBe(true);
    expect(getAvailabilityLabel('EXCHANGED')).toBe('Trocado');
    expect(getAvailabilityLabel('RESERVED')).toBe('Reservado');
  });
});
