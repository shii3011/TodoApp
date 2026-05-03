import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface Props extends cdk.StackProps {
  githubOrg: string;
  githubRepo: string;
}

/**
 * GitHub Actions が OIDC で AWS に認証するための IAM ロールを作成するスタック。
 * 長期的な AWS アクセスキーを GitHub Secrets に保存せずに済む。
 *
 * デプロイ方法（初回のみ手動で一度実行）:
 *   cd infra && npx cdk deploy GitHubOidcStack
 *
 * 出力される RoleArn を GitHub Secrets の AWS_ROLE_ARN に設定する。
 */
export class GitHubOidcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    // GitHub の OIDC プロバイダー（AWS アカウント内で1つだけ作成）
    const provider = new iam.OpenIdConnectProvider(this, 'GitHubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    // main ブランチからのみ Assume できるロール
    const role = new iam.Role(this, 'GitHubActionsDeployRole', {
      roleName: 'github-actions-deploy',
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
        StringLike: {
          // main ブランチの push のみ許可
          'token.actions.githubusercontent.com:sub':
            `repo:${props.githubOrg}/${props.githubRepo}:ref:refs/heads/main`,
        },
      }),
      description: 'GitHub Actions deployment role via OIDC (no long-lived credentials)',
      maxSessionDuration: cdk.Duration.hours(1),
      inlinePolicies: {
        CdkDeployPolicy: new iam.PolicyDocument({
          statements: [
            // CloudFormation（アプリスタックと CDK ブートストラップのみ）
            new iam.PolicyStatement({
              actions: ['cloudformation:*'],
              resources: [
                `arn:aws:cloudformation:*:${cdk.Aws.ACCOUNT_ID}:stack/TodoApp*/*`,
                `arn:aws:cloudformation:*:${cdk.Aws.ACCOUNT_ID}:stack/GitHubOidc*/*`,
                `arn:aws:cloudformation:*:${cdk.Aws.ACCOUNT_ID}:stack/CDKToolkit/*`,
              ],
            }),
            // CDK ブートストラップ用（S3 アセットバケット・ECR）
            new iam.PolicyStatement({
              actions: ['s3:*', 'ecr:*'],
              resources: ['*'],
            }),
            // Lambda・API Gateway
            new iam.PolicyStatement({
              actions: ['lambda:*', 'apigateway:*'],
              resources: ['*'],
            }),
            // CloudFront・S3 静的ホスティング
            new iam.PolicyStatement({
              actions: ['cloudfront:*'],
              resources: ['*'],
            }),
            // Cognito
            new iam.PolicyStatement({
              actions: ['cognito-idp:*'],
              resources: ['*'],
            }),
            // IAM（CDK が作成する Lambda 実行ロール・CDK ブートストラップロールのみ）
            new iam.PolicyStatement({
              actions: [
                'iam:CreateRole', 'iam:DeleteRole', 'iam:GetRole', 'iam:PassRole',
                'iam:AttachRolePolicy', 'iam:DetachRolePolicy',
                'iam:PutRolePolicy', 'iam:DeleteRolePolicy',
                'iam:GetRolePolicy', 'iam:ListRolePolicies',
                'iam:ListAttachedRolePolicies', 'iam:UpdateAssumeRolePolicy',
                'iam:TagRole', 'iam:UntagRole',
              ],
              resources: [
                `arn:aws:iam::${cdk.Aws.ACCOUNT_ID}:role/TodoApp*`,
                `arn:aws:iam::${cdk.Aws.ACCOUNT_ID}:role/GitHubOidc*`,
                `arn:aws:iam::${cdk.Aws.ACCOUNT_ID}:role/cdk-*`,
                `arn:aws:iam::${cdk.Aws.ACCOUNT_ID}:role/github-actions-deploy`,
              ],
            }),
            // CloudWatch Logs（Lambda ログ・API Gateway アクセスログ）
            new iam.PolicyStatement({
              actions: ['logs:*'],
              resources: [
                `arn:aws:logs:*:${cdk.Aws.ACCOUNT_ID}:log-group:TodoApp*`,
                `arn:aws:logs:*:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/lambda/TodoApp*`,
                `arn:aws:logs:*:${cdk.Aws.ACCOUNT_ID}:log-group::log-stream:*`,
              ],
            }),
            // SSM（CDK ブートストラップパラメータ + アプリ用 Parameter Store）
            new iam.PolicyStatement({
              actions: [
                'ssm:GetParameter', 'ssm:GetParameters', 'ssm:GetParametersByPath',
                'ssm:PutParameter', 'ssm:DeleteParameter',
                'ssm:AddTagsToResource', 'ssm:ListTagsForResource',
              ],
              resources: [
                `arn:aws:ssm:*:${cdk.Aws.ACCOUNT_ID}:parameter/cdk-bootstrap/*`,
                `arn:aws:ssm:*:${cdk.Aws.ACCOUNT_ID}:parameter/todo-app/*`,
              ],
            }),
            // ECR Public（CDK の Lambda バンドル時に node:20-slim を pull するために必要）
            new iam.PolicyStatement({
              actions: [
                'ecr-public:GetAuthorizationToken',
                'sts:GetServiceBearerToken',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    new cdk.CfnOutput(this, 'RoleArn', {
      value: role.roleArn,
      description: 'GitHub Secrets の AWS_ROLE_ARN に設定する',
    });
  }
}
