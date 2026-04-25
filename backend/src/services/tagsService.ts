import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

export async function listTags(userId: string) {
  return prisma.tag.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createTag(userId: string, data: { name: string; color: string }) {
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
}

export async function deleteTag(id: string, userId: string) {
  const tag = await prisma.tag.findFirst({ where: { id, userId } });
  if (!tag) throw new AppError(404, 'Tag not found');
  await prisma.tag.delete({ where: { id } });
}
