# E2E テスト規約

対象: `frontend/e2e/`
実行: `docker compose --profile test run --rm e2e`

---

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `auth.setup.ts` | Cognito ログインを1回だけ実行しセッションを保存 |
| `todo.spec.ts` | ユーザー操作フローのテスト本体 |
| `teardown.ts` | テスト後に `E2E` プレフィックスのデータを本番DBから全削除 |
| `.auth/session.json` | 保存済みセッション（`.gitignore` 対象・コミット禁止） |

---

## テスト作成ルール

### 1. テストデータのタイトルは必ず `E2E` プレフィックスをつける

**IMPORTANT**: CI の E2E は本番 Neon PostgreSQL に書き込まれる。`teardown.ts` が `E2E` で始まるTODOを全削除するため、このプレフィックスがないとクリーンアップされない。

```typescript
function uid() { return Date.now().toString(36) }
const title = `E2E作成確認-${uid()}`  // ✅
const title = `作成確認-${uid()}`     // ❌ teardown で削除されない
```

### 2. セッション保存前に `PUT /users/me` の完了を待つ

**IMPORTANT**: この待機を省略すると外部キー制約エラーでテストが失敗する。

```typescript
await page.waitForResponse(
  resp => resp.url().includes('/users/me') && resp.request().method() === 'PUT',
  { timeout: 15_000 },
)
await page.context().storageState({ path: SESSION_FILE })
```

### 3. セレクターはロール・プレースホルダー・テキストで指定する

クラス名・id 属性への依存は実装変更で壊れるため使わない。

```typescript
page.getByRole('button', { name: '追加する' })   // ✅
page.getByPlaceholder('タイトル *')               // ✅
page.locator('.submit-btn')                       // ❌
page.locator('#title-input')                      // ❌
```

### 4. opacity トランジションで隠れている要素は `.hover()` してからクリックする

```typescript
const card = page.locator('li', { hasText: title }).first()
await card.hover()
await card.getByTitle('削除').click()
```

---

## 必要な環境変数

| 変数名 | 用途 |
|--------|------|
| `E2E_EMAIL` | テスト専用 Cognito アカウントのメールアドレス |
| `E2E_PASSWORD` | テスト専用 Cognito アカウントのパスワード |
| `PLAYWRIGHT_BASE_URL` | アプリの URL（デフォルト: `http://frontend:5173`） |
| `E2E_API_BASE_URL` | API の URL（CI 本番 E2E 時に設定） |

**IMPORTANT**: `E2E_EMAIL` / `E2E_PASSWORD` は開発者個人のアカウントを使わない。専用テストアカウントを使う。
ローカル実行時は `docker-compose.override.yml` に記載する（`.gitignore` 対象）。
