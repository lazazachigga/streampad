// apps/backend/src/routes/me.ts
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';
import { PublicKey } from '@solana/web3.js';

const AttestationBody = z.object({
  mint: z.string().min(1),
  destination: z.string().min(1),
  amount: z.string().optional(), // lamports
});

// Helper to extract session from cookie
function getSession(req: FastifyRequest): { provider: string; userId: string; login: string } | null {
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
  let seed: Buffer;
  if (secret) {
    seed = Buffer.from(secret, 'base64');
  } else {
    // Dev fallback: deterministic seed (NOT for production)
    seed = Buffer.alloc(32, 0x42);
  }
  // Wrap raw 32-byte ed25519 seed in PKCS#8 DER
  // PKCS#8 PrivateKeyInfo for Ed25519 (RFC 8410):
  // SEQUENCE { INTEGER 0, SEQUENCE { OID 1.3.101.112 }, OCTET STRING { OCTET STRING { seed } } }
  const pkcs8Header = Buffer.from([
    0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
  ]);
  const pkcs8Der = Buffer.concat([pkcs8Header, seed]);
  return crypto.createPrivateKey({ key: pkcs8Der, format: 'der', type: 'pkcs8' });
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
