# バックエンド実装パターン

## スキーマ定義（Zod）

操作ごとに CREATE / UPDATE（PUT）/ PATCH を分けて定義する。

```typescript
// CREATE: 必須フィールドは plain、オプションは .optional()
export const createTodoSchema = z.object({
  title: z.string().min(1, 'title is required'),
  priority: priorityEnum.default('medium'),
  dueDate: z.string().datetime({ offset: true }).optional(),
});

// UPDATE（PUT）: 全フィールドに .default() を設定
export const updateTodoSchema = z.object({
  title: z.string().min(1, 'title is required'),
  completed: z.boolean().default(false),
});

// PATCH: 全フィールドを .optional()
export const patchTodoSchema = z.object({
  title: z.string().min(1).optional(),
  completed: z.boolean().optional(),
});
```

---

## コントローラーの書き方

- 署名: `async function foo(req: Request, res: Response, next: NextFunction): Promise<void>`
- バリデーション: `schema.safeParse()` → 失敗時は 400 を返して `return`
- `userId` は `res.locals['userId'] as string`（authMiddleware が設定）
- エラーは必ず `next(err)` でグローバルハンドラーへ委譲

```typescript
export async function createTodo(req: Request, res: Response, next: NextFunction): Promise<void> {
  const result = createTodoSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0]?.message ?? 'Invalid input' });
    return;
  }
  try {
    const userId = res.locals['userId'] as string;
    const todo = await todosService.createTodo(userId, result.data);
    res.status(201).json(todo);
  } catch (err) {
    next(err);
  }
}
```

ステータスコード: 201（作成）、204（削除）、デフォルト 200。

サービスのインポートは `import * as todosService from '../../services/todos/index.js'` でまとめてインポートする。

---

## サービス層の書き方

- ビジネスロジック・業務チェックのみ。Prisma を直接呼ばない
- DB アクセスは必ず repository 層経由（`createXxxService(repo)` で DI）
- 書き込み操作（PUT / PATCH / DELETE）のロックは repository 層が担う
- リソースが存在しない・権限なしは `AppError(404, '...')` をスロー（404 で統一）

```typescript
// サービスはリポジトリインターフェース経由でアクセスする
export function createTodosService(todosRepo: TodosRepository, tagsRepo: TagsRepository) {
  return {
    async getTodo(id: string, userId: string): Promise<FormattedTodo> {
      const todo = await todosRepo.findById(id, userId)
      if (!todo) throw new AppError(404, 'Todo not found')
      return todo
    },
  }
}
```

---

## リポジトリ層の書き方

- Prisma アクセス・トランザクション・悲観的ロックを担う
- 書き込み操作（PUT / PATCH / DELETE）は `SELECT FOR UPDATE` + `$transaction` で悲観的ロック
- トランザクション設定は `ReadCommitted` + タイムアウト 10 秒を標準とする

```typescript
const TX_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  timeout: 10_000,
};

async function lockTodoOrThrow(tx, id: string, userId: string): Promise<void> {
  const locked = await tx.$queryRaw`
    SELECT id FROM todos WHERE id = ${id} AND "userId" = ${userId} FOR UPDATE
  `;
  if (locked.length === 0) throw new AppError(404, 'Todo not found');
}
```

---

## Prisma スキーマ規約

- テーブル名: snake_case（`@@map("todos")`）
- フィールド名: camelCase（DB は `@map("due_date")`）
- リレーション: ON DELETE CASCADE を基本とする
- インデックス: `userId` に必ず `@@index` を設定
- ユニーク制約: ユーザー固有のリソースは `[userId, name]` の複合ユニーク

---

## エラー定義

カスタムエラーは `lib/errors.ts` の `AppError` を使う。

```typescript
throw new AppError(404, 'Todo not found');
throw new AppError(400, 'Invalid input');
```

`AppError` は `services/` と `middleware/` の両方から参照できる唯一の共通ライブラリ。
