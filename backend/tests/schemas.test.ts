import { describe, test, expect } from 'vitest'
import { createTodoSchema, updateTodoSchema, patchTodoSchema } from '../src/schemas/todoSchemas.js'
import { createTagSchema } from '../src/schemas/tagSchemas.js'

// ─────────────────────────────────────────────
// createTodoSchema
// ─────────────────────────────────────────────
describe('createTodoSchema', () => {
  const valid = { title: 'test', description: '', priority: 'medium' as const }

  test('正常系: 必須フィールドのみ', () => {
    expect(createTodoSchema.safeParse(valid).success).toBe(true)
  })

  test('正常系: 全フィールドあり', () => {
    const result = createTodoSchema.safeParse({
      ...valid,
      dueDate: '2025-12-31T00:00:00.000+09:00',
      tagIds: ['00000000-0000-4000-8000-000000000001'],
      parentId: '00000000-0000-4000-8000-000000000002',
    })
    expect(result.success).toBe(true)
  })

  test('異常系: title が空文字', () => {
    expect(createTodoSchema.safeParse({ ...valid, title: '' }).success).toBe(false)
  })

  test('異常系: description が 1001 文字', () => {
    expect(createTodoSchema.safeParse({ ...valid, description: 'a'.repeat(1001) }).success).toBe(false)
  })

  test('境界値: description が 1000 文字はOK', () => {
    expect(createTodoSchema.safeParse({ ...valid, description: 'a'.repeat(1000) }).success).toBe(true)
  })

  test('異常系: priority が不正な値', () => {
    expect(createTodoSchema.safeParse({ ...valid, priority: 'urgent' }).success).toBe(false)
  })

  test('正常系: priority の全列挙値', () => {
    for (const p of ['low', 'medium', 'high'] as const) {
      expect(createTodoSchema.safeParse({ ...valid, priority: p }).success).toBe(true)
    }
  })

  test('異常系: dueDate が ISO 8601 形式でない', () => {
    expect(createTodoSchema.safeParse({ ...valid, dueDate: '2025-12-31' }).success).toBe(false)
  })

  test('異常系: tagIds に UUID でない値が含まれる', () => {
    expect(createTodoSchema.safeParse({ ...valid, tagIds: ['not-a-uuid'] }).success).toBe(false)
  })

  test('異常系: parentId が UUID でない', () => {
    expect(createTodoSchema.safeParse({ ...valid, parentId: 'invalid' }).success).toBe(false)
  })

  test('デフォルト値: priority 未指定は medium', () => {
    const result = createTodoSchema.safeParse({ title: 'test' })
    expect(result.success && result.data.priority).toBe('medium')
  })

  test('デフォルト値: description 未指定は空文字', () => {
    const result = createTodoSchema.safeParse({ title: 'test' })
    expect(result.success && result.data.description).toBe('')
  })
})

// ─────────────────────────────────────────────
// updateTodoSchema
// ─────────────────────────────────────────────
describe('updateTodoSchema', () => {
  const valid = {
    title: 'test',
    description: '',
    priority: 'medium' as const,
    completed: false,
  }

  test('正常系: 全フィールドあり', () => {
    expect(updateTodoSchema.safeParse(valid).success).toBe(true)
  })

  test('異常系: title が空文字', () => {
    expect(updateTodoSchema.safeParse({ ...valid, title: '' }).success).toBe(false)
  })

  test('異常系: completed が boolean でない', () => {
    expect(updateTodoSchema.safeParse({ ...valid, completed: 'true' }).success).toBe(false)
  })

  test('正常系: dueDate を null でクリアできる', () => {
    expect(updateTodoSchema.safeParse({ ...valid, dueDate: null }).success).toBe(true)
  })
})

// ─────────────────────────────────────────────
// patchTodoSchema
// ─────────────────────────────────────────────
describe('patchTodoSchema', () => {
  test('正常系: 空オブジェクト（全フィールド省略可）', () => {
    expect(patchTodoSchema.safeParse({}).success).toBe(true)
  })

  test('正常系: completed のみ更新', () => {
    expect(patchTodoSchema.safeParse({ completed: true }).success).toBe(true)
  })

  test('異常系: title を空文字に上書きはエラー', () => {
    expect(patchTodoSchema.safeParse({ title: '' }).success).toBe(false)
  })

  test('異常系: priority に不正な値', () => {
    expect(patchTodoSchema.safeParse({ priority: 'critical' }).success).toBe(false)
  })
})

// ─────────────────────────────────────────────
// createTagSchema
// ─────────────────────────────────────────────
describe('createTagSchema', () => {
  const valid = { name: 'work', color: '#38a8f5' }

  test('正常系', () => {
    expect(createTagSchema.safeParse(valid).success).toBe(true)
  })

  test('異常系: name が空文字', () => {
    expect(createTagSchema.safeParse({ ...valid, name: '' }).success).toBe(false)
  })

  test('異常系: name が 51 文字', () => {
    expect(createTagSchema.safeParse({ ...valid, name: 'a'.repeat(51) }).success).toBe(false)
  })

  test('境界値: name が 50 文字はOK', () => {
    expect(createTagSchema.safeParse({ ...valid, name: 'a'.repeat(50) }).success).toBe(true)
  })

  test('異常系: color が # なしの hex', () => {
    expect(createTagSchema.safeParse({ ...valid, color: '38a8f5' }).success).toBe(false)
  })

  test('異常系: color が 3 桁の hex', () => {
    expect(createTagSchema.safeParse({ ...valid, color: '#fff' }).success).toBe(false)
  })

  test('異常系: color が hex 以外の文字', () => {
    expect(createTagSchema.safeParse({ ...valid, color: '#zzzzzz' }).success).toBe(false)
  })

  test('正常系: color が大文字 hex', () => {
    expect(createTagSchema.safeParse({ ...valid, color: '#FF5733' }).success).toBe(true)
  })

  test('デフォルト値: color 未指定は #38a8f5', () => {
    const result = createTagSchema.safeParse({ name: 'work' })
    expect(result.success && result.data.color).toBe('#38a8f5')
  })
})
