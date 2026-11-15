// apps/backend/src/routes/wallet.ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const ProvisionBody = z.object({ identity: z.string().min(1) });

export async function walletRoutes(app: FastifyInstance): Promise<void> {
  app.post('/wallet/provision', async (req, reply) => {
    const b = ProvisionBody.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: b.error.flatten() });

    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;

    if (!appId || !appSecret) {
      // Mock fallback for dev without Privy
      return { ok: true, mock: true, identity: b.data.identity, address: 'mock-solana-address' };
    }

    try {
      const auth = Buffer.from(`${appId}:${appSecret}`).toString('base64');
      const res = await fetch('https://auth.privy.io/api/v1/wallets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
          'privy-app-id': appId,
        },
        body: JSON.stringify({ chain_type: 'solana' }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Privy wallet creation failed:', errText);
        return reply.code(500).send({ error: 'wallet creation failed', details: errText });
      }

      const wallet = (await res.json()) as { id: string; address: string; chain_type: string };
      return { ok: true, walletId: wallet.id, address: wallet.address, chain: wallet.chain_type };
    } catch (err) {
      console.error('Privy error:', err);
      return reply.code(500).send({ error: 'wallet creation failed' });
    }
  });
}

