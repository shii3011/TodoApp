import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// デフォルト（npm test）はユニットテストのみ。
// サーバー起動を必要とする結合テストは npm run test:integration で実行。
export default defineConfig({
  root: path.resolve(__dirname, '..'),
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/schemas.test.ts'],
    testTimeout: 30_000,
  },
})
