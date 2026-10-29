import { randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { disposableDatabaseUrl } from '../vitest.integration.config.js';
import { applyMigration } from './helpers/applyMigration.js';

const state = vi.hoisted(() => ({ db: null }));
vi.mock('../src/shared/database/prisma.js', () => ({ get prisma() { return state.db; } }));
const { moderationService } = await import('../src/modules/moderation/moderation.service.js');
const { matchesRepository } = await import('../src/modules/matches/matches.repository.js');
const { chatService } = await import('../src/modules/chat/chat.service.js');
const { booksService } = await import('../src/modules/books/books.service.js');
const { likesRepository } = await import('../src/modules/likes/likes.repository.js');
const databaseUrl = disposableDatabaseUrl();
const migrationsRoot = new URL('../prisma/migrations/', import.meta.url);
let admin;
let schema;
let users;
let books;
let conversationId;

beforeEach(async () => {
  schema = `moderation_test_${randomUUID().replaceAll('-', '')}`;
  admin = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const url = new URL(databaseUrl); url.searchParams.set('schema', schema);
  state.db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const names = (await readdir(migrationsRoot, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  for (const name of names) await applyMigration(state.db, migrationsRoot, name, schema);
  users = [randomUUID(), randomUUID(), randomUUID()].sort();
  books = [randomUUID(), randomUUID()];
  await state.db.user.createMany({ data: users.map(id => ({ id, name: 'Pessoa', email: `${id}@example.test`, passwordHash: 'test-hash', emailVerifiedAt: new Date(), isActive: true })) });
  await state.db.book.createMany({ data: books.map((id, index) => ({ id, title: `Livro ${index}`, ownerId: users[index] })) });
  await matchesRepository.applyInteraction({ actorId: users[0], targetBookId: books[1], action: 'LIKE', clientActionId: randomUUID() });
  const { match } = await matchesRepository.applyInteraction({ actorId: users[1], targetBookId: books[0], action: 'LIKE', clientActionId: randomUUID() });
  conversationId = match.conversation.id;
  await chatService.sendMessage(users[0], conversationId, { clientMessageId: randomUUID(), body: 'Mensagem preservada' });
});

afterEach(async () => {
  try {
    await state.db?.$disconnect();
    if (admin && schema) await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  } finally { state.db = null; await admin?.$disconnect(); admin = null; schema = null; }
});

describe('denúncias e bloqueios em PostgreSQL descartável', () => {
  it('começa em cinco estrelas, registra uma denúncia por pessoa e não expõe campos privados', async () => {
    const initial = await moderationService.publicProfile(users[0], users[1]);
    expect(initial.reputation.stars).toBe(5);
    expect(JSON.stringify(initial)).not.toMatch(/email|phone|cpf|reason|reporterId/i);
    await expect(moderationService.report(users[0], users[0], { reason: 'SPAM' })).rejects.toMatchObject({ code: 'SELF_MODERATION' });
    await expect(moderationService.block(users[0], users[0])).rejects.toMatchObject({ code: 'SELF_MODERATION' });
    await moderationService.report(users[0], users[1], { reason: 'FRAUD' });
    await expect(moderationService.report(users[0], users[1], { reason: 'SPAM' })).rejects.toMatchObject({ code: 'ALREADY_REPORTED' });
    expect((await moderationService.publicProfile(users[0], users[1])).reputation.stars).toBe(4.5);
    expect(await state.db.userReport.count()).toBe(1);
  });

  it('oculta a relação dos dois lados, nega ações antigas e restaura o histórico após desbloqueio', async () => {
    await Promise.all([
      moderationService.block(users[0], users[1]),
      moderationService.block(users[0], users[1])
    ]);
    expect(await state.db.userBlock.count()).toBe(1);
    expect((await moderationService.publicProfile(users[0], users[1])).reputation.stars).toBe(4.8);
    await expect(moderationService.publicProfile(users[1], users[0])).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
    expect(await matchesRepository.listForUser(users[0])).toEqual([]);
    expect(await matchesRepository.listForUser(users[1])).toEqual([]);
    expect(await chatService.listConversations(users[0])).toEqual([]);
    expect(await chatService.listConversations(users[1])).toEqual([]);
    expect(await booksService.discover(users[0], {})).toMatchObject({ items: [] });
    await expect(booksService.getById(books[1], users[0])).rejects.toMatchObject({ code: 'BOOK_NOT_FOUND' });
    await expect(chatService.sendMessage(users[1], conversationId, { clientMessageId: randomUUID(), body: 'Não pode' })).rejects.toMatchObject({ code: 'CONVERSATION_NOT_FOUND' });
    await expect(matchesRepository.applyInteraction({ actorId: users[1], targetBookId: books[0], action: 'LIKE', clientActionId: randomUUID() })).rejects.toMatchObject({ code: 'DISCOVERY_BOOK_NOT_FOUND' });
    expect(await state.db.message.count()).toBe(1);
    expect(await state.db.match.count()).toBe(1);
    await moderationService.unblock(users[0], users[1]);
    expect((await moderationService.publicProfile(users[0], users[1])).reputation.stars).toBe(5);
    expect(await matchesRepository.listForUser(users[0])).toHaveLength(1);
    expect((await chatService.listMessages(users[1], conversationId, {})).items[0].body).toBe('Mensagem preservada');
  });

  it('oculta curtidas recebidas, enviadas e contagens enquanto o par está bloqueado', async () => {
    const interaction = await state.db.interaction.create({ data: {
      actorId: users[2], targetBookId: books[0], action: 'LIKE', clientActionId: randomUUID()
    } });
    expect((await likesRepository.findReceivedLikes(users[0], { limit: 10, sort: 'desc' })).map(row => row.id)).toContain(interaction.id);
    expect((await likesRepository.findSentLikes(users[2], { limit: 10, sort: 'desc' })).map(row => row.id)).toContain(interaction.id);
    await moderationService.block(users[0], users[2]);
    expect(await likesRepository.findReceivedLikes(users[0], { limit: 10, sort: 'desc' })).toEqual([]);
    expect(await likesRepository.findSentLikes(users[2], { limit: 10, sort: 'desc' })).toEqual([]);
    expect(await likesRepository.countPendingReceivedLikes(users[0])).toBe(0);
    await moderationService.unblock(users[0], users[2]);
    expect((await likesRepository.findReceivedLikes(users[0], { limit: 10, sort: 'desc' })).map(row => row.id)).toContain(interaction.id);
  });

  it('resolve a corrida entre bloqueio e mensagem sem aceitar novas mensagens após o bloqueio', async () => {
    const [block, send] = await Promise.allSettled([
      moderationService.block(users[0], users[1]),
      chatService.sendMessage(users[1], conversationId, { clientMessageId: randomUUID(), body: 'Mensagem na corrida' })
    ]);
    expect(block.status).toBe('fulfilled');
    if (send.status === 'rejected') expect(['CONVERSATION_NOT_FOUND', 'MESSAGE_RETRY_REQUIRED']).toContain(send.reason.code);
    const committedCount = await state.db.message.count();
    expect([1, 2]).toContain(committedCount);
    await expect(chatService.sendMessage(users[1], conversationId, { clientMessageId: randomUUID(), body: 'Depois do bloqueio' })).rejects.toMatchObject({ code: 'CONVERSATION_NOT_FOUND' });
    await moderationService.unblock(users[0], users[1]);
    expect((await chatService.listMessages(users[1], conversationId, {})).items).toHaveLength(committedCount);
  });

  it('resolve a corrida entre bloqueio e curtida sem aceitar interações posteriores', async () => {
    const extra = await state.db.book.create({ data: { title: 'Livro extra', ownerId: users[1] } });
    const [block, interaction] = await Promise.allSettled([
      moderationService.block(users[0], users[1]),
      matchesRepository.applyInteraction({ actorId: users[0], targetBookId: extra.id, action: 'LIKE', clientActionId: randomUUID() })
    ]);
    expect(block.status).toBe('fulfilled');
    if (interaction.status === 'rejected') expect(['DISCOVERY_BOOK_NOT_FOUND', 'INTERACTION_RETRY_REQUIRED']).toContain(interaction.reason.code);
    await expect(matchesRepository.applyInteraction({ actorId: users[0], targetBookId: extra.id, action: 'LIKE', clientActionId: randomUUID() })).rejects.toMatchObject({ code: 'DISCOVERY_BOOK_NOT_FOUND' });
  });
});
