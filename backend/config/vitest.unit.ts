import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// デフォルト（npm test）はユニットテストのみ。
// サーバー起動を必要とする結合テストは npm run test:integration で実行。
export default defineConfig({
  root: path.resolve(__dirname, '..'),
  resolve: {
    alias: [
      // ESM の .js インポートを TypeScript の .ts ファイルに解決する
      { find: /^(\.{1,2}\/.+)\.js$/, replacement: '$1' },
    ],
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    testTimeout: 30_000,
  },
})
