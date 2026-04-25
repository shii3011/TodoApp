import { fetchAuthSession } from 'aws-amplify/auth';

// VITE_API_PROXY_TARGET が設定されている場合（Docker E2E）は Vite proxy 経由（/api プレフィックス）を優先する。
// そうでない場合は VITE_API_BASE_URL、またはローカル開発用フォールバックを使う。
const API_BASE = import.meta.env.VITE_API_PROXY_TARGET
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000');

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString();
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
}
