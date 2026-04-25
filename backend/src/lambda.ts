import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import serverless from 'serverless-http';
import type { Handler } from 'aws-lambda';

// コールドスタートごとに1回だけ初期化する
let cachedHandler: ReturnType<typeof serverless> | null = null;

/**
 * AWS Secrets Manager からシークレットを取得して process.env にセットする。
 * SECRETS_ARN が未設定（ローカル開発など）の場合は何もしない。
 */
async function loadSecrets(): Promise<void> {
  const secretArn = process.env.SECRETS_ARN;
  if (!secretArn) return;

  const client = new SecretsManagerClient({});
  const { SecretString } = await client.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );
  if (!SecretString) return;

  const secrets = JSON.parse(SecretString) as Record<string, string>;
  for (const [key, value] of Object.entries(secrets)) {
    process.env[key] = value;
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
