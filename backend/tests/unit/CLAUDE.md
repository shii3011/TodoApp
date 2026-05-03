# ユニットテスト規約

対象: `backend/tests/unit/`
実行: `docker compose run --rm backend-test`（サーバー不要）

---

## テスト対象

Zod スキーマの入力バリデーションのみ。controller・service・DB には触れない。

**IMPORTANT**: controller 層・service 層のユニットテストは現時点では書かない。
理由: ビジネスロジックがシンプルで、`tests/integration/` の HTTP テストがスタック全体を検証済みのため。
service 層のロジックが複雑になった段階で `createXxxService(mockRepo)` を使ったユニットテストを追加する。

---

## テスト作成ルール

### 1. フィールドごとに `describe` でネストする

```typescript
describe('createTodoSchema', () => {
  describe('title', () => {
    test('異常系: 空文字', ...)
    test('仕様確認: 空白のみは通る', ...)
  })
  describe('description', () => {
    test('境界値: 1000文字はOK', ...)
    test('異常系: 1001文字はNG', ...)
  })
})
```

### 2. 制約の境界値を必ず確認する

```
min(1)    → 0文字（NG）/ 1文字（OK）
max(1000) → 1000文字（OK）/ 1001文字（NG）
```

制約が明示されていないフィールドも「上限なし」という仕様をテストで明示する。

### 3. ライブラリの仕様が直感と異なる場合は `仕様確認:` で記録する

```typescript
// z.string().min(1) は空白文字もカウントするため '   ' を通す
// 業務的にNGならば .trim().min(1) への変更が必要
test('仕様確認: 空白のみは通る（min(1)は空白をカウントする）', () => { ... })
```

### 4. optional / nullable / array フィールドは「省略・null・空・重複」を確認する

| パターン | 確認観点 |
|---------|---------|
| 省略（`undefined`） | `optional()` フィールドが省略可能か |
| `null` | `nullable()` でクリアできるか |
| 空（`[]` / `''`） | 空配列・空文字が許可されるか |
| 重複 | 配列フィールドで重複値が通るか |

### 5. `default()` を持つフィールドは未指定時の値を必ず検証する

```typescript
test('デフォルト値: priority 未指定は medium', () => {
  const result = createTodoSchema.safeParse({ title: 'test' })
  expect(result.success && result.data.priority).toBe('medium')
})
```

---

## テスト名の命名規則

| プレフィックス | 用途 |
|-------------|------|
| `正常系:` | 期待通りに通るケース |
| `異常系:` | 弾かれるべきケース |
| `境界値:` | max/min の端の値 |
| `デフォルト値:` | 未指定時のデフォルト確認 |
| `仕様確認:` | ライブラリの挙動が直感と異なる場合の記録 |
