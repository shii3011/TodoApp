import { AppError } from '../../lib/errors.js';
import type { UsersRepository } from '../../repositories/users/types.js';
import { usersPrismaRepository } from '../../repositories/users/usersPrismaRepository.js';

export function createUsersService(repo: UsersRepository) {
  return {
    async upsertUser(userId: string, email: string, name?: string) {
      return repo.upsert(userId, email, name);
    },

    async getUser(userId: string) {
      const user = await repo.findById(userId);
      if (!user) throw new AppError(404, 'User not found');
      return user;
    },
  };
}

const service = createUsersService(usersPrismaRepository);
export const { upsertUser, getUser } = service;
