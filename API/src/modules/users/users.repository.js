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

  async findByIdWithStats(id) {
    const [user, bookCount, matchCount, conversationCount] = await prisma.$transaction([
      prisma.user.findUnique({ where: { id }, select: publicUserSelect }),
      prisma.book.count({ where: { ownerId: id } }),
      prisma.match.count({
        where: {
          status: 'ACTIVE',
          OR: [{ userAId: id }, { userBId: id }]
        }
      }),
      prisma.conversation.count({
        where: { members: { some: { userId: id } } }
      })
    ]);

    if (!user) return null;
    return {
      ...user,
      stats: { bookCount, matchCount, conversationCount }
    };
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
