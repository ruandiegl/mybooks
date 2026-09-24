import { prisma } from '../../shared/database/prisma.js';

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  emailVerifiedAt: true,
  firstName: true,
  lastName: true,
  phone: true,
  interests: true,
  isActive: true,
  avatarUrl: true,
  bio: true,
  city: true,
  profileCompletedAt: true,
  booksOnboardingCompletedAt: true,
  createdAt: true,
  updatedAt: true
};

export const authUserSelect = {
  ...publicUserSelect,
  passwordHash: true,
  legacyPassHash: true,
  cpfHash: true,
  cpfEncrypted: true,
  pendingRegistrationExpiresAt: true,
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

  findByEmail(email) {
    if (!email) return null;
    return prisma.user.findUnique({ where: { email }, select: publicUserSelect });
  },

  findAuthByEmail(email) {
    if (!email) return null;
    return prisma.user.findUnique({ where: { email }, select: authUserSelect });
  },

  updatePasswordHash(id, passwordHash) {
    return prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: authUserSelect
    });
  },

  create(data) {
    return prisma.user.create({ data, select: publicUserSelect });
  },

  update(id, data) {
    return prisma.user.update({ where: { id }, data, select: publicUserSelect });
  }
};
