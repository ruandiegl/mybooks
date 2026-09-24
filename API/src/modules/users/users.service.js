import { AppError } from '../../shared/errors/AppError.js';
import { usersRepository } from './users.repository.js';
import { updateProfileSchema } from './users.schemas.js';

function publicProfile(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    interests: user.interests,
    isActive: user.isActive,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    city: user.city,
    profileCompletedAt: user.profileCompletedAt,
    booksOnboardingCompletedAt: user.booksOnboardingCompletedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    ...(user.stats ? { stats: user.stats } : {})
  };
}

export const usersService = {
  async getMe(userId) {
    return publicProfile(await usersRepository.findByIdWithStats(userId));
  },

  async updateMe(userId, input) {
    const data = updateProfileSchema.parse(input);
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new AppError('Perfil não encontrado.', {
        statusCode: 404,
        code: 'USER_NOT_FOUND'
      });
    }
    const firstName = data.firstName ?? user.firstName;
    const lastName = data.lastName ?? user.lastName;
    const displayName = [firstName, lastName].filter(Boolean).join(' ');
    await usersRepository.update(userId, {
      ...data,
      ...(displayName ? { name: displayName } : {}),
      profileCompletedAt: new Date()
    });
    return publicProfile(await usersRepository.findByIdWithStats(userId));
  },

  async skipProfileOnboarding(userId) {
    await usersRepository.update(userId, { profileCompletedAt: new Date() });
    return publicProfile(await usersRepository.findByIdWithStats(userId));
  },

  async completeBooksOnboarding(userId) {
    await usersRepository.update(userId, { booksOnboardingCompletedAt: new Date() });
    return publicProfile(await usersRepository.findByIdWithStats(userId));
  }
};
