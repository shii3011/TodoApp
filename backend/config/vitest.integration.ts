import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 結合テスト用設定。
// 実行前に HTTP サーバー（localhost:3000 または API_BASE_URL）が起動している必要がある。
// Docker 環境では docker compose --profile test run --rm backend-test-integration で実行。
export default defineConfig({
  root: path.resolve(__dirname, '..'),
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/setup.integration.ts'],
    testTimeout: 30_000,
    // テストファイルを直列実行（並列だと同一 userId で DB 競合が起きる）
    fileParallelism: false,
  },
})
