// apps/backend/src/server.ts
import 'dotenv/config';
import { validateEnv } from './lib/env.js';
validateEnv();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { authRoutes } from './routes/auth.js';
import { walletRoutes } from './routes/wallet.js';
import { tokenRoutes } from './routes/tokens.js';
import { meRoutes } from './routes/me.js';

const app = Fastify({ logger: true, bodyLimit: 1024 * 1024 }); // 1MB max body

// Security headers
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.WEB_ORIGIN ?? 'http://localhost:3000'],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
});

// CORS strict — only allow configured origins
const allowedOrigins = [
  process.env.WEB_ORIGIN ?? 'http://localhost:3000',
  'https://streampad.wtf',
].filter(Boolean);

await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

// Secure cookies
await app.register(cookie, {
  secret: process.env.COOKIE_SECRET ?? 'dev-cookie-secret-change-me-in-prod',
  parseOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
});

// Rate limiting
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.ip,
});

// Health check
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Metrics
app.get('/metrics', async () => ({
  uptime: process.uptime(),
  memory: process.memoryUsage(),
  timestamp: new Date().toISOString(),
}));

// Transparency
app.get('/transparency', async () => ({ protocolFeesReceived: 0, buybacks: [] }));

// Stats
app.get('/stats', async () => ({
  totalFeesDistributed: 0,
  tokensLaunched: 0,
  activeStreamers: 0,
  volume24h: 0,
  claimsCount: 0,
}));

// Activity feed
app.get('/activity', async () => ({ events: [] }));

// Reels
app.get('/reels', async () => ({ reels: [] }));

// Waitlist with validation
app.post('/waitlist', async (req, reply) => {
  const body = req.body as { email?: string; consent?: boolean; honeypot?: string };
  if (body.honeypot) return reply.code(400).send({ error: 'bot detected' });
  if (!body.email || !body.consent) return reply.code(400).send({ error: 'email and consent required' });
  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return reply.code(400).send({ error: 'invalid email' });
  }
  return { ok: true };
});

// Register routes
await app.register(authRoutes);
await app.register(walletRoutes);
await app.register(tokenRoutes);
await app.register(meRoutes);

// Global error handler — ne pas fuiter les détails internes
app.setErrorHandler((error, _req, reply) => {
  app.log.error(error);
  const statusCode = error.statusCode ?? 500;
  reply.code(statusCode).send({
    error: statusCode >= 500 ? 'Internal server error' : error.message,
  });
});

// 404 handler
app.setNotFoundHandler((_req, reply) => {
  reply.code(404).send({ error: 'Not found' });
});

const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: '0.0.0.0' });
app.log.info(`backend listening on ${port}`);
