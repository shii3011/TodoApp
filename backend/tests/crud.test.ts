/**
 * CRUD 操作テスト
 * 前提: docker compose up でサーバーが http://localhost:3000 で起動していること
 */

import { describe, it, expect, afterEach } from 'vitest'

const BASE_URL = process.env['API_BASE_URL'] ?? 'http://localhost:3000'

interface Todo {
  id: string
  title: string
  description: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  updatedAt: string
}

// テスト後に作成したデータを削除するためのID管理
const createdIds: string[] = []

afterEach(async () => {
  for (const id of createdIds) {
    await fetch(`${BASE_URL}/todos/${id}`, { method: 'DELETE' }).catch(() => {})
  }
  createdIds.length = 0
})

// ==================== POST /todos ====================
describe('POST /todos', () => {
  it('正常系: Todoを作成できる', async () => {
    const res = await fetch(`${BASE_URL}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'テストTodo', description: '詳細', priority: 'high' }),
    })
    const todo = await res.json() as Todo
    createdIds.push(todo.id)

    expect(res.status).toBe(201)
    expect(todo.title).toBe('テストTodo')
    expect(todo.description).toBe('詳細')
    expect(todo.priority).toBe('high')
    expect(todo.completed).toBe(false)
    expect(todo.id).toBeTruthy()
  })

  it('正常系: descriptionとpriorityは省略可能（デフォルト値が設定される）', async () => {
    const res = await fetch(`${BASE_URL}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'タイトルのみ' }),
    })
    const todo = await res.json() as Todo
    createdIds.push(todo.id)

    expect(res.status).toBe(201)
    expect(todo.description).toBe('')
    expect(todo.priority).toBe('medium')
  })

  it('異常系: titleが空の場合は400を返す', async () => {
    const res = await fetch(`${BASE_URL}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'タイトルなし' }),
    })
    expect(res.status).toBe(400)
  })
})

// ==================== GET /todos ====================
describe('GET /todos', () => {
  it('正常系: Todo一覧を取得できる', async () => {
    // 事前にデータ作成
    const createRes = await fetch(`${BASE_URL}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '一覧取得テスト' }),
    })
    const created = await createRes.json() as Todo
    createdIds.push(created.id)

    const res = await fetch(`${BASE_URL}/todos`)
    const todos = await res.json() as Todo[]

    expect(res.status).toBe(200)
    expect(Array.isArray(todos)).toBe(true)
    expect(todos.some(t => t.id === created.id)).toBe(true)
  })
})

// ==================== GET /todos/:id ====================
describe('GET /todos/:id', () => {
  it('正常系: 指定したTodoを取得できる', async () => {
    const createRes = await fetch(`${BASE_URL}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '単件取得テスト' }),
    })
    const created = await createRes.json() as Todo
    createdIds.push(created.id)

    const res = await fetch(`${BASE_URL}/todos/${created.id}`)
    const todo = await res.json() as Todo

    expect(res.status).toBe(200)
    expect(todo.id).toBe(created.id)
    expect(todo.title).toBe('単件取得テスト')
  })

  it('異常系: 存在しないIDは404を返す', async () => {
    const res = await fetch(`${BASE_URL}/todos/nonexistent-id-00000`)
    expect(res.status).toBe(404)
  })
})

// ==================== PUT /todos/:id ====================
describe('PUT /todos/:id', () => {
  it('正常系: Todoを全体置換できる', async () => {
    const createRes = await fetch(`${BASE_URL}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '置換前', priority: 'low' }),
    })
    const created = await createRes.json() as Todo
    createdIds.push(created.id)

    const res = await fetch(`${BASE_URL}/todos/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '置換後',
        description: '新しい詳細',
        priority: 'high',
        completed: true,
      }),
    })
    const todo = await res.json() as Todo

    expect(res.status).toBe(200)
    expect(todo.title).toBe('置換後')
    expect(todo.description).toBe('新しい詳細')
    expect(todo.priority).toBe('high')
    expect(todo.completed).toBe(true)
  })

  it('異常系: 存在しないIDは404を返す', async () => {
    const res = await fetch(`${BASE_URL}/todos/nonexistent-id-00000`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'test' }),
    })
    expect(res.status).toBe(404)
  })
})

// ==================== PATCH /todos/:id ====================
describe('PATCH /todos/:id', () => {
  it('正常系: completedだけ部分更新できる', async () => {
    const createRes = await fetch(`${BASE_URL}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '部分更新テスト', priority: 'medium' }),
    })
    const created = await createRes.json() as Todo
    createdIds.push(created.id)

    const res = await fetch(`${BASE_URL}/todos/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    })
    const todo = await res.json() as Todo

    expect(res.status).toBe(200)
    expect(todo.completed).toBe(true)
    expect(todo.title).toBe('部分更新テスト') // 他フィールドは変わらない
    expect(todo.priority).toBe('medium')
  })

  it('異常系: 存在しないIDは404を返す', async () => {
    const res = await fetch(`${BASE_URL}/todos/nonexistent-id-00000`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    })
    expect(res.status).toBe(404)
  })
})

// ==================== DELETE /todos/:id ====================
describe('DELETE /todos/:id', () => {
  it('正常系: Todoを削除できる', async () => {
    const createRes = await fetch(`${BASE_URL}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '削除テスト' }),
    })
    const created = await createRes.json() as Todo

    const deleteRes = await fetch(`${BASE_URL}/todos/${created.id}`, { method: 'DELETE' })
    expect(deleteRes.status).toBe(204)

    // 削除後は404になる
    const getRes = await fetch(`${BASE_URL}/todos/${created.id}`)
    expect(getRes.status).toBe(404)
  })

  it('異常系: 存在しないIDは404を返す', async () => {
    const res = await fetch(`${BASE_URL}/todos/nonexistent-id-00000`, { method: 'DELETE' })
    expect(res.status).toBe(404)
  })
})

// ==================== 認可テスト（クロスユーザーアクセス） ====================
describe('クロスユーザーアクセス', () => {
  const userA = 'test-user-a'
  const userB = 'test-user-b'

  function headers(userId: string) {
    return { 'Content-Type': 'application/json', 'X-Test-User-Id': userId }
  }

  let todoId: string

  // テストごとにユーザーAのTodoを作成し、テスト後に削除する
  afterEach(async () => {
    if (todoId) {
      await fetch(`${BASE_URL}/todos/${todoId}`, {
        method: 'DELETE',
        headers: headers(userA),
      }).catch(() => {})
      todoId = ''
    }
  })

  it('ユーザーBはユーザーAのTodoをGETできない（404）', async () => {
    const createRes = await fetch(`${BASE_URL}/todos`, {
      method: 'POST',
      headers: headers(userA),
      body: JSON.stringify({ title: 'ユーザーAのTodo' }),
    })
    const created = await createRes.json() as Todo
    todoId = created.id

    const res = await fetch(`${BASE_URL}/todos/${todoId}`, {
      headers: headers(userB),
    })
    expect(res.status).toBe(404)
  })

  it('ユーザーBはユーザーAのTodoをPUTできない（404）', async () => {
    const createRes = await fetch(`${BASE_URL}/todos`, {
      method: 'POST',
      headers: headers(userA),
      body: JSON.stringify({ title: 'ユーザーAのTodo' }),
    })
    const created = await createRes.json() as Todo
    todoId = created.id

    const res = await fetch(`${BASE_URL}/todos/${todoId}`, {
      method: 'PUT',
      headers: headers(userB),
      body: JSON.stringify({ title: '書き換えたい', completed: false }),
    })
    expect(res.status).toBe(404)
  })

  it('ユーザーBはユーザーAのTodoをPATCHできない（404）', async () => {
    const createRes = await fetch(`${BASE_URL}/todos`, {
      method: 'POST',
      headers: headers(userA),
      body: JSON.stringify({ title: 'ユーザーAのTodo' }),
    })
    const created = await createRes.json() as Todo
    todoId = created.id

    const res = await fetch(`${BASE_URL}/todos/${todoId}`, {
      method: 'PATCH',
      headers: headers(userB),
      body: JSON.stringify({ completed: true }),
    })
    expect(res.status).toBe(404)
  })

  it('ユーザーBはユーザーAのTodoをDELETEできない（404）', async () => {
    const createRes = await fetch(`${BASE_URL}/todos`, {
      method: 'POST',
      headers: headers(userA),
      body: JSON.stringify({ title: 'ユーザーAのTodo' }),
    })
    const created = await createRes.json() as Todo
    todoId = created.id

    const res = await fetch(`${BASE_URL}/todos/${todoId}`, {
      method: 'DELETE',
      headers: headers(userB),
    })
    expect(res.status).toBe(404)
  })

  it('GET /todos はログインユーザー自身のTodoのみ返す', async () => {
    // ユーザーAでTodo作成
    const createRes = await fetch(`${BASE_URL}/todos`, {
      method: 'POST',
      headers: headers(userA),
      body: JSON.stringify({ title: 'ユーザーAのTodo' }),
    })
    const created = await createRes.json() as Todo
    todoId = created.id

    // ユーザーBの一覧にユーザーAのTodoが含まれていないこと
    const res = await fetch(`${BASE_URL}/todos`, { headers: headers(userB) })
    const todos = await res.json() as Todo[]

    expect(res.status).toBe(200)
    expect(todos.every(t => t.id !== todoId)).toBe(true)
  })
})
