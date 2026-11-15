// apps/backend/src/routes/tokens.ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { PumpFunVenue } from '../../../shared/launch/PumpFunVenue.js';

const LaunchBody = z.object({
  name: z.string().min(1).max(32),
  symbol: z.string().min(1).max(10),
  description: z.string().max(500).optional(),
  imageUri: z.string().url().optional(),
  creator: z.string().min(1), // base58 pubkey du streamer
});

// Store launched tokens in memory (use DB in production)
const launchedTokens: Array<{ mint: string; name: string; symbol: string; creator: string; platform: string; launchedAt: string }> = [];

export async function tokenRoutes(app: FastifyInstance): Promise<void> {
  app.post('/tokens/launch', async (req, reply) => {
    const b = LaunchBody.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: b.error.flatten() });

    const rpcUrl = process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
    const launcherSecret = process.env.LAUNCHER_WALLET_SECRET;

    if (!launcherSecret) {
      return reply.code(500).send({ error: 'LAUNCHER_WALLET_SECRET not configured' });
    }

    try {
      const secretBytes = Buffer.from(launcherSecret, 'base64');
      const venue = new PumpFunVenue({ rpcUrl, launcherSecret: new Uint8Array(secretBytes) });

      const result = await venue.launch({
        name: b.data.name,
        symbol: b.data.symbol,
        uri: b.data.imageUri ?? '',
        creator: b.data.creator,
      });

      // Setup fee sharing 75/25
      await venue.setupFeeRecipient(result.mint, [
        { address: b.data.creator, shareBps: 7500 },
        { address: process.env.PROTOCOL_TREASURY ?? '', shareBps: 2500 },
      ]);

      const token = {
        mint: result.mint,
        name: b.data.name,
        symbol: b.data.symbol,
        creator: b.data.creator,
        platform: 'pump.fun',
        launchedAt: new Date().toISOString(),
        signature: result.signature,
      };
      launchedTokens.push(token);

      return { ok: true, token };
    } catch (err) {
      console.error('Token launch failed:', err);
      return reply.code(500).send({ error: 'launch failed', details: (err as Error).message });
    }
  });

  app.get('/tokens', async () => ({ tokens: launchedTokens }));

  app.get('/tokens/:mint', async (req, reply) => {
    const { mint } = req.params as { mint: string };
    const token = launchedTokens.find(t => t.mint === mint);
    if (!token) return reply.code(404).send({ error: 'token not found' });
    return token;
  });
}
