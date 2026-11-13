// test/contracts/wallet.contract.test.ts
import { describe, it, expect } from 'vitest';
import { MockWalletProvider } from '../../shared/wallet/MockWalletProvider.js';

describe('WalletProvider contract (mock)', () => {
  it('crée un wallet puis le récupère à l\'identique', async () => {
    const p = new MockWalletProvider();
    const a = await p.getOrCreateWallet('user-1');
    const b = await p.getOrCreateWallet('user-1');
    expect(b.publicKey).toBe(a.publicKey);
    expect(b.userId).toBe('user-1');
  });

  it('deux utilisateurs ont des pubkeys distinctes', async () => {
    const p = new MockWalletProvider();
    const a = await p.getOrCreateWallet('u1');
    const b = await p.getOrCreateWallet('u2');
    expect(a.publicKey).not.toBe(b.publicKey);
  });

  it('pré-génère un wallet réservé pour un streamer non connecté', async () => {
    const p = new MockWalletProvider();
    const h = await p.preGenerateWallet('streamer-42');
    expect(h.publicKey).toBeTruthy();
    expect(h.userId).toBe('pre:streamer-42');
  });

  it('signTransaction renvoie les bytes pour un wallet connu', async () => {
    const p = new MockWalletProvider();
    await p.getOrCreateWallet('u1');
    const input = new Uint8Array([1, 2, 3]);
    const out = await p.signTransaction('u1', input);
    expect(Array.from(out)).toEqual([1, 2, 3]);
  });

  it('signTransaction échoue pour un wallet inconnu', async () => {
    const p = new MockWalletProvider();
    await expect(p.signTransaction('ghost', new Uint8Array([1]))).rejects.toThrow();
  });

  it('exportPrivateKey renvoie un secret pour un wallet connu', async () => {
    const p = new MockWalletProvider();
    await p.getOrCreateWallet('u1');
    const key = await p.exportPrivateKey('u1');
    expect(key).toContain('MOCK_SECRET');
  });

  it('exportPrivateKey échoue pour un wallet inconnu', async () => {
    const p = new MockWalletProvider();
    await expect(p.exportPrivateKey('ghost')).rejects.toThrow();
  });
});
