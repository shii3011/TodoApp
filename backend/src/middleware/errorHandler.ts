import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';

export { AppError } from '../lib/errors.js';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }
  // 本番環境ではスタックトレースを隠蔽し、エラー名とメッセージのみログ出力する
  if (process.env.NODE_ENV === 'production') {
    const e = err as Error;
    console.error({ name: e.name, message: e.message });
  } else {
    console.error(err);
  }
  res.status(500).json({ message: 'Internal server error' });
};
