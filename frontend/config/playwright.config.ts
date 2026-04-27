import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SESSION_FILE = path.resolve(__dirname, '../e2e/.auth/session.json')

export default defineConfig({
  testDir: '../e2e',
  fullyParallel: false, // Cognito レートリミット対策
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // 認証セットアップ（全テストの前に1回だけ実行）
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Cognito ログインを毎テストで繰り返さないためにセッションを再利用
        storageState: SESSION_FILE,
      },
      dependencies: ['setup'],
      // テスト完了後（成功・失敗問わず）に E2E データを削除する
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: '**/teardown.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: SESSION_FILE,
      },
    },
  ],
})
