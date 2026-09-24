import { beforeEach, describe, expect, it, vi } from 'vitest';

const userRow = {
  id: '10000000-0000-4000-8000-000000000001',
  clerkUserId: 'clerk-user',
  name: 'Leitora Teste',
  email: 'leitora@example.com',
  emailVerifiedAt: new Date('2026-09-11T12:00:00Z'),
  firstName: 'Leitora',
  lastName: 'Teste',
  phone: null,
  interests: ['Fantasia'],
  profileCompletedAt: null,
  booksOnboardingCompletedAt: null,
  isActive: true,
  avatarUrl: null,
  bio: null,
  city: null,
  createdAt: new Date('2026-09-11T10:00:00Z'),
  updatedAt: new Date('2026-09-11T10:00:00Z')
};

const mocks = vi.hoisted(() => ({
  prisma: { user: { findUnique: vi.fn() } }
}));

vi.mock('../src/shared/database/prisma.js', () => ({ prisma: mocks.prisma }));

const { usersRepository } = await import('../src/modules/users/users.repository.js');

function selectedUser(select) {
  return Object.fromEntries(
    Object.entries(select)
      .filter(([, selected]) => selected)
      .map(([field]) => [field, userRow[field]])
  );
}

describe('usersRepository', () => {
  beforeEach(() => {
    mocks.prisma.user.findUnique.mockImplementation(({ select }) => selectedUser(select));
  });

  it('retorna interests e isActive no perfil público selecionado', async () => {
    const user = await usersRepository.findById(userRow.id);

    expect(user).toMatchObject({
      interests: ['Fantasia'],
      isActive: true
    });
  });
});
