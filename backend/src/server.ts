import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';

import config from './config/env';
import connectDB from './config/database';
import { initializeSocket } from './socket/socketManager';
import { globalRateLimiter } from './middleware/rateLimiter';

import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';

const app = express();
const httpServer = createServer(app);

// ── Security Middleware ────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: config.nodeEnv === 'production',
  })
);

app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(mongoSanitize());
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
}

// ── Rate Limiting ──────────────────────────────────────────────────────────────
app.use(globalRateLimiter);

// ── Health Check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
  });
});

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// ── 404 Handler ────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global Error Handler ───────────────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      message:
        config.nodeEnv === 'production' ? 'Internal server error' : err.message,
    });
  }
);

// ── Bootstrap ──────────────────────────────────────────────────────────────────
const bootstrap = async () => {
  await connectDB();
  initializeSocket(httpServer);

  // Render injects PORT=10000 automatically in production
  // 0.0.0.0 binding is required for Render to route traffic correctly
  httpServer.listen(config.port, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on port ${config.port}`);
    console.log(`🌍 Environment: ${config.nodeEnv}`);
    console.log(`🔗 Client URL:  ${config.clientUrl}`);
    console.log(`📡 Socket.io:   enabled\n`);
  });
};

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});

export default app;
