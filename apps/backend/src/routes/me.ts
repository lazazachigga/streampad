// apps/backend/src/routes/me.ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';
import { PublicKey } from '@solana/web3.js';

const AttestationBody = z.object({
  mint: z.string().min(1),
  destination: z.string().min(1),
  amount: z.string().optional(), // lamports
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

// Attestor keypair (in production, load from secure storage / env)
function getAttestorKey(): crypto.KeyObject {
  const secret = process.env.ATTESTOR_SECRET;
  if (secret) {
    const keyBytes = Buffer.from(secret, 'base64');
    return crypto.createPrivateKey({ key: keyBytes, format: 'raw', type: 'pkcs8' } as any);
  }
  // Dev fallback: generate a deterministic key (NOT for production)
  const seed = Buffer.alloc(32, 0x42);
  return crypto.createPrivateKey({ key: seed, format: 'raw', type: 'pkcs8' } as any);
}

export function getAttestorPublicKey(): Buffer {
  const key = getAttestorKey();
  const pub = crypto.createPublicKey(key);
  // Export as raw 32 bytes
  const spki = pub.export({ type: 'spki', format: 'der' }) as Buffer;
  // ed25519 SPKI is 44 bytes: 12 bytes header + 32 bytes key
  return spki.subarray(12);
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

    const { mint, destination, amount } = b.data;
    const amountLamports = BigInt(amount ?? '1000000'); // default 0.001 SOL
    const nonce = BigInt(Date.now()); // simple nonce (use DB in production)
    const expiry = Math.floor(Date.now() / 1000) + 300; // 5 min

    // Build the message (80 bytes)
    // streamer_id_hash (32) + destination (32) + amount (8) + nonce (8)
    const streamerIdHash = crypto.createHash('sha256').update(session.userId).digest();
    const destBytes = new PublicKey(destination).toBytes();
    const amountBytes = Buffer.alloc(8);
    amountBytes.writeBigUInt64LE(amountLamports);
    const nonceBytes = Buffer.alloc(8);
    nonceBytes.writeBigUInt64LE(nonce);

    const message = Buffer.concat([streamerIdHash, destBytes, amountBytes, nonceBytes]);

    // Sign with ed25519
    const attestorKey = getAttestorKey();
    const signature = crypto.sign(null, message, attestorKey);

    return {
      ok: true,
      attestation: {
        mint,
        destination,
        amount: amountLamports.toString(),
        nonce: nonce.toString(),
        expiry,
        message: message.toString('base64'),
        signature: signature.toString('base64'),
        attestorPubkey: getAttestorPublicKey().toString('base64'),
      },
    };
  });
}
