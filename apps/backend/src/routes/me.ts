// apps/backend/src/routes/me.ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const AttestationBody = z.object({
  mint: z.string().min(1),
  destination: z.string().min(1),
});

// Helper to extract session from cookie
function getSession(req: any): { provider: string; userId: string; login: string } | null {
  try {
    const session = req.cookies?.session;
    if (!session) return null;
    return JSON.parse(session);
  } catch {
    return null;
  }
}

export async function meRoutes(app: FastifyInstance): Promise<void> {
  // Check current session
  app.get('/me', async (req, reply) => {
    const session = getSession(req);
    if (!session) return reply.code(401).send({ error: 'not authenticated' });
    return { ok: true, ...session };
  });

  // Logout
  app.post('/auth/logout', async (req, reply) => {
    reply.clearCookie('session', { path: '/' });
    return { ok: true };
  });

  app.get('/me/fees', async (req, reply) => {
    const session = getSession(req);
    if (!session) return reply.code(401).send({ error: 'not authenticated' });
    return { claimable: 0, byToken: [] };
  });

  app.post('/me/claim/attestation', async (req, reply) => {
    const session = getSession(req);
    if (!session) return reply.code(401).send({ error: 'not authenticated' });
    const b = AttestationBody.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: b.error.flatten() });
    return { ok: true, mock: true, input: b.data };
  });
}
