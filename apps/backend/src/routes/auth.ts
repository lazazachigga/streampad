// apps/backend/src/routes/auth.ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const CallbackQuery = z.object({ code: z.string().optional(), state: z.string().optional() });

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.get('/auth/twitch/login', async (_req, reply) => {
    reply.redirect('https://id.twitch.tv/oauth2/authorize?client_id=DEV&response_type=code');
  });
  app.get('/auth/twitch/callback', async (req, reply) => {
    const q = CallbackQuery.safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'bad query' });
    return { ok: true, code: q.data.code ?? null };
  });
  app.get('/auth/kick/login', async (_req, reply) => {
    reply.redirect('https://id.kick.com/oauth/authorize?client_id=DEV&response_type=code');
  });
  app.get('/auth/kick/callback', async (req, reply) => {
    const q = CallbackQuery.safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'bad query' });
    return { ok: true, code: q.data.code ?? null };
  });
}
