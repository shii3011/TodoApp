/**
 * 結合テスト用グローバルセットアップ
 * テスト実行前に DB へテストユーザーを作成する。
 * users テーブルは todos の外部キー (userId) の参照先であるため、
 * ユーザーが存在しないと Todo の作成が P2003 で失敗する。
 */

const BASE_URL = process.env['API_BASE_URL'] ?? 'http://localhost:3000';

export async function setup() {
  const res = await fetch(`${BASE_URL}/users/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', name: 'Test User' }),
  });
  if (!res.ok) {
    throw new Error(`Test user setup failed: ${res.status} ${await res.text()}`);
  }
}
