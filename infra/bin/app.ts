import * as cdk from 'aws-cdk-lib';
import { TodoAppStack } from '../lib/todo-app-stack';
import { GitHubOidcStack } from '../lib/github-oidc-stack';

const app = new cdk.App();

new TodoAppStack(app, 'TodoAppStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1',
  },
});

// GitHub Actions OIDC ロール（初回のみ手動デプロイ: npx cdk deploy GitHubOidcStack）
new GitHubOidcStack(app, 'GitHubOidcStack', {
  githubOrg: 'YOUR_GITHUB_USERNAME',   // ← 自分の GitHub ユーザー名に変更
  githubRepo: 'TodoApp',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1',
  },
});
