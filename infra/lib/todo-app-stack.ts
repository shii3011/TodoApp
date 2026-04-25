import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import * as path from 'path';

export class TodoAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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

    // ==================== SSM Parameter Store ====================
    // DATABASE_URL は手動で SecureString として作成済み（CFn は SecureString 作成不可）。
    // Cognito ID は機密度が低いため String で CDK から作成する。
    const SSM_PATH = '/todo-app/production';

    const dbUrlParam = ssm.StringParameter.fromSecureStringParameterAttributes(
      this, 'DbUrlParam', { parameterName: `${SSM_PATH}/DATABASE_URL` },
    );

    const userPoolIdParam = new ssm.StringParameter(this, 'UserPoolIdParam', {
      parameterName: `${SSM_PATH}/COGNITO_USER_POOL_ID`,
      stringValue: userPool.userPoolId,
    });

    const clientIdParam = new ssm.StringParameter(this, 'ClientIdParam', {
      parameterName: `${SSM_PATH}/COGNITO_CLIENT_ID`,
      stringValue: userPoolClient.userPoolClientId,
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
        // DATABASE_URL・Cognito ID はコールドスタート時に SSM Parameter Store から取得する。
        SSM_PARAM_PATH: SSM_PATH,
        ALLOWED_ORIGINS: `https://${distribution.distributionDomainName}`,
      },
    });

    // Lambda が SSM パラメータを読み取れるよう権限を付与
    dbUrlParam.grantRead(backendFn);
    userPoolIdParam.grantRead(backendFn);
    clientIdParam.grantRead(backendFn);

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

    new cdk.CfnOutput(this, 'SsmParamPath', {
      value: SSM_PATH,
      description: 'SSM Parameter Store パス',
    });
  }
}
