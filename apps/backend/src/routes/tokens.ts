// apps/backend/src/routes/tokens.ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const LaunchBody = z.object({
  name: z.string().min(1).max(32),
  symbol: z.string().min(1).max(10),
  description: z.string().max(500).optional(),
  imageUri: z.string().url().optional(),
});

export async function tokenRoutes(app: FastifyInstance): Promise<void> {
  app.post('/tokens/launch', async (req, reply) => {
    const b = LaunchBody.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: b.error.flatten() });
    return { ok: true, mock: true, input: b.data };
  });
  app.get('/tokens', async () => ({ tokens: [] }));
  app.get('/tokens/:mint', async (req) => {
    const { mint } = req.params as { mint: string };
    return { mint };
  });
}
