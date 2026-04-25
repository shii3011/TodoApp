import { test as setup, expect } from '@playwright/test'
import path from 'path'

const SESSION_FILE = path.join(import.meta.dirname, '.auth/session.json')

/**
 * Cognito ログインを1回だけ実行しセッションを保存する。
 * 以降の全テストはこのセッションを再利用し、ログイン処理をスキップする。
 *
 * 必要な環境変数:
 *   E2E_EMAIL    - テスト用 Cognito ユーザーのメールアドレス
 *   E2E_PASSWORD - テスト用 Cognito ユーザーのパスワード
 */
setup('Cognito ログイン', async ({ page }) => {
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD
  if (!email || !password) throw new Error('E2E_EMAIL と E2E_PASSWORD を設定してください')

  await page.goto('/')

  const logoutBtn = page.getByRole('button', { name: 'ログアウト' })
  const usernameField = page.getByPlaceholder('Enter your Username')

  // どちらかが表示されるまで待機（最大 15 秒）
  await Promise.race([
    logoutBtn.waitFor({ state: 'visible', timeout: 15_000 }),
    usernameField.waitFor({ state: 'visible', timeout: 15_000 }),
  ])

  // すでにログイン済みの場合はいったんログアウトして新鮮なトークンを取得する
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click()
    await usernameField.waitFor({ state: 'visible', timeout: 15_000 })
  }

  // Amplify UI Authenticator のログインフォーム
  await usernameField.fill(email)
  await page.getByPlaceholder('パスワードを入力').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  // アプリ本体が表示されるまで待機
  await expect(logoutBtn).toBeVisible({ timeout: 15_000 })

  await page.context().storageState({ path: SESSION_FILE })
})
