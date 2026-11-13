// apps/backend/src/server.ts
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';

const app = Fastify({ logger: true });

await app.register(helmet);
await app.register(cors, { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true });
await app.register(cookie, { secret: process.env.COOKIE_SECRET ?? 'dev-cookie-secret-change-me' });
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

// Health
app.get('/health', async () => ({ status: 'ok' }));

// Auth routes (stubs)
app.get('/auth/twitch/login', async (_req, reply) => {
  reply.redirect('https://id.twitch.tv/oauth2/authorize?client_id=DEV&response_type=code');
});
app.get('/auth/twitch/callback', async (req) => {
  const { code } = req.query as { code?: string };
  return { ok: true, code: code ?? null };
});
app.get('/auth/kick/login', async (_req, reply) => {
  reply.redirect('https://id.kick.com/oauth/authorize?client_id=DEV&response_type=code');
});
app.get('/auth/kick/callback', async (req) => {
  const { code } = req.query as { code?: string };
  return { ok: true, code: code ?? null };
});

// Wallet
app.post('/wallet/provision', async () => ({ ok: true, mock: true }));
app.post('/wallet/link', async () => ({ ok: true, mock: true }));

// Tokens
app.post('/tokens/launch', async () => ({ ok: true, mock: true }));
app.get('/tokens', async () => ({ tokens: [] }));
app.get('/tokens/:mint', async (req) => {
  const { mint } = req.params as { mint: string };
  return { mint };
});

// Me
app.get('/me/fees', async () => ({ claimable: 0, byToken: [] }));
app.post('/me/claim/attestation', async () => ({ ok: true, mock: true }));

// Transparency
app.get('/transparency', async () => ({ protocolFeesReceived: 0, buybacks: [] }));

const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: '0.0.0.0' });
app.log.info(`backend listening on ${port}`);
