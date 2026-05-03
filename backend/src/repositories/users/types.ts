import type { User } from '@prisma/client';

export interface UsersRepository {
  upsert(userId: string, email: string, name?: string): Promise<User>;
  findById(userId: string): Promise<User | null>;
}
