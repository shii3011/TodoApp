# フロントエンド実装パターン

## API 呼び出し

全 API 呼び出しは `lib/api.ts` の `apiFetch` を使う。Bearer トークンを自動付与する。

```typescript
const res = await apiFetch('/todos', { method: 'POST', body: JSON.stringify(data) })
if (!res.ok) throw new Error('TODOの作成に失敗しました')
return res.json() as Promise<Todo>
```

---

## カスタムフック設計（1 ファイル = 1 操作）

フックファイルに定義する操作は 1 つだけ。Query と Mutation を分離する。

```
hooks/todos/
  useTodosQuery.ts    # GET のみ
  useCreateTodo.ts    # POST のみ
  useUpdateTodo.ts    # PUT のみ
  useToggleTodo.ts    # PATCH（完了トグル）のみ
  useDeleteTodo.ts    # DELETE のみ
```

**Query フック** — `useQuery` を使い、データを返す：

```typescript
export function useTodosQuery() {
  const { data: todos = [], isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: async (): Promise<Todo[]> => {
      const res = await apiFetch('/todos')
      if (!res.ok) throw new Error('TODOの取得に失敗しました')
      return res.json() as Promise<Todo[]>
    },
  })
  return { todos, isLoading }
}
```

**Mutation フック** — `useMutation` を使い、関数を返す（遅延実行）。成功時は `setQueryData` でキャッシュを直接更新する：

```typescript
export function useCreateTodo() {
  const onError = useSetError()
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (form: TodoForm): Promise<Todo> => { ... },
    onSuccess: (todo) => qc.setQueryData<Todo[]>(['todos'], prev => [...(prev ?? []), todo]),
    onError: (e: Error) => onError(e.message),
  })
  return (form: TodoForm) => mutation.mutate(form)
}
```

---

## キャッシュ更新の使い分け

| ケース | 方法 |
|--------|------|
| 自ドメインの変更（todos を更新した） | `setQueryData` で直接更新 |
| 他ドメインへの副作用（タグ削除 → todos のタグが変わる） | `invalidateQueries({ queryKey: ['todos'] })` で再フェッチ |

他ドメインのキャッシュを直接書き換えない（クロスドメイン結合を避ける）。

---

## 状態管理の場所

| 状態の種類 | 置き場所 |
|-----------|---------|
| サーバーデータ（todos, tags） | TanStack Query |
| 複数コンポーネントにまたがる UI 状態（エラー） | React Context |
| 単一コンポーネント内 UI 状態（フォーム値、開閉フラグ） | `useState` |

---

## CSS Modules

スタイルはコンポーネントと同名の `.module.css` ファイルに定義する。

```typescript
import styles from './TodoCard.module.css'
<li className={styles.card}>
```

共有スタイルは `shared.module.css` に定義する。
CSS カスタムプロパティを使う場合は型キャストする：

```typescript
style={{ '--tag-color': tag.color } as CSSProperties}
```
