import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { Request, Response, NextFunction } from 'express';

// AWS_LAMBDA_FUNCTION_NAME は Lambda ランタイムが自動設定する環境変数。
// Lambda 上では NODE_ENV の値に関わらず必ずテスト認証バイパスを無効化する。
const isTest = process.env.NODE_ENV === 'test' && !process.env.AWS_LAMBDA_FUNCTION_NAME;

const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID;
if (!isTest && (!userPoolId || !clientId)) {
  throw new Error('COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set');
}

// テスト環境以外では Cognito 検証器を初期化する
const verifier = !isTest && userPoolId && clientId
  ? CognitoJwtVerifier.create({ userPoolId, tokenUse: 'access', clientId })
  : null;

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // NODE_ENV=test のとき: X-Test-User-Id ヘッダーを userId として使用（Cognito 不要）
  if (isTest) {
    res.locals['userId'] = req.headers['x-test-user-id'] ?? 'test-user-id';
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = await verifier!.verify(token);
    res.locals['userId'] = payload.sub;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};
