import { beforeEach, describe, expect, it, vi } from 'vitest';

const profile = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'Leitora Teste',
  email: 'leitora@example.com',
  phone: null,
  interests: ['Fantasia'],
  isActive: true,
  avatarUrl: null,
  bio: null,
  city: null,
  createdAt: new Date('2026-09-11T10:00:00Z'),
  updatedAt: new Date('2026-09-11T10:00:00Z')
};

const mocks = vi.hoisted(() => ({
  usersRepository: { findByIdWithStats: vi.fn(), findById: vi.fn(), update: vi.fn() }
}));

vi.mock('../src/modules/users/users.repository.js', () => ({ usersRepository: mocks.usersRepository }));

const { usersService } = await import('../src/modules/users/users.service.js');

describe('usersService', () => {
  beforeEach(() => {
    mocks.usersRepository.findByIdWithStats.mockResolvedValue(profile);
  });

  it('serializa interests e isActive no perfil retornado por getMe', async () => {
    const result = await usersService.getMe(profile.id);

    expect(result).toMatchObject({
      interests: ['Fantasia'],
      isActive: true
    });
  });

  it('does not expose a legacy identity synchronization method', () => {
    expect(usersService.ensureCurrentUser).toBeUndefined();
  });
});
