import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm';
import serverless from 'serverless-http';
import type { Handler } from 'aws-lambda';

// コールドスタートごとに1回だけ初期化する（SSM からシークレットを取得後に app を import）
let cachedHandler: ReturnType<typeof serverless> | null = null;

/**
 * AWS Systems Manager Parameter Store からパラメータを取得して process.env にセットする。
 * SSM_PARAM_PATH が未設定（ローカル開発など）の場合は何もしない。
 */
async function loadSecrets(): Promise<void> {
  const paramPath = process.env.SSM_PARAM_PATH;
  if (!paramPath) return;

  const names = [
    `${paramPath}/DATABASE_URL`,
    `${paramPath}/COGNITO_USER_POOL_ID`,
    `${paramPath}/COGNITO_CLIENT_ID`,
  ];

  const client = new SSMClient({});
  const { Parameters } = await client.send(
    new GetParametersCommand({ Names: names, WithDecryption: true }),
  );
  if (!Parameters) return;

  for (const { Name, Value } of Parameters) {
    if (!Name || !Value) continue;
    // "/todo-app/production/DATABASE_URL" → "DATABASE_URL"
    const key = Name.split('/').pop()!;
    process.env[key] = Value;
  }
}

/**
 * Lambda ハンドラー。
 * 初回呼び出し（コールドスタート）時にシークレットを取得してから
 * app を動的インポートする。これにより auth.ts が正しい環境変数を読める。
 */
export const handler: Handler = async (event, context) => {
  if (!cachedHandler) {
    await loadSecrets();

    // シークレットを process.env にセットした後に app を import する
    const { app, prisma } = await import('./app.js');

    // Lambda コンテナ終了時に DB 接続を安全に切断
    process.on('SIGTERM', async () => {
      await prisma.$disconnect();
    });

    cachedHandler = serverless(app);
  }

  return cachedHandler(event as Parameters<Handler>[0], context);
};
