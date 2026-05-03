import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import type { TagsRepository } from './types.js';

export const tagsPrismaRepository: TagsRepository = {
  async listByUser(userId) {
    return prisma.tag.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  },

  async create(userId, data) {
    try {
      return await prisma.tag.create({
        data: { userId, name: data.name, color: data.color },
      });
    } catch (e: unknown) {
      if (typeof e === 'object' && e !== null && 'code' in e && e.code === 'P2002') {
        throw new AppError(409, 'Tag name already exists');
      }
      throw e;
    }
  },

  async delete(id, userId) {
    const tag = await prisma.tag.findFirst({ where: { id, userId } });
    if (!tag) throw new AppError(404, 'Tag not found');
    await prisma.tag.delete({ where: { id } });
  },

  async countByIds(tagIds, userId) {
    return prisma.tag.count({ where: { id: { in: tagIds }, userId } });
  },
};
