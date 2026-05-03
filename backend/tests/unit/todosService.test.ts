import { describe, test, expect, vi } from 'vitest'
import { createTodosService } from '../../src/services/todos/todosService'
import type { TodosRepository } from '../../src/repositories/todos/types'
import type { TagsRepository } from '../../src/repositories/tags/types'
import type { FormattedTodo } from '../../src/lib/todoFormat'

// ─────────────────────────────────────────────
// テスト用ヘルパー
// ─────────────────────────────────────────────

function makeTodo(overrides: Partial<FormattedTodo> = {}): FormattedTodo {
  return {
    id: 'todo-1',
    userId: 'user-1',
    title: 'test',
    description: '',
    priority: 'medium',
    completed: false,
    dueDate: null,
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [],
    subtasks: [],
    ...overrides,
  }
}

function makeTodosRepo(overrides: Partial<TodosRepository> = {}): TodosRepository {
  return {
    listByUser: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    replace: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  }
}

function makeTagsRepo(overrides: Partial<TagsRepository> = {}): TagsRepository {
  return {
    listByUser: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    countByIds: vi.fn(),
    ...overrides,
  }
}

// ─────────────────────────────────────────────
// getTodo
// ─────────────────────────────────────────────
describe('getTodo', () => {
  test('正常系: Todo が見つかれば返す', async () => {
    const todo = makeTodo()
    const todosRepo = makeTodosRepo({ findById: vi.fn().mockResolvedValue(todo) })
    const service = createTodosService(todosRepo, makeTagsRepo())

    await expect(service.getTodo('todo-1', 'user-1')).resolves.toEqual(todo)
  })

  test('異常系: Todo が見つからなければ 404', async () => {
    const todosRepo = makeTodosRepo({ findById: vi.fn().mockResolvedValue(null) })
    const service = createTodosService(todosRepo, makeTagsRepo())

    await expect(service.getTodo('missing', 'user-1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Todo not found',
    })
  })
})

// ─────────────────────────────────────────────
// createTodo
// ─────────────────────────────────────────────
describe('createTodo', () => {
  test('正常系: tagIds なしで作成できる', async () => {
    const todo = makeTodo()
    const todosRepo = makeTodosRepo({ create: vi.fn().mockResolvedValue(todo) })
    const service = createTodosService(todosRepo, makeTagsRepo())

    await expect(
      service.createTodo('user-1', { title: 'test', description: '', priority: 'medium' }),
    ).resolves.toEqual(todo)
  })

  test('異常系: tagIds が存在しないユーザーのタグを含む場合 400', async () => {
    const tagsRepo = makeTagsRepo({ countByIds: vi.fn().mockResolvedValue(1) }) // 2件渡したのに1件しか一致しない
    const service = createTodosService(makeTodosRepo(), tagsRepo)

    await expect(
      service.createTodo('user-1', {
        title: 'test',
        description: '',
        priority: 'medium',
        tagIds: ['tag-1', 'tag-2'],
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid tag IDs' })
  })

  test('異常系: parentId が存在しない場合 400', async () => {
    const todosRepo = makeTodosRepo({ findById: vi.fn().mockResolvedValue(null) })
    const service = createTodosService(todosRepo, makeTagsRepo())

    await expect(
      service.createTodo('user-1', {
        title: 'test',
        description: '',
        priority: 'medium',
        parentId: 'missing-parent',
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid parent todo' })
  })

  test('異常系: parentId がサブタスク（parentId !== null）の場合 400', async () => {
    const parent = makeTodo({ id: 'parent-1', parentId: 'grandparent-1' }) // 孫になる
    const todosRepo = makeTodosRepo({ findById: vi.fn().mockResolvedValue(parent) })
    const service = createTodosService(todosRepo, makeTagsRepo())

    await expect(
      service.createTodo('user-1', {
        title: 'test',
        description: '',
        priority: 'medium',
        parentId: 'parent-1',
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid parent todo' })
  })
})

// ─────────────────────────────────────────────
// replaceTodo / patchTodo（タグ検証のみ）
// ─────────────────────────────────────────────
describe('replaceTodo', () => {
  test('異常系: 不正な tagIds は 400', async () => {
    const tagsRepo = makeTagsRepo({ countByIds: vi.fn().mockResolvedValue(0) })
    const service = createTodosService(makeTodosRepo(), tagsRepo)

    await expect(
      service.replaceTodo('todo-1', 'user-1', {
        title: 'test',
        description: '',
        priority: 'medium',
        completed: false,
        tagIds: ['invalid-tag'],
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid tag IDs' })
  })
})

describe('patchTodo', () => {
  test('異常系: 不正な tagIds は 400', async () => {
    const tagsRepo = makeTagsRepo({ countByIds: vi.fn().mockResolvedValue(0) })
    const service = createTodosService(makeTodosRepo(), tagsRepo)

    await expect(
      service.patchTodo('todo-1', 'user-1', { tagIds: ['invalid-tag'] }),
    ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid tag IDs' })
  })
})
