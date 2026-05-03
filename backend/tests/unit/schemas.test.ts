import { describe, test, expect } from 'vitest'
import { createTodoSchema, updateTodoSchema, patchTodoSchema } from '../../src/schemas/todoSchemas'
import { createTagSchema } from '../../src/schemas/tagSchemas'
import { upsertUserSchema } from '../../src/schemas/userSchemas'

// ─────────────────────────────────────────────
// createTodoSchema
// ─────────────────────────────────────────────
describe('createTodoSchema', () => {
  const valid = { title: 'test', description: '', priority: 'medium' as const }

  test('正常系: 必須フィールドのみ', () => {
    expect(createTodoSchema.safeParse(valid).success).toBe(true)
  })

  test('正常系: 全フィールドあり', () => {
    expect(createTodoSchema.safeParse({
      ...valid,
      dueDate: '2025-12-31T00:00:00.000+09:00',
      tagIds: ['00000000-0000-4000-8000-000000000001'],
      parentId: '00000000-0000-4000-8000-000000000002',
    }).success).toBe(true)
  })

  describe('title', () => {
    test('異常系: 空文字', () => {
      expect(createTodoSchema.safeParse({ ...valid, title: '' }).success).toBe(false)
    })

    test('仕様確認: 空白のみは通る（min(1)は空白をカウントする）', () => {
      // 空白titleを弾きたい場合は .trim().min(1) への変更が必要
      expect(createTodoSchema.safeParse({ ...valid, title: '   ' }).success).toBe(true)
    })

    test('仕様確認: 上限なし（1001文字でも通る）', () => {
      // title に max() 制限がないため通る。意図的な仕様
      expect(createTodoSchema.safeParse({ ...valid, title: 'a'.repeat(1001) }).success).toBe(true)
    })
  })

  describe('description', () => {
    test('境界値: 1000文字はOK', () => {
      expect(createTodoSchema.safeParse({ ...valid, description: 'a'.repeat(1000) }).success).toBe(true)
    })

    test('異常系: 1001文字はNG', () => {
      expect(createTodoSchema.safeParse({ ...valid, description: 'a'.repeat(1001) }).success).toBe(false)
    })

    test('デフォルト値: 未指定は空文字', () => {
      const result = createTodoSchema.safeParse({ title: 'test' })
      expect(result.success && result.data.description).toBe('')
    })
  })

  describe('priority', () => {
    test('正常系: 全列挙値（low / medium / high）', () => {
      for (const p of ['low', 'medium', 'high'] as const) {
        expect(createTodoSchema.safeParse({ ...valid, priority: p }).success).toBe(true)
      }
    })

    test('異常系: 不正な値', () => {
      expect(createTodoSchema.safeParse({ ...valid, priority: 'urgent' }).success).toBe(false)
    })

    test('デフォルト値: 未指定は medium', () => {
      const result = createTodoSchema.safeParse({ title: 'test' })
      expect(result.success && result.data.priority).toBe('medium')
    })
  })

  describe('dueDate', () => {
    test('正常系: タイムゾーンオフセットあり', () => {
      expect(createTodoSchema.safeParse({ ...valid, dueDate: '2025-12-31T00:00:00.000+09:00' }).success).toBe(true)
    })

    test('正常系: UTC（Z）', () => {
      expect(createTodoSchema.safeParse({ ...valid, dueDate: '2025-12-31T00:00:00.000Z' }).success).toBe(true)
    })

    test('正常系: 過去の日付も通る（スキーマでは制限しない）', () => {
      expect(createTodoSchema.safeParse({ ...valid, dueDate: '2000-01-01T00:00:00.000Z' }).success).toBe(true)
    })

    test('異常系: 日付のみ（時刻なし）', () => {
      expect(createTodoSchema.safeParse({ ...valid, dueDate: '2025-12-31' }).success).toBe(false)
    })

    test('異常系: タイムゾーンオフセットなし', () => {
      // offset: true のため必須
      expect(createTodoSchema.safeParse({ ...valid, dueDate: '2025-12-31T00:00:00.000' }).success).toBe(false)
    })
  })

  describe('tagIds', () => {
    test('正常系: 空配列', () => {
      expect(createTodoSchema.safeParse({ ...valid, tagIds: [] }).success).toBe(true)
    })

    test('正常系: 重複UUIDも通る（スキーマでは制限しない）', () => {
      const uuid = '00000000-0000-4000-8000-000000000001'
      expect(createTodoSchema.safeParse({ ...valid, tagIds: [uuid, uuid] }).success).toBe(true)
    })

    test('異常系: UUID でない値', () => {
      expect(createTodoSchema.safeParse({ ...valid, tagIds: ['not-a-uuid'] }).success).toBe(false)
    })
  })

  describe('parentId', () => {
    test('異常系: UUID でない値', () => {
      expect(createTodoSchema.safeParse({ ...valid, parentId: 'invalid' }).success).toBe(false)
    })
  })
})

// ─────────────────────────────────────────────
// updateTodoSchema
// ─────────────────────────────────────────────
describe('updateTodoSchema', () => {
  const valid = { title: 'test', description: '', priority: 'medium' as const, completed: false }

  test('正常系: 全フィールドあり', () => {
    expect(updateTodoSchema.safeParse(valid).success).toBe(true)
  })

  describe('title', () => {
    test('異常系: 空文字', () => {
      expect(updateTodoSchema.safeParse({ ...valid, title: '' }).success).toBe(false)
    })

    test('仕様確認: 空白のみは通る（min(1)は空白をカウントする）', () => {
      expect(updateTodoSchema.safeParse({ ...valid, title: '   ' }).success).toBe(true)
    })
  })

  describe('description', () => {
    test('境界値: 1000文字はOK', () => {
      expect(updateTodoSchema.safeParse({ ...valid, description: 'a'.repeat(1000) }).success).toBe(true)
    })

    test('異常系: 1001文字はNG', () => {
      expect(updateTodoSchema.safeParse({ ...valid, description: 'a'.repeat(1001) }).success).toBe(false)
    })

    test('デフォルト値: 未指定は空文字', () => {
      const result = updateTodoSchema.safeParse({ title: 'test', completed: false })
      expect(result.success && result.data.description).toBe('')
    })
  })

  describe('priority', () => {
    test('正常系: 全列挙値（low / medium / high）', () => {
      for (const p of ['low', 'medium', 'high'] as const) {
        expect(updateTodoSchema.safeParse({ ...valid, priority: p }).success).toBe(true)
      }
    })

    test('異常系: 不正な値', () => {
      expect(updateTodoSchema.safeParse({ ...valid, priority: 'urgent' }).success).toBe(false)
    })

    test('デフォルト値: 未指定は medium', () => {
      const result = updateTodoSchema.safeParse({ title: 'test', completed: false })
      expect(result.success && result.data.priority).toBe('medium')
    })
  })

  describe('completed', () => {
    test('正常系: true', () => {
      expect(updateTodoSchema.safeParse({ ...valid, completed: true }).success).toBe(true)
    })

    test('異常系: boolean でない値', () => {
      expect(updateTodoSchema.safeParse({ ...valid, completed: 'true' }).success).toBe(false)
    })

    test('デフォルト値: 未指定は false', () => {
      const result = updateTodoSchema.safeParse({ title: 'test' })
      expect(result.success && result.data.completed).toBe(false)
    })
  })

  describe('dueDate', () => {
    test('正常系: 有効な ISO 形式', () => {
      expect(updateTodoSchema.safeParse({ ...valid, dueDate: '2025-12-31T00:00:00.000+09:00' }).success).toBe(true)
    })

    test('正常系: null でクリアできる', () => {
      expect(updateTodoSchema.safeParse({ ...valid, dueDate: null }).success).toBe(true)
    })

    test('異常系: 日付のみ（時刻なし）', () => {
      expect(updateTodoSchema.safeParse({ ...valid, dueDate: '2025-12-31' }).success).toBe(false)
    })
  })

  describe('tagIds', () => {
    test('正常系: 空配列', () => {
      expect(updateTodoSchema.safeParse({ ...valid, tagIds: [] }).success).toBe(true)
    })

    test('異常系: UUID でない値', () => {
      expect(updateTodoSchema.safeParse({ ...valid, tagIds: ['not-a-uuid'] }).success).toBe(false)
    })
  })
})

// ─────────────────────────────────────────────
// patchTodoSchema
// ─────────────────────────────────────────────
describe('patchTodoSchema', () => {
  test('正常系: 空オブジェクト（全フィールド省略可）', () => {
    expect(patchTodoSchema.safeParse({}).success).toBe(true)
  })

  describe('title', () => {
    test('異常系: 空文字', () => {
      expect(patchTodoSchema.safeParse({ title: '' }).success).toBe(false)
    })

    test('仕様確認: 空白のみは通る（min(1)は空白をカウントする）', () => {
      expect(patchTodoSchema.safeParse({ title: '   ' }).success).toBe(true)
    })
  })

  describe('description', () => {
    test('境界値: 1000文字はOK', () => {
      expect(patchTodoSchema.safeParse({ description: 'a'.repeat(1000) }).success).toBe(true)
    })

    test('異常系: 1001文字はNG', () => {
      expect(patchTodoSchema.safeParse({ description: 'a'.repeat(1001) }).success).toBe(false)
    })
  })

  describe('priority', () => {
    test('正常系: 全列挙値（low / medium / high）', () => {
      for (const p of ['low', 'medium', 'high'] as const) {
        expect(patchTodoSchema.safeParse({ priority: p }).success).toBe(true)
      }
    })

    test('異常系: 不正な値', () => {
      expect(patchTodoSchema.safeParse({ priority: 'critical' }).success).toBe(false)
    })
  })

  describe('completed', () => {
    test('正常系: true', () => {
      expect(patchTodoSchema.safeParse({ completed: true }).success).toBe(true)
    })

    test('正常系: false', () => {
      expect(patchTodoSchema.safeParse({ completed: false }).success).toBe(true)
    })
  })

  describe('dueDate', () => {
    test('正常系: null でクリアできる', () => {
      expect(patchTodoSchema.safeParse({ dueDate: null }).success).toBe(true)
    })

    test('異常系: 日付のみ（時刻なし）', () => {
      expect(patchTodoSchema.safeParse({ dueDate: '2025-12-31' }).success).toBe(false)
    })
  })

  describe('tagIds', () => {
    test('正常系: 空配列', () => {
      expect(patchTodoSchema.safeParse({ tagIds: [] }).success).toBe(true)
    })

    test('異常系: UUID でない値', () => {
      expect(patchTodoSchema.safeParse({ tagIds: ['not-a-uuid'] }).success).toBe(false)
    })
  })
})

// ─────────────────────────────────────────────
// createTagSchema
// ─────────────────────────────────────────────
describe('createTagSchema', () => {
  const valid = { name: 'work', color: '#38a8f5' }

  test('正常系: 全フィールドあり', () => {
    expect(createTagSchema.safeParse(valid).success).toBe(true)
  })

  describe('name', () => {
    test('境界値: 1文字はOK', () => {
      expect(createTagSchema.safeParse({ ...valid, name: 'a' }).success).toBe(true)
    })

    test('境界値: 50文字はOK', () => {
      expect(createTagSchema.safeParse({ ...valid, name: 'a'.repeat(50) }).success).toBe(true)
    })

    test('異常系: 空文字', () => {
      expect(createTagSchema.safeParse({ ...valid, name: '' }).success).toBe(false)
    })

    test('異常系: 51文字はNG', () => {
      expect(createTagSchema.safeParse({ ...valid, name: 'a'.repeat(51) }).success).toBe(false)
    })

    test('仕様確認: 空白のみは通る（min(1)は空白をカウントする）', () => {
      expect(createTagSchema.safeParse({ ...valid, name: '   ' }).success).toBe(true)
    })
  })

  describe('color', () => {
    test('正常系: 小文字 hex', () => {
      expect(createTagSchema.safeParse({ ...valid, color: '#38a8f5' }).success).toBe(true)
    })

    test('正常系: 大文字 hex', () => {
      expect(createTagSchema.safeParse({ ...valid, color: '#FF5733' }).success).toBe(true)
    })

    test('異常系: # なし', () => {
      expect(createTagSchema.safeParse({ ...valid, color: '38a8f5' }).success).toBe(false)
    })

    test('異常系: 3桁', () => {
      expect(createTagSchema.safeParse({ ...valid, color: '#fff' }).success).toBe(false)
    })

    test('異常系: 7桁以上', () => {
      expect(createTagSchema.safeParse({ ...valid, color: '#1234567' }).success).toBe(false)
    })

    test('異常系: # のみ', () => {
      expect(createTagSchema.safeParse({ ...valid, color: '#' }).success).toBe(false)
    })

    test('異常系: 空文字', () => {
      expect(createTagSchema.safeParse({ ...valid, color: '' }).success).toBe(false)
    })

    test('異常系: hex 以外の文字', () => {
      expect(createTagSchema.safeParse({ ...valid, color: '#zzzzzz' }).success).toBe(false)
    })

    test('デフォルト値: 未指定は #38a8f5', () => {
      const result = createTagSchema.safeParse({ name: 'work' })
      expect(result.success && result.data.color).toBe('#38a8f5')
    })
  })
})

// ─────────────────────────────────────────────
// upsertUserSchema
// ─────────────────────────────────────────────
describe('upsertUserSchema', () => {
  describe('email', () => {
    test('正常系: 有効なメールアドレス', () => {
      expect(upsertUserSchema.safeParse({ email: 'user@example.com' }).success).toBe(true)
    })

    test('異常系: 不正な形式', () => {
      expect(upsertUserSchema.safeParse({ email: 'not-an-email' }).success).toBe(false)
    })

    test('異常系: 空文字', () => {
      expect(upsertUserSchema.safeParse({ email: '' }).success).toBe(false)
    })

    test('異常系: フィールドなし', () => {
      expect(upsertUserSchema.safeParse({}).success).toBe(false)
    })
  })

  describe('name', () => {
    test('正常系: 文字列あり', () => {
      expect(upsertUserSchema.safeParse({ email: 'user@example.com', name: '田中太郎' }).success).toBe(true)
    })

    test('正常系: 空文字（optional のため許可）', () => {
      expect(upsertUserSchema.safeParse({ email: 'user@example.com', name: '' }).success).toBe(true)
    })

    test('正常系: undefined（省略可）', () => {
      expect(upsertUserSchema.safeParse({ email: 'user@example.com', name: undefined }).success).toBe(true)
    })
  })
})
