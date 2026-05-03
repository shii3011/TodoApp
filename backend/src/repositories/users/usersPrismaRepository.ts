import { prisma } from '../../lib/prisma.js';
import type { UsersRepository } from './types.js';

export const usersPrismaRepository: UsersRepository = {
  async upsert(userId, email, name) {
    return prisma.user.upsert({
      where: { id: userId },
      update: { email, ...(name !== undefined && { name }) },
      create: { id: userId, email, name: name ?? null },
    });
  },

  async findById(userId) {
    return prisma.user.findUnique({ where: { id: userId } });
  },
};
