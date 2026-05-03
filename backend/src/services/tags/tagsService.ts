import type { TagsRepository } from '../../repositories/tags/types.js';
import { tagsPrismaRepository } from '../../repositories/tags/tagsPrismaRepository.js';

export function createTagsService(repo: TagsRepository) {
  return {
    async listTags(userId: string) {
      return repo.listByUser(userId);
    },

    async createTag(userId: string, data: { name: string; color: string }) {
      return repo.create(userId, data);
    },

    async deleteTag(id: string, userId: string) {
      return repo.delete(id, userId);
    },
  };
}

const service = createTagsService(tagsPrismaRepository);
export const { listTags, createTag, deleteTag } = service;
