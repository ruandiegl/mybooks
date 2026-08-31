import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env.js';

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.__mybooksPrisma ?? new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

if (env.NODE_ENV !== 'production') {
  globalForPrisma.__mybooksPrisma = prisma;
}
