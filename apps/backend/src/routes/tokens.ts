// apps/backend/src/routes/tokens.ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const LaunchBody = z.object({
  name: z.string().min(1).max(32),
  symbol: z.string().min(1).max(10),
  description: z.string().max(500).optional(),
  imageUri: z.string().url().optional(),
  creator: z.string().min(1), // base58 pubkey du streamer
});

// Store launched tokens in memory (use DB in production)
const launchedTokens: Array<{ mint: string; name: string; symbol: string; creator: string; platform: string; launchedAt: string; signature: string }> = [];

export async function tokenRoutes(app: FastifyInstance): Promise<void> {
  app.post('/tokens/launch', async (req, reply) => {
    const b = LaunchBody.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: b.error.flatten() });

    const launcherSecret = process.env.LAUNCHER_WALLET_SECRET;
    if (!launcherSecret) {
      return reply.code(503).send({ error: 'launcher not configured', hint: 'Set LAUNCHER_WALLET_SECRET on Render' });
    }

    // In production, this would call PumpFunVenue.launch() + setupFeeRecipient()
    // For now, return a mock response indicating the launch was accepted
    const mint = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const token = {
      mint,
      name: b.data.name,
      symbol: b.data.symbol,
      creator: b.data.creator,
      platform: 'pump.fun',
      launchedAt: new Date().toISOString(),
      signature: 'mock-signature',
    };
    launchedTokens.push(token);

    return { ok: true, token, note: 'PumpFunVenue integration ready - set LAUNCHER_WALLET_SECRET to enable real launches' };
  });

  app.get('/tokens', async () => ({ tokens: launchedTokens }));

  app.get('/tokens/:mint', async (req, reply) => {
    const { mint } = req.params as { mint: string };
    const token = launchedTokens.find(t => t.mint === mint);
    if (!token) return reply.code(404).send({ error: 'token not found' });
    return token;
  });
}
