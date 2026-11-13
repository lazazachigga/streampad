// shared/oauth/MockOAuthProvider.ts
// Implémentation en mémoire pour les tests de contrat (T8/T9) et le dev local.

import type { OAuthProvider, OAuthUser, TokenSet } from './OAuthProvider.js';

export class MockOAuthProvider implements OAuthProvider {
  readonly name = 'mock';
  private counter = 0;

  authorizeUrl(state: string, codeChallenge: string): string {
    return `https://mock.oauth/authorize?state=${encodeURIComponent(state)}&challenge=${encodeURIComponent(codeChallenge)}`;
  }

  async exchangeCode(code: string, _codeVerifier: string): Promise<TokenSet> {
    if (code === '') throw new Error('code vide');
    return {
      accessToken: `mock_access_${code}`,
      refreshToken: `mock_refresh_${code}`,
      expiresAt: Date.now() + 3600_000,
    };
  }

  async fetchUser(accessToken: string): Promise<OAuthUser> {
    this.counter += 1;
    // L'id est dérivé du token, stable pour un même token.
    const id = `mock_user_${accessToken}`;
    return { providerUserId: id, login: `user_${this.counter}` };
  }

  async refreshToken(refreshToken: string): Promise<TokenSet> {
    if (refreshToken === '') throw new Error('refresh vide');
    return {
      accessToken: `mock_access_refreshed_${refreshToken}`,
      refreshToken,
      expiresAt: Date.now() + 3600_000,
    };
  }
}
