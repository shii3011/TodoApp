import type { Tag } from '@prisma/client';

export interface TagsRepository {
  listByUser(userId: string): Promise<Tag[]>;
  create(userId: string, data: { name: string; color: string }): Promise<Tag>;
  delete(id: string, userId: string): Promise<void>;
  countByIds(tagIds: string[], userId: string): Promise<number>;
}
