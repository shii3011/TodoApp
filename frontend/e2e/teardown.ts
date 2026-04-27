import { test } from '@playwright/test'

/**
 * E2E テスト後のデータクリーンアップ
 *
 * タイトルが "E2E" で始まる全 Todo を API 経由で削除する。
 * Playwright の teardown プロジェクトとして chromium プロジェクト終了後に実行される。
 *
 * API ベース URL の解決順:
 *   1. VITE_API_PROXY_TARGET が設定されている場合 → "/api"（Docker E2E: Vite proxy 経由）
 *   2. E2E_API_BASE_URL が設定されている場合 → その値（CI 本番デプロイ後 E2E）
 *   3. フォールバック → "http://localhost:3000"（ローカル直接実行）
 */
const API_BASE = process.env['VITE_API_PROXY_TARGET']
  ? '/api'
  : (process.env['E2E_API_BASE_URL'] ?? 'http://localhost:3000')

test('E2Eテストデータを削除する', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const deletedCount = await page.evaluate(async (apiBase: string) => {
    // Cognito access token を localStorage から動的に取得
    const lastUserKey = Object.keys(localStorage).find(k =>
      k.startsWith('CognitoIdentityServiceProvider.') && k.endsWith('.LastAuthUser'),
    )
    if (!lastUserKey) return 0

    const prefix = lastUserKey.replace('.LastAuthUser', '')
    const username = localStorage.getItem(lastUserKey)
    if (!username) return 0

    const accessToken = localStorage.getItem(`${prefix}.${username}.accessToken`)
    if (!accessToken) return 0

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    }

    const res = await fetch(`${apiBase}/todos`, { headers })
    if (!res.ok) return 0

    const todos = (await res.json()) as Array<{ id: string; title: string }>
    const e2eTodos = todos.filter(t => t.title.startsWith('E2E'))

    await Promise.all(
      e2eTodos.map(t =>
        fetch(`${apiBase}/todos/${t.id}`, { method: 'DELETE', headers }),
      ),
    )
    return e2eTodos.length
  }, API_BASE)

  console.log(`E2E テストデータを ${deletedCount} 件削除しました`)
})
