import { serializeAvatar } from '../media/avatar.serializer.js';
export async function serializeOwnUser(user) {
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
    ...await serializeAvatar(user),
    bio: user.bio,
    city: user.city,
    profileCompletedAt: user.profileCompletedAt,
    booksOnboardingCompletedAt: user.booksOnboardingCompletedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    ...(user.stats ? { stats: user.stats } : {})
  };
}
