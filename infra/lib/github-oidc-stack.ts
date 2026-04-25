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
            // CloudFormation（スタックのデプロイ・更新・削除）
            new iam.PolicyStatement({
              actions: ['cloudformation:*'],
              resources: ['*'],
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
            // Secrets Manager
            new iam.PolicyStatement({
              actions: ['secretsmanager:*'],
              resources: ['*'],
            }),
            // IAM（Lambda 実行ロールの作成・管理）
            new iam.PolicyStatement({
              actions: [
                'iam:CreateRole', 'iam:DeleteRole', 'iam:GetRole', 'iam:PassRole',
                'iam:AttachRolePolicy', 'iam:DetachRolePolicy',
                'iam:PutRolePolicy', 'iam:DeleteRolePolicy',
                'iam:GetRolePolicy', 'iam:ListRolePolicies',
                'iam:ListAttachedRolePolicies', 'iam:UpdateAssumeRolePolicy',
                'iam:TagRole', 'iam:UntagRole',
              ],
              resources: ['*'],
            }),
            // CloudWatch Logs（Lambda ログ）
            new iam.PolicyStatement({
              actions: ['logs:*'],
              resources: ['*'],
            }),
            // SSM（CDK ブートストラップパラメータ + Parameter Store 管理）
            new iam.PolicyStatement({
              actions: [
                'ssm:GetParameter', 'ssm:GetParameters', 'ssm:GetParametersByPath',
                'ssm:PutParameter', 'ssm:DeleteParameter',
                'ssm:AddTagsToResource', 'ssm:ListTagsForResource',
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
