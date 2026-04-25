#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CDK_DIR="$ROOT_DIR/infra"
FRONTEND_DIR="$ROOT_DIR/frontend"
STACK_NAME="TodoAppStack"

# ==================== 事前チェック ====================
command -v aws >/dev/null 2>&1 || { echo "aws CLI が必要です: https://aws.amazon.com/cli/"; exit 1; }
command -v jq  >/dev/null 2>&1 || { echo "jq が必要です: brew install jq"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js が必要です"; exit 1; }

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL 環境変数を設定してください"
  echo "例: export DATABASE_URL='postgresql://...'"
  exit 1
fi

# ==================== CDK デプロイ ====================
echo ">>> CDK パッケージをインストール中..."
cd "$CDK_DIR"
npm install

echo ">>> CDK ブートストラップ (初回のみ必要)..."
npx cdk bootstrap || true

echo ">>> CDK デプロイ中 (Lambdaビルドに数分かかります)..."
npx cdk deploy \
  --parameters DatabaseUrl="$DATABASE_URL" \
  --require-approval never \
  --outputs-file "$ROOT_DIR/cdk-outputs.json"

# ==================== 出力値を取得 ====================
echo ">>> デプロイ出力を取得中..."
OUTPUTS=$(jq -r ".[\"$STACK_NAME\"]" "$ROOT_DIR/cdk-outputs.json")

CLOUDFRONT_URL=$(echo "$OUTPUTS" | jq -r '.CloudFrontUrl')
API_URL=$(echo "$OUTPUTS" | jq -r '.ApiUrl')
USER_POOL_ID=$(echo "$OUTPUTS" | jq -r '.UserPoolId')
USER_POOL_CLIENT_ID=$(echo "$OUTPUTS" | jq -r '.UserPoolClientId')
BUCKET_NAME=$(echo "$OUTPUTS" | jq -r '.S3BucketName')
DISTRIBUTION_ID=$(echo "$OUTPUTS" | jq -r '.DistributionId')

echo "CloudFront URL      : $CLOUDFRONT_URL"
echo "API URL             : $API_URL"
echo "User Pool ID        : $USER_POOL_ID"
echo "User Pool Client ID : $USER_POOL_CLIENT_ID"

# ==================== フロントエンドビルド ====================
echo ">>> フロントエンドをビルド中..."
cd "$FRONTEND_DIR"
npm install

VITE_API_BASE_URL="$API_URL" \
VITE_COGNITO_USER_POOL_ID="$USER_POOL_ID" \
VITE_COGNITO_CLIENT_ID="$USER_POOL_CLIENT_ID" \
npm run build

# ==================== S3 にアップロード ====================
echo ">>> S3 にアップロード中..."
aws s3 sync dist/ "s3://$BUCKET_NAME" --delete

# ==================== CloudFront キャッシュ削除 ====================
echo ">>> CloudFront キャッシュを削除中..."
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text

echo ""
echo "=============================="
echo "デプロイ完了!"
echo "URL: $CLOUDFRONT_URL"
echo "=============================="
