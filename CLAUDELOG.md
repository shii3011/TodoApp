# Claude 作業ログ

このファイルは Claude Code が行った作業の記録です。

---

## 2026-04-25

### E2E テスト全件パス（8/8）

**作業概要**: Playwright E2E テストを実行し、4件の失敗を順次修正して全件パスさせた。

**修正した問題一覧**

#### 1. レートリミットによる TODO 作成失敗
- **症状**: テストを繰り返し実行すると「TODOの作成に失敗しました」が表示され、POST /todos が失敗する
- **原因**: `backend/src/app.ts` のレートリミットが `NODE_ENV !== 'test'` 条件で設定されており、`NODE_ENV=development` の開発バックエンドでも有効だった。ユーザーベースの制限（100 req/15分）に、繰り返しテスト実行で到達していた
- **修正**: `app.ts` の両レートリミット条件を `!== 'test'` → `=== 'production'` に変更し、ローカル開発環境では無効化
- **ファイル**: `backend/src/app.ts`

#### 2. チェックボックスのクリック失敗（viewport 外の要素）
- **症状**: `card.getByRole('checkbox').click()` が "element is not visible" または "Element is outside of the viewport" で失敗
- **原因**: `shared.module.css` で `input[type='checkbox']` に `position: absolute; opacity: 0; width: 0; height: 0` が適用されており、実際の input 要素は画面外に隠れていた。見た目のチェックボックスは `<span className={shared.checkBox} />` で別途レンダリングされるカスタム実装
- **修正**: `getByRole('checkbox')` → `card.locator('label').first().click()` に変更。`<label>` をクリックすると checkbox の onChange が発火する
- **ファイル**: `frontend/e2e/todo.spec.ts`

#### 3. 削除ボタンが見つからない
- **症状**: `card.getByRole('button', { name: '削除' })` がタイムアウト
- **原因**: 削除ボタンの DOM は `<button title="削除">🗑️</button>` で、アクセシブル名が絵文字 `🗑️` になるため `name: '削除'` では一致しない
- **修正**: `getByRole('button', { name: '削除' })` → `card.getByTitle('削除')` に変更
- **原因その2**: `.todoActions` が CSS で `opacity: 0` になっており、ホバーしないとボタンが不可視（`.todoCard:hover .todoActions { opacity: 1 }`）
- **修正**: クリック前に `await card.hover()` を追加
- **ファイル**: `frontend/e2e/todo.spec.ts`

#### 4. 同名 TODO による strict mode violation
- **症状**: `locator.click: strict mode violation: ... resolved to 2 elements`
- **原因**: テストが TODO を作成するが削除しないため、繰り返し実行で同名の TODO が蓄積し、ロケーターが複数要素にマッチしていた
- **修正**: タイトルに `Date.now().toString(36)` で生成した一意な suffix を付与（例: `E2E完了トグル-moe7ectn`）
- **ファイル**: `frontend/e2e/todo.spec.ts`

**最終結果**

```
8 passed (7.4s)
  ✓ [setup] Cognito ログイン
  ✓ [chromium] TODO を作成できる
  ✓ [chromium] 完了トグルで完了状態になる
  ✓ [chromium] TODO を削除できる
  ✓ [chromium] タイトル未入力では追加ボタンが無効
  ✓ [chromium] タイトルを入力すると追加ボタンが有効になる
  ✓ [chromium] 検索ワードで絞り込みできる
  ✓ [chromium] 未完了フィルターで完了済みTODOが非表示になる
```

---

## 2026-04-21

### Docker / フロントエンド環境構築

**作業概要**: ローカル Docker 環境の構築と E2E テスト実行基盤の整備。

**修正した問題一覧**

#### 1. フロントエンドコンテナの EACCES エラー
- **症状**: Vite dev server 起動時に `/app/node_modules/.vite-temp` への書き込み権限エラー
- **修正**: `frontend/Dockerfile` に `RUN chown -R node:node /app` を追加

#### 2. E2E テストが `Cannot navigate to invalid URL` で失敗
- **原因**: `npx playwright test` に `--config` フラグがなく baseURL が未設定
- **修正**: `docker-compose.yml` の e2e コマンドに `--config config/playwright.config.ts` を追加

#### 3. storageState の ENOENT エラー
- **原因**: `playwright.config.ts` で storageState のパスが相対パス `'../e2e/.auth/session.json'` になっており、CWD `/app` から解決されて `/e2e/.auth/session.json`（誤パス）になっていた
- **修正**: `fileURLToPath(import.meta.url)` で絶対パスに変換。また storageState をグローバルな `use` から `chromium` プロジェクト設定のみに移動（setup プロジェクトが存在前にファイルを参照しないよう）

#### 4. E2E テストで API が到達できない
- **原因**: Vite proxy の `VITE_API_PROXY_TARGET` が frontend コンテナに設定されていなかったため、ブラウザが `http://127.0.0.1:3000`（e2e コンテナ内で未解決のアドレス）を直接参照していた
- **修正**: `docker-compose.yml` の frontend サービスに `VITE_API_PROXY_TARGET=http://backend:3000` を永続設定

#### 5. E2E 認証情報の設定
- **方法**: `docker-compose.override.yml`（`.gitignore` 対象）に Cognito の `E2E_EMAIL` / `E2E_PASSWORD` を記載
- **`.gitignore` への追加**: `docker-compose.override.yml` をコミット対象外に設定

### ドキュメント整備

#### CLAUDE.md 作成
- Web リサーチに基づくベストプラクティスを適用
- 200行制限に収め、詳細ルールは `@.claude/rules/backend.md` と `@.claude/rules/frontend.md` に分割
- 重要ルールに `IMPORTANT:` マーカーを付与
- 内容: コマンド集、アーキテクチャ構成、命名規則、テスト規約、セキュリティ規約、Git 規約、よくある間違いリスト

#### `.claude/rules/backend.md` 作成
- Zod スキーマ定義パターン（CREATE / UPDATE / PATCH の分け方）
- コントローラーの書き方（safeParse, res.locals, next(err)）
- サービス層の書き方（SELECT FOR UPDATE + $transaction(ReadCommitted)）
- AppError の使い方

#### `.claude/rules/frontend.md` 作成
- apiFetch の使い方
- 1ファイル = 1操作のフック設計
- setQueryData vs invalidateQueries の使い分け
- 状態管理の置き場所ルール
- CSS Modules パターン

#### README.md 全面リライト
- Web リサーチに基づくベストプラクティスを適用
- バッジ追加（CI, TypeScript, React, AWS, License）
- 目次の追加
- Mermaid による本番環境アーキテクチャ図・ローカル開発環境図・ER 図
- テスト構成表・セキュリティ対策表・API リファレンス表
- 設計の方針セクション（状態管理ルール、フック設計、疎結合設計、並行アクセス制御）

#### LICENSE ファイル作成
- MIT ライセンスを追加
