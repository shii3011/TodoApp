import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '::',
    port: 5173,
    // Docker コンテナ内から `http://frontend:5173` でアクセスする際に必要
    allowedHosts: ['frontend', 'localhost'],
    // Docker 内で動かす場合、VITE_API_BASE_URL が未設定のとき Vite が
    // /api/* をバックエンドにプロキシする。
    // ブラウザは常に同一オリジン（Vite dev server）にリクエストするため
    // Docker ネットワーク名の解決問題が発生しない。
    proxy: process.env.VITE_API_PROXY_TARGET
      ? {
          '/api': {
            target: process.env.VITE_API_PROXY_TARGET,
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
          },
        }
      : undefined,
  },
  build: {
    sourcemap: true,
  },
})
