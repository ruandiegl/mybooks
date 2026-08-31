import { describe, expect, it } from 'vitest';
import { mergeIsbnLookup, normalizeIsbnInput } from '../../app/src/features/books/isbnForm.ts';
import { orderMessagePages, updateMessageStatus, upsertMessage } from '../../app/src/features/chat/messageCache.ts';

const baseDraft = { isbn: '', title: '', authors: '', publisher: '', synopsis: '', year: '', pageCount: '', subjects: '' };
const lookup = {
  isbn: '9788545702870',
  status: 'FOUND',
  source: 'BRASIL_API',
  book: { title: 'Título do provedor', authors: ['Autora'], publisher: 'Editora', synopsis: null, year: 2025, pageCount: 240, subjects: ['Ficção'], coverUrl: null }
};

function message(id, localStatus = 'sending') {
  return { id, clientMessageId: id, conversationId: 'conversation', senderId: 'user', body: 'Olá', createdAt: '2026-08-31T12:00:00Z', updatedAt: '2026-08-31T12:00:00Z', localStatus };
}

describe('recursos puros do app mobile', () => {
  it('normaliza ISBN digitado ou colado', () => {
    expect(normalizeIsbnInput(' 978-85-457-0287-0 ')).toBe('9788545702870');
    expect(normalizeIsbnInput('0-306-40615-x')).toBe('030640615X');
  });

  it('preenche dados do ISBN sem sobrescrever campo já editado', () => {
    const current = { ...baseDraft, title: 'Meu título revisado' };
    const merged = mergeIsbnLookup(current, lookup, new Set(['title']));

    expect(merged.title).toBe('Meu título revisado');
    expect(merged.authors).toBe('Autora');
    expect(merged.pageCount).toBe('240');
    expect(merged.isbn).toBe(lookup.isbn);
  });

  it('substitui mensagem otimista pelo registro salvo sem duplicar', () => {
    const optimistic = message('client-id');
    const initial = upsertMessage(undefined, optimistic);
    const saved = { ...message('server-id', 'sent'), clientMessageId: 'client-id' };
    const updated = upsertMessage(initial, saved);

    expect(orderMessagePages(updated)).toHaveLength(1);
    expect(orderMessagePages(updated)[0]).toMatchObject({ id: 'server-id', clientMessageId: 'client-id', localStatus: 'sent' });
  });

  it('marca falha para permitir retry com o mesmo clientMessageId', () => {
    const initial = upsertMessage(undefined, message('client-id'));
    const failed = updateMessageStatus(initial, 'client-id', 'failed');

    expect(orderMessagePages(failed)[0].localStatus).toBe('failed');
    expect(orderMessagePages(failed)[0].clientMessageId).toBe('client-id');
  });
});
