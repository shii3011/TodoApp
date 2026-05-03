# 統合テスト規約

対象: `backend/tests/integration/`
実行: `docker compose --profile test run --rm backend-test-integration`（実サーバー・実DB必須）

---

## テスト対象

| ファイル | 内容 |
|---------|------|
| `crud.test.ts` | 全エンドポイントの正常系・異常系（HTTP レベル） |
| `concurrent.test.ts` | 並列アクセス時のデータ整合性 |
| `setup.integration.ts` | テスト用 userId・認証ヘッダーのグローバルセットアップ |

---

## テスト作成ルール

### 1. DB をモックしない

**IMPORTANT**: Prisma・DB を一切モックしない。実 DB に対して HTTP リクエストを投げる。

理由: このアプリのビジネスロジックの核心はトランザクション・ロック・SQL にある。
DB をモックすると「分離レベルが正しいか」「FOR UPDATE が機能するか」「並列時にデータが壊れないか」を検証できない。

実際にモックでは発見できなかったバグの例:
> `RepeatableRead` + `FOR UPDATE` の組み合わせで 50 件並列時に `40001 serialization error` が発生。
> `ReadCommitted` + `FOR UPDATE` が正しいことを実 DB テストで確認した。

### 2. テストファイルは直列実行する

同一 `userId` で並列にテストファイルが走ると DB の状態が競合する。
`vitest.integration.ts` で `fileParallelism: false` を設定済み。

`concurrent.test.ts` 内では意図的に並列リクエストを投げて整合性を検証する（ファイル間は直列、ファイル内の並列は許可）。

### 3. afterEach でテストデータを必ずクリーンアップする

テスト間でデータが残ると後続テストの結果に影響する。作成したリソースは `afterEach` で DELETE する。

```typescript
afterEach(async () => {
  if (createdId) {
    await fetch(`${BASE_URL}/todos/${createdId}`, { method: 'DELETE', headers })
    createdId = null
  }
})
```

### 4. 認可テストを必ず含める

他ユーザーのリソースへのアクセスは 404 を返す仕様。別 `userId` でのアクセスが 404 になることを確認する。

```typescript
test('異常系: 別ユーザーのTODOは404', async () => {
  const res = await fetch(`${BASE_URL}/todos/${otherUserTodoId}`, { headers: myHeaders })
  expect(res.status).toBe(404)
})
```

### 5. エラーレスポンスのステータスコードと構造を検証する

400（バリデーション）・401（認証）・404（リソースなし）それぞれを明示的にテストする。

---

## テスト名の命名規則

| プレフィックス | 用途 |
|-------------|------|
| `正常系:` | 期待通りのレスポンスが返るケース |
| `異常系:` | エラーレスポンスが正しく返るケース |
| `並列:` | 並列リクエストの整合性検証 |
