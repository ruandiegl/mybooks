import type { BookAvailability, ExchangeBookSummary, ExchangeBooks } from '../../types/api';

export type ExchangeBookSlot = {
  side: 'mine' | 'theirs';
  label: string;
  book: ExchangeBookSummary | null;
};

export function getExchangeBookSlots(exchangeBooks: ExchangeBooks | null): [ExchangeBookSlot, ExchangeBookSlot] {
  return [
    { side: 'mine', label: 'Seu livro', book: exchangeBooks?.mine ?? null },
    { side: 'theirs', label: 'Livro da outra pessoa', book: exchangeBooks?.theirs ?? null }
  ];
}

export function isExchangeBookSelectable(book: ExchangeBookSummary | null): book is ExchangeBookSummary {
  return book !== null;
}

export function getAvailabilityLabel(availability: BookAvailability): string {
  switch (availability) {
    case 'AVAILABLE': return 'Disponível';
    case 'RESERVED': return 'Reservado';
    case 'EXCHANGED': return 'Trocado';
  }
}
