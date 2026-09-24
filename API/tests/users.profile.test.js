import { beforeEach, describe, expect, it, vi } from 'vitest';

const baseUser = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'Leitor TrocaLivros',
  email: 'reader@example.com',
  emailVerifiedAt: new Date('2026-09-11T12:00:00Z'),
  firstName: null,
  lastName: null,
  phone: '+5511999999999',
  interests: [],
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
  repository: { findById: vi.fn(), update: vi.fn(), findByIdWithStats: vi.fn() }
}));

vi.mock('../src/modules/users/users.repository.js', () => ({ usersRepository: mocks.repository }));
const { usersService } = await import('../src/modules/users/users.service.js');

describe('native profile onboarding', () => {
  beforeEach(() => {
    mocks.repository.findById.mockResolvedValue(baseUser);
    mocks.repository.update.mockResolvedValue(baseUser);
    mocks.repository.findByIdWithStats.mockResolvedValue(baseUser);
  });

  it('persists profile fields, derives display name, and marks the optional step complete', async () => {
    await usersService.updateMe(baseUser.id, {
      firstName: '  Ana ',
      lastName: 'Silva',
      bio: 'Gosto de fantasia.',
      interests: ['Fantasia', 'Clássicos']
    });

    expect(mocks.repository.update).toHaveBeenCalledWith(baseUser.id, expect.objectContaining({
      firstName: 'Ana',
      lastName: 'Silva',
      name: 'Ana Silva',
      interests: ['Fantasia', 'Clássicos'],
      profileCompletedAt: expect.any(Date)
    }));
  });

  it('marks a skipped profile step without inventing profile data', async () => {
    await usersService.skipProfileOnboarding(baseUser.id);
    expect(mocks.repository.update).toHaveBeenCalledWith(baseUser.id, {
      profileCompletedAt: expect.any(Date)
    });
  });

  it('rejects arbitrary avatar URLs in the profile payload', async () => {
    await expect(usersService.updateMe(baseUser.id, { avatarUrl: 'https://attacker.example/avatar.jpg' }))
      .rejects.toMatchObject({ name: 'ZodError' });
    expect(mocks.repository.update).not.toHaveBeenCalled();
  });
});
