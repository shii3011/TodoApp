# TODO App

> タイトル・優先度・期日・タグ・サブタスクを管理できる、AWS フルサーバーレス構成の TODO アプリ

[![CI](https://img.shields.io/github/actions/workflow/status/shii3011/TodoApp/ci.yml?label=CI&logo=githubactions&logoColor=white)](https://github.com/shii3011/TodoApp/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![AWS](https://img.shields.io/badge/AWS-Lambda%20%2B%20CloudFront-FF9900?logo=amazonaws&logoColor=white)](https://aws.amazon.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**デモ URL**: https://d2q20n1g6gr0p3.cloudfront.net/（ログイン不要のゲストモードあり）

---

## 目次

- [機能一覧](#機能一覧)
- [技術スタック](#技術スタック)
- [アーキテクチャ](#アーキテクチャ)
- [ディレクトリ構成](#ディレクトリ構成)
- [ローカル開発環境のセットアップ](#ローカル開発環境のセットアップ)
- [テスト](#テスト)
- [CI/CD セットアップ](#cicd-セットアップ)
- [API リファレンス](#api-リファレンス)
- [設計の方針](#設計の方針)
- [ハマった点・トラブルシューティング](#ハマった点トラブルシューティング)
- [ライセンス](#ライセンス)

---

## 機能一覧

| 機能 | 詳細 |
|------|------|
| **TODO 管理** | タイトル・詳細・優先度（high / medium / low）・期日を設定 |
| **サブタスク** | TODO を階層分割して管理（同一テーブルの自己参照） |
| **タグ** | カラー付きタグで複数プロジェクトを横断管理 |
| **期日アラート** | 期限超過・当日の TODO を視覚的に強調表示 |
| **検索・フィルター** | キーワード検索・完了状態・優先度・タグでの絞り込み |
| **認証** | AWS Cognito によるユーザー認証（JWT） |
| **ゲストモード** | 登録不要で全機能を試せる（データは localStorage に保存） |

### ゲストモードの仕組み

Repository パターンでデータの保存先を抽象化し、認証状態に応じて実装を自動切り替えしています。

```
TodoRepository (interface)
  ├── ApiRepository          ← ログイン時: API 経由で PostgreSQL へ
  └── LocalStorageRepository ← ゲスト時: ブラウザの localStorage へ
```

フックやコンポーネントは保存先を意識せず、`useRepository()` を呼ぶだけで正しい実装が注入されます。

---

## 技術スタック

| 領域 | 採用技術 | 選定理由 |
|------|---------|---------|
| **バックエンド** | Express / TypeScript | `serverless-http` 1 行で Lambda に載せられ、構成の自由度が高い。NestJS はデコレーターベースで小規模構成に過剰 |
| **ORM** | Prisma | スキーマ・マイグレーション・型生成を一元管理。TypeORM はデコレーター依存でスキーマが分散しやすい |
| **バリデーション** | Zod | `z.infer<>` でスキーマから TypeScript 型を自動生成。ランタイム検証と型安全を 1 スキーマで完結 |
| **フロントエンド** | React 19 / Vite | 静的ホスティング（S3 + CloudFront）完結の SPA 要件。Next.js は SSR 不要な構成には過剰 |
| **サーバー状態管理** | TanStack Query | ローディング・エラー・キャッシュ無効化を宣言的に解決。Redux はサーバーデータ管理に不向き |
| **CSS** | CSS Modules | Vite 標準機能でゼロ設定、クラス名衝突をコンパイル時に解消 |
| **認証** | AWS Cognito + aws-jwt-verify | 公式ライブラリで JWT 検証を自前実装せずに完結 |
| **DB** | Neon (PostgreSQL) | サーバーレス PostgreSQL でアイドル時コストゼロ。Prisma の接続文字列変更のみで Aurora 等へ移行可能 |
| **インフラ** | AWS CDK (TypeScript) | バックエンドと同じ TypeScript でインフラを定義。Terraform は HCL という別言語の習得が必要 |
| **ホスティング** | Lambda + API Gateway | リクエスト単位の課金でアイドル時コストゼロ |
| **CDN** | CloudFront + S3 | OAC で S3 への直接アクセスを禁止し CloudFront 経由のみ許可 |

---

## アーキテクチャ

### 本番環境（AWS）

```mermaid
flowchart LR
    Browser(["ブラウザ"])

    subgraph aws ["AWS"]
        direction TB
        CF["CloudFront"]
        S3[("S3")]
        APIGW["API Gateway"]
        Lambda["Lambda\n(Express)"]
        Cognito["Cognito"]
        SSM["SSM Parameter Store"]
        Neon[("Neon\nPostgreSQL")]
    end

    Browser -->|"① SPA を取得"| CF
    CF -->|"静的ファイルを返す"| S3

    Browser -->|"② API 呼び出し\n(Bearer Token)"| APIGW
    APIGW --> Lambda
    Lambda -->|"JWT 検証"| Cognito
    Lambda -->|"DB 接続"| Neon
    Lambda -. "コールドスタート時\nパラメータ取得" .-> SSM
```

### ローカル開発環境（Docker Compose）

```mermaid
flowchart LR
    Browser(["ブラウザ\n(ホストマシン)"])

    subgraph docker ["Docker Compose"]
        direction TB
        FE["frontend コンテナ\nlocalhost:5173\nVite Dev Server"]
        BE["backend コンテナ\nlocalhost:3000\nExpress"]
        DB[("db コンテナ\nPostgreSQL")]
    end

    Browser -->|"① 画面表示"| FE
    Browser -->|"② API 呼び出し"| BE
    BE -->|"SQL"| DB
```

> **E2E テスト時のみ**: `VITE_API_PROXY_TARGET` を設定すると、ブラウザ → Vite → backend の経路に切り替わります（Docker 内部 DNS 解決のため）。

### バックエンドのレイヤー構成

```
routes → controllers → services → repositories → lib/prisma.ts
```

| レイヤー | 責務 |
|---------|------|
| **routes** | エンドポイント定義・ミドルウェア適用 |
| **controllers** | リクエスト受付・Zod バリデーション・レスポンス返却 |
| **services** | ビジネスロジック・業務チェック（Prisma を直接呼ばない） |
| **repositories** | Prisma アクセス・トランザクション・悲観的ロック |

---

## DB スキーマ

```mermaid
erDiagram
    User ||--o{ Todo : "has"
    User ||--o{ Tag  : "has"
    Todo ||--o{ TodoTag : "has"
    Tag  ||--o{ TodoTag : "has"
    Todo |o--o{ Todo : "subtask of"

    User {
        string id PK
        string email
        string name
        datetime createdAt
    }
    Todo {
        string   id        PK
        string   userId    FK
        string   parentId  FK
        string   title
        string   description
        boolean  completed
        enum     priority
        datetime dueDate
        datetime createdAt
    }
    Tag {
        string   id       PK
        string   userId   FK
        string   name
        string   color
        datetime createdAt
    }
    TodoTag {
        string todoId FK
        string tagId  FK
    }
```

---

## ディレクトリ構成

```
TodoApp/
├── backend/
│   ├── src/
│   │   ├── controllers/{todos,tags,users}/  # リクエスト受付・バリデーション
│   │   ├── services/{todos,tags,users}/     # ビジネスロジック
│   │   ├── repositories/{todos,tags,users}/ # Prisma アクセス（interface + 実装）
│   │   ├── routes/                          # エンドポイント定義
│   │   ├── middleware/                      # auth, errorHandler
│   │   ├── schemas/                         # Zod スキーマ
│   │   └── lib/                             # prisma.ts, errors.ts, todoFormat.ts
│   ├── tests/
│   │   ├── unit/                            # スキーマ・サービス層のユニットテスト
│   │   └── integration/                     # HTTP CRUD・並列整合性テスト
│   ├── prisma/
│   │   └── schema.prisma
│   └── config/                              # tsconfig, vitest 設定
│
├── frontend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── todos/   # types.ts + hooks/ + components/
│   │   │   └── tags/    # types.ts + hooks/ + components/
│   │   ├── shared/      # 共通 types, constants, utils, hooks, components
│   │   ├── context/     # ErrorContext, RepositoryContext
│   │   ├── lib/         # api.ts, repositories/（interface + API/localStorage 実装）
│   │   └── components/App/
│   ├── e2e/             # Playwright E2E テスト
│   └── config/          # vite, tsconfig, playwright 設定
│
└── infra/
    └── lib/
        ├── todo-app-stack.ts   # Lambda / CloudFront / S3 / Cognito / WAF
        └── github-oidc-stack.ts # GitHub Actions OIDC ロール
```

---

## ローカル開発環境のセットアップ

### 前提条件

以下をインストールしてください。

| ツール | 確認コマンド | 備考 |
|--------|------------|------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | `docker --version` | Docker Compose v2 を含む |
| [Node.js 20+](https://nodejs.org/) | `node --version` | 型チェック・Infra のみ使用 |
| [Git](https://git-scm.com/) | `git --version` | |

### 起動手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/shii3011/TodoApp.git
cd TodoApp

# 2. 起動（初回はイメージビルドが入るため数分かかります）
docker compose up --build
```

| サービス | URL |
|---------|-----|
| フロントエンド | http://localhost:5173 |
| バックエンド API | http://localhost:3000 |

`.env` ファイルの作成は不要です。ローカル用の環境変数はすべて `docker-compose.yml` で管理しています。

### 環境変数一覧

| 変数名 | 設定場所 | 説明 |
|--------|---------|------|
| `DATABASE_URL` | `docker-compose.yml`（ローカル）/ SSM（本番） | PostgreSQL 接続文字列 |
| `NODE_ENV` | `docker-compose.yml` | `development` / `test` / `production` |
| `ALLOWED_ORIGINS` | `docker-compose.yml` | CORS 許可オリジン（カンマ区切り） |
| `VITE_API_BASE_URL` | CDK 出力から自動設定（本番） | フロントエンドが呼ぶ API Gateway URL |
| `VITE_COGNITO_USER_POOL_ID` | CDK 出力から自動設定（本番） | Cognito ユーザープール ID |
| `VITE_COGNITO_CLIENT_ID` | CDK 出力から自動設定（本番） | Cognito クライアント ID |
| `E2E_EMAIL` | `docker-compose.override.yml` | E2E テスト用 Cognito アカウントのメール |
| `E2E_PASSWORD` | `docker-compose.override.yml` | E2E テスト用 Cognito アカウントのパスワード |

---

## テスト

### テスト構成

| 種別 | ファイル | 内容 | 件数 |
|------|---------|------|------|
| ユニット | `backend/tests/unit/schemas.test.ts` | Zod スキーマの境界値・バリデーション | 72 件 |
| 統合 | `backend/tests/integration/crud.test.ts` | 全エンドポイントの正常系・異常系 | 17 件 |
| 統合 | `backend/tests/integration/concurrent.test.ts` | 50 件並列 PATCH/PUT の整合性検証 | 6 件 |
| E2E | `frontend/e2e/todo.spec.ts` | Playwright による一連フロー | 7 件 |

### 実行コマンド

```bash
# ユニットテスト（サーバー不要）
docker compose run --rm backend-test

# 統合テスト（backend + db を起動してから HTTP リクエストを投げる）
docker compose --profile test run --rm backend-test-integration

# E2E テスト（後述の認証情報設定が必要）
docker compose --profile test run --rm e2e

# フロントエンド 型チェック
cd frontend && npx tsc --noEmit -p config/tsconfig.app.json
```

### E2E テストの認証情報設定

Playwright E2E テストは実際の Cognito アカウントでログインします。プロジェクトルートに `docker-compose.override.yml`（`.gitignore` 対象）を作成し、テスト専用アカウントの認証情報を記入してください。

```yaml
# docker-compose.override.yml
services:
  e2e:
    environment:
      - E2E_EMAIL=your-test-account@example.com
      - E2E_PASSWORD=your-test-password
```

> **注意**: 個人アカウントではなく、テスト専用の Cognito アカウントを使ってください。

### 統合テストで実 DB を使う理由

DB をモックすると「トランザクションが正しく機能するか」「並列書き込みでデータが壊れないか」を検証できません。実際に統合テストの実装中、**モックテストでは絶対に発見できなかった本番バグ**を検出しました。

トランザクション分離レベルを `RepeatableRead` に設定していたところ、`FOR UPDATE` との組み合わせで 50 件並列 PATCH/PUT 時に PostgreSQL が `40001 serialization error` を返し続ける障害を再現。`ReadCommitted` + `FOR UPDATE` の組み合わせが正しい実装であることを統合テストで確認しました。

### CI/CD でのテスト

| ジョブ | トリガー | 内容 |
|--------|---------|------|
| `backend-unit` | PR → main / push → main | ユニットテスト |
| `backend-integration` | PR → main / push → main | 統合テスト |
| `typecheck` | PR → main / push → main | TypeScript 型チェック |
| `deploy` | push → main（上記 3 つ通過後） | CDK デプロイ → S3 アップロード |
| `e2e-test` | deploy 完了後 | 本番 URL に対して Playwright 実行 |

---

## CI/CD セットアップ

このリポジトリをフォークして独自の AWS 環境にデプロイする手順です。

### 前提条件

- AWS アカウント（請求設定済み）
- AWS CLI（`aws --version`）と CDK（`npm install -g aws-cdk`）がインストール済み
- `jq`（`jq --version`）がインストール済み
- [Neon](https://neon.tech/) などの PostgreSQL 接続文字列を取得済み

### Step 1: SSM Parameter Store に DATABASE_URL を登録

CDK は CloudFormation で `SecureString` パラメータを作成できないため、手動で登録します。

```bash
aws ssm put-parameter \
  --name "/todo-app/production/DATABASE_URL" \
  --value "postgresql://user:password@host/db?sslmode=require" \
  --type SecureString \
  --region ap-northeast-1
```

### Step 2: CDK Bootstrap（初回のみ）

```bash
git clone https://github.com/<your-username>/TodoApp.git
cd TodoApp/infra
npm install
npx cdk bootstrap aws://<AWS_ACCOUNT_ID>/ap-northeast-1
```

### Step 3: GitHub Actions 用の IAM ロールを作成

OIDC 認証で長期アクセスキーを使わずにデプロイできるロールを作成します。

```bash
npx cdk deploy GitHubOidcStack
```

デプロイ完了後、出力に表示される `RoleArn` をメモしてください。

```
Outputs:
GitHubOidcStack.RoleArn = arn:aws:iam::123456789012:role/github-actions-deploy
```

### Step 4: GitHub Secrets を設定

リポジトリの **Settings → Secrets and variables → Actions** で以下を登録します。

| シークレット名 | 値 | 説明 |
|---|---|---|
| `AWS_ROLE_ARN` | `arn:aws:iam::xxx:role/github-actions-deploy` | Step 3 で出力された RoleArn |
| `E2E_EMAIL` | `test-account@example.com` | E2E テスト専用 Cognito アカウント |
| `E2E_PASSWORD` | `...` | E2E テスト専用 Cognito アカウントのパスワード |

### Step 5: main に push → 自動デプロイ

GitHub Actions がすべてのテストを通過したあと、以下を自動実行します。

1. CDK で `TodoAppStack`（Lambda / API Gateway / CloudFront / S3 / Cognito / WAF）をデプロイ
2. CDK 出力（API URL / Cognito ID など）を参照してフロントエンドをビルド
3. S3 にアップロード → CloudFront キャッシュ無効化
4. 本番 URL に対して Playwright E2E テストを実行

### Step 6: Prisma マイグレーションを本番 DB に適用（初回のみ）

CDK デプロイはアプリコードを Lambda に載せるだけで、DB マイグレーションは自動実行されません。初回デプロイ後に手元から実行してください。

```bash
DATABASE_URL="postgresql://user:password@host/db?sslmode=require" \
  npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

### Step 7: E2E テスト用 Cognito ユーザーを作成

```bash
# ユーザープール ID は CDK デプロイ後の出力または AWS コンソールで確認
aws cognito-idp admin-create-user \
  --user-pool-id <USER_POOL_ID> \
  --username test-account@example.com \
  --temporary-password "Temp@1234" \
  --user-attributes Name=email,Value=test-account@example.com Name=email_verified,Value=true \
  --region ap-northeast-1

# パスワードを永続化（一時パスワードのままだとログインできない）
aws cognito-idp admin-set-user-password \
  --user-pool-id <USER_POOL_ID> \
  --username test-account@example.com \
  --password "YourStrongPassword123!" \
  --permanent \
  --region ap-northeast-1
```

---

## セキュリティ

| 対策 | 実装方法 |
|------|---------|
| **シークレット管理** | `DATABASE_URL` は SSM Parameter Store の SecureString（KMS 暗号化）で管理 |
| **認証** | `aws-jwt-verify` で Cognito JWT の署名・有効期限・発行元を検証 |
| **レートリミット（アプリ）** | IP ベース（200 req/15 分）+ ユーザー ID ベース（100 req/15 分）の二重防護 |
| **レートリミット（API GW）** | バースト 50 req / 秒間 20 req でスロットリング |
| **WAF** | AWS マネージドルール（Common・KnownBadInputs）で SQLi / XSS をブロック |
| **アクセスログ** | API Gateway のアクセスログを CloudWatch に 1 ヶ月保持 |
| **セキュリティヘッダー** | `helmet` で CSP・X-Frame-Options・HSTS 等を自動設定 |
| **入力バリデーション** | 全エンドポイントで Zod スキーマを通過させてからサービス層へ |
| **CORS** | `ALLOWED_ORIGINS` 環境変数で許可オリジンを明示管理 |
| **GitHub Actions** | OIDC 認証で長期アクセスキーを排除。main ブランチのみ Assume 可 |
| **DDoS 保護** | AWS Shield Standard（L3/L4）が自動適用 |

---

## API リファレンス

全エンドポイントで `Authorization: Bearer <Cognito アクセストークン>` が必須です（`/health` を除く）。

| メソッド | パス | 説明 |
|---------|------|------|
| `PUT` | `/users/me` | ログイン後のユーザー情報 upsert |
| `GET` | `/todos` | TODO 一覧取得 |
| `POST` | `/todos` | TODO 作成（`parentId` を指定するとサブタスクになる） |
| `PUT` | `/todos/:id` | TODO 全体更新（悲観的ロック） |
| `PATCH` | `/todos/:id` | TODO 部分更新（悲観的ロック） |
| `DELETE` | `/todos/:id` | TODO 削除（悲観的ロック） |
| `GET` | `/tags` | タグ一覧取得 |
| `POST` | `/tags` | タグ作成 |
| `DELETE` | `/tags/:id` | タグ削除 |

| ステータス | 説明 |
|-----------|------|
| `400` | バリデーションエラー |
| `401` | 認証トークンが未指定または無効 |
| `404` | リソースが存在しない、または他ユーザーのリソース（存在を推測させない） |

---

## 設計の方針

### Repository パターンと DI によるテスタビリティ

サービス層は Prisma に直接依存せず、Repository インターフェース経由でアクセスします。`createXxxService(repo)` ファクトリ関数で依存を注入するため、テスト時はモックリポジトリに差し替え可能です。

```typescript
// テスト: DB なしでサービス層をテスト
const mockRepo = { findById: vi.fn().mockResolvedValue(null) }
const service = createTodosService(mockRepo, makeTagsRepo())
await expect(service.getTodo('missing', 'user-1')).rejects.toMatchObject({ statusCode: 404 })
```

### 状態管理の 3 ルール

| 状態の種類 | 置き場所 |
|-----------|---------|
| サーバーデータ（todos, tags） | TanStack Query |
| 複数コンポーネントにまたがる UI 状態（エラーメッセージ等） | React Context |
| 単一コンポーネント内の UI 状態（フォーム値、開閉フラグ） | `useState` |

### TanStack Query のキャッシュ戦略

| ケース | 方法 | 理由 |
|--------|------|------|
| 自ドメインの変更（TODO を追加・更新・削除） | `setQueryData` でキャッシュを直接書き換え | API 再フェッチなしで UI が即時更新される |
| 他ドメインへの副作用（タグ削除 → todos のタグが変わる） | `invalidateQueries` で再フェッチ | クロスドメインのキャッシュ直接操作を避ける |

Lambda のコールドスタートが発生しても、既存データの表示には遅延が出ない設計になっています。

### 並行アクセス制御

書き込み操作（PUT / PATCH / DELETE）は `SELECT FOR UPDATE` + `$transaction(ReadCommitted)` による悲観的ロックで整合性を担保しています。これにより 50 件の並列リクエストが発生してもデータが破壊されません。

---

## ハマった点・トラブルシューティング

Lambda + CI/CD の構築で実際に詰まった問題と解決策です。

---

### 1. `res.setTimeout` が Lambda でクラッシュする

**症状**: Lambda 呼び出しが `TypeError: this.socket.setTimeout is not a function` で 500 エラー。

**原因**: `serverless-http` が生成するモックソケットには `setTimeout` が実装されていない。Express の `res.setTimeout()` はリアルソケットを前提とするため Lambda 上では使えない。

**解決策**: タイムアウト設定ミドルウェアを削除。Lambda 自体の関数タイムアウト（30 秒）に委ねる。

---

### 2. `serverless-http` + Express v5 で `req.body` が Buffer のままになる

**症状**: POST/PUT のボディが正しく届いているのに Zod バリデーションが `"expected string, received undefined"` で 400 を返す。

**原因**: `serverless-http` v3 は Lambda の `event.body` を `Buffer` オブジェクトとして `req.body` に直接セットする。`express.json()` は「ボディが既にある」と判断してパースをスキップするため、Zod には空の Buffer が渡される。

**解決策**: `express.json()` の前に Buffer を JSON にパースするミドルウェアを追加。

```typescript
app.use((req, _res, next) => {
  if (Buffer.isBuffer(req.body)) {
    try { req.body = JSON.parse(req.body.toString('utf8')); }
    catch { req.body = {}; }
    next();
  } else {
    express.json({ limit: '10kb' })(req, _res, next);
  }
});
```

---

### 3. Cognito アクセストークンに `email` クレームが存在しない

**症状**: `PUT /users/me` が `"expected string, received undefined"` で 400。フロントエンドで `fetchUserAttributes()` の `attrs.email` が undefined になる。

**原因**: Cognito のアクセストークンはユーザー識別（`sub` 等）のみを含み、`email` クレームを持たない。`email` が含まれるのは ID トークンのみ。

**解決策**: `fetchAuthSession()` の ID トークンペイロードから email を取得。

```typescript
const [attrs, session] = await Promise.all([fetchUserAttributes(), fetchAuthSession()])
const email =
  attrs.email ??
  (session.tokens?.idToken?.payload?.email as string | undefined) ??
  user?.signInDetails?.loginId ?? ''
```

---

### 4. API Gateway 経由で `trust proxy` 設定が必要

**症状**: Lambda ログに `ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false` が出て `express-rate-limit` が機能しない。

**原因**: API Gateway はリクエストに `X-Forwarded-For` を付与するが、Express のデフォルト設定はリバースプロキシを信頼しない。

**解決策**: `app.set('trust proxy', 1)` を追加。

---

### 5. RepeatableRead + FOR UPDATE で PostgreSQL がシリアライゼーションエラーを返し続ける

**症状**: 50 件並列 PATCH テストで `40001 could not serialize access due to concurrent update` が多発。

**原因**: `RepeatableRead` は読み取り開始時点のスナップショットを維持するため、他トランザクションが更新した行への `FOR UPDATE` ロック取得時に競合が発生する。

**解決策**: 分離レベルを `ReadCommitted` に変更。`FOR UPDATE` で行をロックしてから最新値を読み取る構成に変更することで競合を排除。

---

### 6. SSM パラメータがコールドスタート時にキャッシュされる

**症状**: SSM に `DATABASE_URL` を登録したのに Lambda が `Environment variable not found: DATABASE_URL` で起動失敗し続ける。

**原因**: Lambda はウォームコンテナを使い回す。`loadSecrets()` はコールドスタート時にのみ実行されるため、SSM 登録前に起動したコンテナはパラメータなしのまま動き続ける。

**解決策**: コードに任意の変更を加えて push し、Lambda を強制的に再デプロイ（新しいコールドスタートをトリガー）。

---

### 7. E2E テストで `PUT /users/me` より先に TODO 作成が実行され外部キー制約エラー

**症状**: E2E テストでログイン後すぐに TODO を作成しようとすると `Foreign key constraint failed`。

**原因**: `App.tsx` の `syncUser()` は `void` で fire-and-forget。auth.setup がセッションを保存した時点で、ユーザーがまだ DB に登録されていない場合がある。

**解決策**: auth.setup で `PUT /users/me` のレスポンスを `Sign in` クリック前に `waitForResponse` で待ち受け、完了後にセッションを保存。

```typescript
// Sign in クリック前に待ち受けを開始（クリック後だとレスポンスを逃す）
const usersMeResponse = page.waitForResponse(
  resp => resp.url().includes('/users/me') && resp.request().method() === 'PUT',
  { timeout: 30_000 },
)
await page.getByRole('button', { name: 'Sign in' }).click()
await expect(logoutBtn).toBeVisible({ timeout: 15_000 })
await usersMeResponse
await page.context().storageState({ path: SESSION_FILE })
```

---

## ライセンス

[MIT](LICENSE)
