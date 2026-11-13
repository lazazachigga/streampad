// apps/backend/src/routes/me.ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const AttestationBody = z.object({
  mint: z.string().min(1),
  destination: z.string().min(1),
});

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get('/me/fees', async () => ({ claimable: 0, byToken: [] }));
  app.post('/me/claim/attestation', async (req, reply) => {
    const b = AttestationBody.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: b.error.flatten() });
    return { ok: true, mock: true, input: b.data };
  });
}
