import { prisma } from '../../shared/database/prisma.js';

const publicUserSelect = {
  id: true,
  clerkUserId: true,
  name: true,
  email: true,
  phone: true,
  avatarUrl: true,
  bio: true,
  city: true,
  createdAt: true,
  updatedAt: true
};

export const usersRepository = {
  findById(id) {
    return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
  },

  findByClerkUserId(clerkUserId) {
    return prisma.user.findUnique({ where: { clerkUserId }, select: publicUserSelect });
  },

  findByEmail(email) {
    if (!email) return null;
    return prisma.user.findUnique({ where: { email }, select: publicUserSelect });
  },

  create(data) {
    return prisma.user.create({ data, select: publicUserSelect });
  },

  update(id, data) {
    return prisma.user.update({ where: { id }, data, select: publicUserSelect });
  },

  upsertByClerkUserId(clerkUserId, data) {
    return prisma.user.upsert({
      where: { clerkUserId },
      create: { clerkUserId, ...data },
      update: data,
      select: publicUserSelect
    });
  }
};
