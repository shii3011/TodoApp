import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'path';

export class TodoAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // デプロイ時に DATABASE_URL を受け取るパラメータ
    const databaseUrl = new cdk.CfnParameter(this, 'DatabaseUrl', {
      type: 'String',
      description: 'Neon PostgreSQL connection string',
      noEcho: true,
    });

    // ==================== Cognito ====================
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'todo-app-user-pool',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      authFlows: { userSrp: true },
    });

    // ==================== S3 + CloudFront ====================
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      // SPAのルーティング対応（404/403 → index.html）
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    // ==================== Secrets Manager ====================
    // DATABASE_URL・Cognito ID を1つのシークレットにまとめて管理する。
    // Lambda は IAM ロール経由で取得するためアクセスキー不要。
    const appSecret = new secretsmanager.Secret(this, 'AppSecret', {
      secretName: 'todo-app/production',
      description: 'TODOアプリ本番環境のシークレット（DB接続情報・Cognito ID）',
      secretObjectValue: {
        DATABASE_URL: cdk.SecretValue.cfnParameter(databaseUrl),
        COGNITO_USER_POOL_ID: cdk.SecretValue.unsafePlainText(userPool.userPoolId),
        COGNITO_CLIENT_ID: cdk.SecretValue.unsafePlainText(userPoolClient.userPoolClientId),
      },
    });

    // ==================== Lambda ====================
    const backendFn = new lambda.Function(this, 'BackendFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'dist/lambda.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend'), {
        bundling: {
          image: cdk.DockerImage.fromRegistry('public.ecr.aws/docker/library/node:20-slim'),
          command: [
            'bash', '-c',
            [
              'apt-get update -y && apt-get install -y openssl',
              'cp -rL /asset-input/. /asset-output/',
              'rm -f /asset-output/.env /asset-output/.env.*',
              'cd /asset-output',
              'npm ci',
              'npx prisma generate',
              'npm run build',
              'npm prune --omit=dev',
            ].join(' && '),
          ],
          user: 'root',
        },
      }),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        NODE_ENV: 'production',
        // DATABASE_URL・Cognito ID はコールドスタート時に Secrets Manager から取得する。
        // Lambda 環境変数には ARN のみ設定し、シークレット本体を平文で渡さない。
        SECRETS_ARN: appSecret.secretArn,
        ALLOWED_ORIGINS: `https://${distribution.distributionDomainName}`,
      },
    });

    // Lambda が Secrets Manager のシークレットを読み取れるよう権限を付与
    appSecret.grantRead(backendFn);

    // ==================== API Gateway ====================
    const api = new apigateway.LambdaRestApi(this, 'Api', {
      handler: backendFn,
      proxy: true,
      defaultCorsPreflightOptions: {
        allowOrigins: [`https://${distribution.distributionDomainName}`],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // ==================== Outputs ====================
    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'フロントエンド URL',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'バックエンド API URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: siteBucket.bucketName,
      description: 'フロントエンド用 S3 バケット名',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront Distribution ID',
    });

    new cdk.CfnOutput(this, 'SecretArn', {
      value: appSecret.secretArn,
      description: 'Secrets Manager シークレット ARN',
    });
  }
}
