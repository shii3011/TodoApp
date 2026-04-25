/**
 * 大量同時更新・大量レスポンステスト
 * 前提: docker compose up でサーバーが http://localhost:3000 で起動していること
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const BASE_URL = process.env['API_BASE_URL'] ?? 'http://localhost:3000'

interface Todo {
  id: string
  title: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
}

// ヘルパー
const createTodo = async (title: string): Promise<Todo> => {
  const res = await fetch(`${BASE_URL}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, priority: 'medium' }),
  })
  return res.json() as Promise<Todo>
}

const deleteTodo = async (id: string) => {
  await fetch(`${BASE_URL}/todos/${id}`, { method: 'DELETE' }).catch(() => {})
}

// ==================== 大量同時更新テスト ====================
describe('大量同時更新テスト（悲観的ロック検証）', () => {
  it('同じレコードに50件の並列PATCHが全て成功し、データが壊れない', async () => {
    const todo = await createTodo('並列PATCH対象')
    const CONCURRENT = 50

    const start = Date.now()
    const responses = await Promise.all(
      Array.from({ length: CONCURRENT }, (_, i) =>
        fetch(`${BASE_URL}/todos/${todo.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: `並列更新 ${i}`, completed: i % 2 === 0 }),
        })
      )
    )
    const elapsed = Date.now() - start

    const statusCodes = responses.map(r => r.status)
    const successCount = statusCodes.filter(s => s === 200).length

    console.log(`PATCH ${CONCURRENT}件: ${elapsed}ms, 成功=${successCount}件`)

    // 全リクエストが成功すること
    expect(successCount).toBe(CONCURRENT)

    // 最終状態のデータが壊れていないこと
    const final = await fetch(`${BASE_URL}/todos/${todo.id}`).then(r => r.json()) as Todo
    expect(final.id).toBe(todo.id)
    expect(typeof final.title).toBe('string')
    expect(final.title.length).toBeGreaterThan(0)
    expect(typeof final.completed).toBe('boolean')

    await deleteTodo(todo.id)
  })

  it('同じレコードに50件の並列PUTが全て成功し、データが壊れない', async () => {
    const todo = await createTodo('並列PUT対象')
    const CONCURRENT = 50

    const start = Date.now()
    const responses = await Promise.all(
      Array.from({ length: CONCURRENT }, (_, i) =>
        fetch(`${BASE_URL}/todos/${todo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `PUT更新 ${i}`,
            description: `説明 ${i}`,
            priority: (['low', 'medium', 'high'] as const)[i % 3],
            completed: i % 2 === 0,
          }),
        })
      )
    )
    const elapsed = Date.now() - start

    const successCount = responses.filter(r => r.status === 200).length
    console.log(`PUT ${CONCURRENT}件: ${elapsed}ms, 成功=${successCount}件`)

    expect(successCount).toBe(CONCURRENT)

    const final = await fetch(`${BASE_URL}/todos/${todo.id}`).then(r => r.json()) as Todo
    expect(final.id).toBe(todo.id)
    expect(['low', 'medium', 'high']).toContain(final.priority)

    await deleteTodo(todo.id)
  })

  it('同じレコードへの並列更新中に1件DELETEしても整合性が保たれる', async () => {
    const todo = await createTodo('削除競合テスト')
    const CONCURRENT = 20

    // 更新20件とDELETE1件を同時に投げる
    const patchRequests = Array.from({ length: CONCURRENT }, (_, i) =>
      fetch(`${BASE_URL}/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `競合更新 ${i}` }),
      })
    )
    const deleteRequest = fetch(`${BASE_URL}/todos/${todo.id}`, { method: 'DELETE' })

    const allResponses = await Promise.all([...patchRequests, deleteRequest])
    const statusCodes = allResponses.map(r => r.status)

    // 200(成功) または 404(削除後のアクセス) のみ返ること（500はNG）
    const unexpectedCodes = statusCodes.filter(s => s !== 200 && s !== 204 && s !== 404)
    expect(unexpectedCodes).toHaveLength(0)
  })
})

// ==================== 大量レスポンステスト ====================
describe('大量レスポンステスト', () => {
  const createdIds: string[] = []

  beforeAll(async () => {
    // 100件のTodoを並列作成
    console.log('100件のテストデータを作成中...')
    const todos = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        createTodo(`一括テストTodo ${String(i + 1).padStart(3, '0')}`)
      )
    )
    createdIds.push(...todos.map(t => t.id))
    console.log(`作成完了: ${createdIds.length}件`)
  })

  afterAll(async () => {
    // 並列で全削除
    await Promise.all(createdIds.map(id => deleteTodo(id)))
  })

  it('100件以上のTodoを2秒以内に取得できる', async () => {
    const start = Date.now()
    const res = await fetch(`${BASE_URL}/todos`)
    const elapsed = Date.now() - start
    const todos = await res.json() as Todo[]

    console.log(`GET /todos: ${elapsed}ms, ${todos.length}件取得`)

    expect(res.status).toBe(200)
    expect(todos.length).toBeGreaterThanOrEqual(100)
    expect(elapsed).toBeLessThan(2_000)
  })

  it('50件の並列GETリクエストが全て成功する', async () => {
    const CONCURRENT = 50

    const start = Date.now()
    const responses = await Promise.all(
      Array.from({ length: CONCURRENT }, () => fetch(`${BASE_URL}/todos`))
    )
    const elapsed = Date.now() - start

    const successCount = responses.filter(r => r.status === 200).length
    console.log(`並列GET ${CONCURRENT}件: ${elapsed}ms, 成功=${successCount}件`)

    expect(successCount).toBe(CONCURRENT)
    expect(elapsed).toBeLessThan(5_000)
  })

  it('100件の並列POST（大量登録）が全て成功する', async () => {
    const CONCURRENT = 100
    const start = Date.now()

    const responses = await Promise.all(
      Array.from({ length: CONCURRENT }, (_, i) =>
        fetch(`${BASE_URL}/todos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: `一括登録 ${i}`, priority: 'low' }),
        })
      )
    )
    const elapsed = Date.now() - start

    const successCount = responses.filter(r => r.status === 201).length
    console.log(`並列POST ${CONCURRENT}件: ${elapsed}ms, 成功=${successCount}件`)

    // 作成したIDを後で削除
    for (const res of responses) {
      if (res.status === 201) {
        const todo = await res.json() as Todo
        createdIds.push(todo.id)
      }
    }

    expect(successCount).toBe(CONCURRENT)
  })
})
