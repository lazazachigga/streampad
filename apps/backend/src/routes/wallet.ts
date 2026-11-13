// apps/backend/src/routes/wallet.ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const ProvisionBody = z.object({ identity: z.string().min(1) });
const LinkBody = z.object({ wallet: z.string().min(1), signature: z.string().min(1) });

export async function walletRoutes(app: FastifyInstance): Promise<void> {
  app.post('/wallet/provision', async (req, reply) => {
    const b = ProvisionBody.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: b.error.flatten() });
    return { ok: true, mock: true, identity: b.data.identity };
  });
  app.post('/wallet/link', async (req, reply) => {
    const b = LinkBody.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: b.error.flatten() });
    return { ok: true, mock: true };
  });
}
