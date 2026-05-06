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

// API Gateway / CloudFront からのリバースプロキシを信頼する
app.set('trust proxy', 1);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
// serverless-http が req.body を Buffer としてセットする場合に JSON へパースする
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse((req.body as Buffer).toString('utf8'));
    } catch {
      req.body = {};
    }
    next();
  } else {
    express.json({ limit: '10kb' })(req, _res, next);
  }
});

// 全ルートに認証を適用
app.use(authMiddleware);

// ユーザーIDベースのレートリミット（WAFで対応できないユーザー単位の制限をアプリ層で補う）
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
