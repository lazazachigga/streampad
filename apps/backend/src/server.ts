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

const app = Fastify({ logger: true });

await app.register(helmet);
await app.register(cors, { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true });
await app.register(cookie, { secret: process.env.COOKIE_SECRET ?? 'dev-cookie-secret-change-me' });
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

app.get('/health', async () => ({ status: 'ok' }));
app.get('/metrics', async () => ({
  uptime: process.uptime(),
  memory: process.memoryUsage(),
  timestamp: new Date().toISOString(),
}));
app.get('/transparency', async () => ({ protocolFeesReceived: 0, buybacks: [] }));
app.get('/stats', async () => ({
  totalFeesDistributed: 0,
  tokensLaunched: 0,
  activeStreamers: 0,
  volume24h: 0,
  claimsCount: 0,
}));
app.get('/activity', async () => ({ events: [] }));
app.get('/reels', async () => ({ reels: [] }));
app.post('/waitlist', async (req, reply) => {
  const body = req.body as { email?: string; consent?: boolean; honeypot?: string };
  if (body.honeypot) return reply.code(400).send({ error: 'bot detected' });
  if (!body.email || !body.consent) return reply.code(400).send({ error: 'email and consent required' });
  return { ok: true };
});

await app.register(authRoutes);
await app.register(walletRoutes);
await app.register(tokenRoutes);
await app.register(meRoutes);

const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: '0.0.0.0' });
app.log.info(`backend listening on ${port}`);
