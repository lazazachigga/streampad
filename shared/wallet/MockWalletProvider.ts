// shared/wallet/MockWalletProvider.ts
// Implémentation en mémoire pour les tests de contrat (T10) et le dev local.
// Ne génère aucune vraie clé : publicKey = base58(sha256(userId + nonce)) factice,
// exportPrivateKey renvoie une chaîne déterministe marquée "MOCK".

import { createHash, randomBytes } from 'node:crypto';
import type { WalletHandle, WalletProvider } from './WalletProvider.js';

function b58(bytes: Uint8Array): string {
  // Encodage base58 minimal (alphabet Bitcoin) pour rester sans dépendance.
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let num = BigInt(0);
  for (const b of bytes) num = num * 256n + BigInt(b);
  let out = '';
  while (num > 0n) {
    out = ALPHABET[Number(num % 58n)] + out;
    num /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = '1' + out;
  }
  return out || '1';
}

export class MockWalletProvider implements WalletProvider {
  readonly name = 'mock';
  private readonly store = new Map<string, WalletHandle>();
  private readonly secrets = new Map<string, string>();

  async getOrCreateWallet(userId: string): Promise<WalletHandle> {
    const existing = this.store.get(userId);
    if (existing !== undefined) return existing;
    const handle: WalletHandle = {
      userId,
      publicKey: b58(randomBytes(32)),
      createdAt: Date.now(),
    };
    this.store.set(userId, handle);
    this.secrets.set(userId, `MOCK_SECRET_${userId}`);
    return handle;
  }

  async preGenerateWallet(streamerId: string): Promise<WalletHandle> {
    // Même stockage, clé dérivée de l'id streamer (pré-génération = wallet réservé).
    return this.getOrCreateWallet(`pre:${streamerId}`);
  }

  async signTransaction(userId: string, tx: Uint8Array): Promise<Uint8Array> {
    if (!this.store.has(userId)) {
      throw new Error(`wallet inconnu pour ${userId}`);
    }
    // Mock : renvoie la tx inchangée (pas de vraie signature).
    return new Uint8Array(tx);
  }

  async exportPrivateKey(userId: string): Promise<string> {
    const secret = this.secrets.get(userId);
    if (secret === undefined) {
      throw new Error(`wallet inconnu pour ${userId}`);
    }
    return secret;
  }
}

// helper exporté pour les tests (dérivation déterministe d'une pubkey factice)
export function mockPubkey(seed: string): string {
  return b58(createHash('sha256').update(seed).digest());
}
