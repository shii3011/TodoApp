# TODO App — 開発規約

タイトル・詳細・優先度・期日・タグ・サブタスクを管理する TODO アプリ。
ローカル開発は Docker Compose、本番環境は AWS（Lambda + CloudFront + Cognito）。

詳細な実装パターンは @.claude/rules/backend.md と @.claude/rules/frontend.md を参照。

---

## コマンド

```bash
# ローカル起動（フロント: 5173 / バック: 3000）
docker compose up --build

# ユニットテスト（サーバー不要）
docker compose run --rm backend-test

# 統合テスト（HTTP CRUD + 並列）
docker compose --profile test run --rm backend-test-integration

# E2E テスト（docker-compose.override.yml に認証情報が必要）
docker compose --profile test run --rm e2e

# 型チェック
cd frontend && npx tsc --noEmit -p config/tsconfig.app.json
cd backend  && npm run build
```

設定ファイルはすべて `config/` 配下に集約している。スクリプト実行時は必ず `--config config/xxx` を指定する。

---

## アーキテクチャ

```
backend/src/
  routes/ → controllers/{todos,tags,users}/ → services/{todos,tags,users}/ → repositories/{todos,tags,users}/ → lib/prisma.ts
  middleware/              (auth, errorHandler)
  schemas/                 (Zod バリデーション)
  repositories/{domain}/   (types.ts + xxxPrismaRepository.ts)
  services/{domain}/       (xxxService.ts + index.ts)
  controllers/{domain}/    (xxxController.ts)
  lib/                     (prisma.ts, errors.ts, todoFormat.ts)

frontend/src/
  features/
    todos/   types.ts + hooks/ + components/
    tags/    types.ts + hooks/ + components/
  shared/    types.ts, constants/, utils/, hooks/, components/
  context/   (ErrorContext, RepositoryContext)
  lib/       (api.ts, repositories/)
  components/App/
  config/
```

**IMPORTANT**: 依存の方向は `routes → controllers → services → repositories → lib` の一方向を厳守する。services は middleware に依存してはならない（`AppError` は `lib/errors.ts` に定義）。

- **services**: ビジネスロジック・業務チェックのみ。Prisma を直接呼ばない
- **repositories**: Prisma アクセス・トランザクション・ロックを担う。`createXxxService(repo)` で DI する
- テスト時は `createXxxService(mockRepo)` でリポジトリを差し替え、DB なしでサービス層をテスト可能

---

## 命名規則

### バックエンド

| 対象 | 規則 | 例 |
|------|------|----|
| ファイル名 | camelCase | `todosController.ts` |
| 関数名 | camelCase | `listTodos()`, `createTodo()` |
| クラス名 | PascalCase | `AppError` |
| プリミティブ定数 | UPPER_SNAKE_CASE | `TX_OPTIONS` |

**IMPORTANT**: バックエンドは ESM（`"module": "nodenext"`）のため、相対インポートに `.js` 拡張子を**必ず**付ける。

```typescript
import { AppError } from '../lib/errors.js';     // ✅
import { AppError } from '../lib/errors';         // ❌ ESM エラーになる
```

### フロントエンド

| 対象 | 規則 | 例 |
|------|------|----|
| コンポーネントファイル | PascalCase | `TodoCard.tsx` |
| フック・ユーティリティファイル | camelCase | `useTodosQuery.ts` |
| カスタムフック | `use` 接頭辞必須 | `useCreateTodo()` |

---

## テスト規約

| 種別 | 場所 | 何をテストするか |
|------|------|----------------|
| ユニット | `backend/tests/unit/` | Zod スキーマの境界値・バリデーション |
| 統合 | `backend/tests/integration/` | エンドポイントの正常系・異常系・並列整合性 |
| E2E | `frontend/e2e/` | ユーザー操作フロー |

各テストフォルダの詳細規約は配下の `CLAUDE.md` を参照。

**IMPORTANT**: DB をモックしない。統合テストは実 DB に対して HTTP リクエストを投げる。テスト用の認証バイパスは `NODE_ENV=test` かつ `AWS_LAMBDA_FUNCTION_NAME` 未設定の場合のみ有効。

---

## セキュリティ規約

**IMPORTANT**: 以下のルールを破ると本番障害またはセキュリティインシデントに直結する。

- **シークレット**: 機密情報（DB URL, Cognito ID）は環境変数に平文で書かない。本番は Secrets Manager に追加する
- **認証**: 全エンドポイントに `authMiddleware` を適用する（`/health` 以外）。JWT 検証は `aws-jwt-verify` のみ使う
- **入力**: 全エンドポイントで Zod スキーマを通す。コントローラー層で検証してからサービス層を呼ぶ
- **認可**: 他ユーザーのリソースへのアクセスは 404 で返す（存在を推測させない）
- **エラー**: スタックトレースを本番で返さない。`errorHandler.ts` に委譲する

---

## Git 規約

- `main` への直接 push は禁止。PR 経由でマージする
- PR は CI（ユニット・統合・型チェック）が通ってからマージする
- コミット prefix: `feat:` / `fix:` / `refactor:` / `test:` / `docs:`
- **IMPORTANT**: `.env`, `docker-compose.override.yml` は絶対にコミットしない

---

## よくある間違い

**IMPORTANT**: 以下は過去に繰り返し発生したミスのリスト。必ず確認すること。

1. バックエンドで `.js` 拡張子を省略する → ESM エラーになる
2. コントローラーから直接 Prisma を呼ぶ → `services/` 経由にする（サービスも直接 Prisma を呼ばず `repositories/` 経由にする）
3. 自ドメイン Mutation で `invalidateQueries` を使う → `setQueryData` で直接更新する
4. 統合テストで DB をモックする → 実 DB を使う
5. 新しいシークレットを環境変数に平文で追加する → Secrets Manager に追加する
6. トランザクション分離レベルに `RepeatableRead` を使う → `ReadCommitted` + `FOR UPDATE` を使う
