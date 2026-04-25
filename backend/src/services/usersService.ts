import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';


export async function upsertUser(userId: string, email: string, name?: string) {
  return prisma.user.upsert({
    where: { id: userId },
    update: { email, ...(name !== undefined && { name }) },
    create: { id: userId, email, name: name ?? null },
  });
}

export async function getUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');
  return user;
}
