// shared/oauth/XOAuthProvider.ts
// Adaptateur X (Twitter) OAuth 2.0 — PRÊT À BRANCHER.
// Endpoints : https://twitter.com/i/oauth2/authorize, https://api.twitter.com/2/oauth2/token
// Scope : users.read, tweet.read. PKCE obligatoire.
// Nécessite : X_CLIENT_ID, X_CLIENT_SECRET (voir HUMAN_TODO.md).

import type { OAuthProvider, OAuthUser, TokenSet } from './OAuthProvider.js';

export interface XConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class XOAuthProvider implements OAuthProvider {
  readonly name = 'x';
  private static readonly AUTH = 'https://twitter.com/i/oauth2/authorize';
  private static readonly TOKEN = 'https://api.twitter.com/2/oauth2/token';
  private static readonly USERS = 'https://api.twitter.com/2/users/me';

  constructor(private readonly config: XConfig) {
    if (config.clientId === '' || config.clientSecret === '') {
      throw new Error('XOAuthProvider: config incomplète');
    }
  }

  authorizeUrl(state: string, codeChallenge: string): string {
    const p = new URL(XOAuthProvider.AUTH);
    p.searchParams.set('client_id', this.config.clientId);
    p.searchParams.set('redirect_uri', this.config.redirectUri);
    p.searchParams.set('response_type', 'code');
    p.searchParams.set('scope', 'users.read tweet.read offline.access');
    p.searchParams.set('state', state);
    p.searchParams.set('code_challenge', codeChallenge);
    p.searchParams.set('code_challenge_method', 'S256');
    return p.toString();
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<TokenSet> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.config.redirectUri,
      code_verifier: codeVerifier,
    });
    const res = await fetch(XOAuthProvider.TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error(`X token exchange failed: ${res.status}`);
    const json = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: Date.now() + json.expires_in * 1000,
    };
  }

  async fetchUser(accessToken: string): Promise<OAuthUser> {
    const res = await fetch(`${XOAuthProvider.USERS}?user.fields=id,username`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`X users fetch failed: ${res.status}`);
    const json = (await res.json()) as { data: { id: string; username: string } };
    return { providerUserId: json.data.id, login: json.data.username };
  }

  async refreshToken(refreshToken: string): Promise<TokenSet> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    const res = await fetch(XOAuthProvider.TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error(`X refresh failed: ${res.status}`);
    const json = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? refreshToken,
      expiresAt: Date.now() + json.expires_in * 1000,
    };
  }
}
