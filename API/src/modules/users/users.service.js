import { clerkClient } from '@clerk/express';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { emailService } from '../email/email.service.js';
import { usersRepository } from './users.repository.js';
import { updateProfileSchema } from './users.schemas.js';

function clerkIdentity(user) {
  const primaryEmail = user.emailAddresses?.find((item) => item.id === user.primaryEmailAddressId)
    ?? user.emailAddresses?.[0];

  return {
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Leitor MyBooks',
    email: primaryEmail?.emailAddress ?? null,
    avatarUrl: user.imageUrl ?? null
  };
}

function developmentIdentity(clerkUserId) {
  const suffix = clerkUserId.replace(/[^a-zA-Z0-9]/g, '').slice(-16) || 'local';
  return {
    name: 'Leitor MyBooks',
    email: suffix + '@local.mybooks',
    avatarUrl: null
  };
}

function publicProfile(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    city: user.city,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    ...(user.stats ? { stats: user.stats } : {})
  };
}

function scheduleWelcomeEmail(user) {
  if (!user.email || env.NODE_ENV === 'test' || !env.RESEND_API_KEY) return;
  void emailService.sendWelcome({
    to: user.email,
    name: user.name,
    idempotencyKey: 'welcome-user-' + user.id
  }).catch((error) => {
    console.warn(JSON.stringify({
      level: 'warn',
      code: 'WELCOME_EMAIL_FAILED',
      userId: user.id,
      causeType: error?.name || 'Error'
    }));
  });
}

export const usersService = {
  async ensureCurrentUser(clerkUserId) {
    const existing = await usersRepository.findByClerkUserId(clerkUserId);
    if (existing) return existing;

    const identity = env.AUTH_MODE === 'clerk'
      ? clerkIdentity(await clerkClient.users.getUser(clerkUserId))
      : developmentIdentity(clerkUserId);

    const legacy = identity.email ? await usersRepository.findByEmail(identity.email) : null;
    if (legacy?.clerkUserId?.startsWith('legacy:')) {
      return usersRepository.update(legacy.id, {
        clerkUserId,
        name: identity.name,
        avatarUrl: identity.avatarUrl
      });
    }

    const created = await usersRepository.upsertByClerkUserId(clerkUserId, identity);
    scheduleWelcomeEmail(created);
    return created;
  },

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
    await usersRepository.update(userId, data);
    return publicProfile(await usersRepository.findByIdWithStats(userId));
  }
};
