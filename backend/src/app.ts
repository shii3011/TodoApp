import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import usersRouter from './routes/users.js';
import todosRouter from './routes/todos.js';
import tagsRouter from './routes/tags.js';

export { prisma } from './lib/prisma.js';

export const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '10kb' }));
if (process.env.NODE_ENV === 'production') {
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Too many requests, please try again later' },
    }),
  );
}

// リクエストタイムアウト（10秒）
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setTimeout(10_000, () => {
    res.status(503).json({ message: 'Request timeout' });
  });
  next();
});

// ヘルスチェック（認証不要）
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// 全ルートに認証を適用
app.use(authMiddleware);

// 認証済みユーザーごとのレートリミット（IP ベースの制限と二重防護）
if (process.env.NODE_ENV === 'production') {
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      keyGenerator: (_req, res) => res.locals['userId'] as string,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Too many requests, please try again later' },
    }),
  );
}

app.use('/users', usersRouter);
app.use('/todos', todosRouter);
app.use('/tags', tagsRouter);

app.use(errorHandler);
