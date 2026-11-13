// test/contracts/oauth.contract.test.ts
import { describe, it, expect } from 'vitest';
import { MockOAuthProvider } from '../../shared/oauth/MockOAuthProvider.js';

describe('OAuthProvider contract (mock)', () => {
  it('authorizeUrl contient state et challenge', () => {
    const p = new MockOAuthProvider();
    const url = p.authorizeUrl('st', 'ch');
    expect(url).toContain('state=st');
    expect(url).toContain('challenge=ch');
  });

  it('exchangeCode refuse un code vide', async () => {
    const p = new MockOAuthProvider();
    await expect(p.exchangeCode('', 'v')).rejects.toThrow();
  });

  it('exchangeCode renvoie des tokens pour un code valide', async () => {
    const p = new MockOAuthProvider();
    const t = await p.exchangeCode('abc', 'v');
    expect(t.accessToken).toContain('abc');
    expect(t.expiresAt).toBeGreaterThan(Date.now());
  });

  it('fetchUser renvoie un id stable pour un même token', async () => {
    const p = new MockOAuthProvider();
    const u1 = await p.fetchUser('tok');
    const u2 = await p.fetchUser('tok');
    expect(u2.providerUserId).toBe(u1.providerUserId);
  });

  it('fetchUser renvoie des ids distincts pour des tokens distincts', async () => {
    const p = new MockOAuthProvider();
    const u1 = await p.fetchUser('tok1');
    const u2 = await p.fetchUser('tok2');
    expect(u1.providerUserId).not.toBe(u2.providerUserId);
  });

  it('refreshToken refuse un refresh vide', async () => {
    const p = new MockOAuthProvider();
    await expect(p.refreshToken('')).rejects.toThrow();
  });

  it('refreshToken renvoie un nouvel access token', async () => {
    const p = new MockOAuthProvider();
    const t = await p.refreshToken('rt');
    expect(t.accessToken).toBeTruthy();
  });
});
