// shared/oauth/KickOAuthProvider.ts
// Adaptateur Kick (PKCE obligatoire) — PRÊT À BRANCHER.
// Endpoints (SPEC §3 T9) : https://id.kick.com/oauth/authorize, /token,
// API publique : https://api.kick.com/public/v1/users, scope user:read.
// Nécessite : KICK_CLIENT_ID, KICK_CLIENT_SECRET (voir HUMAN_TODO.md T9).

import type { OAuthProvider, OAuthUser, TokenSet } from './OAuthProvider.js';

export interface KickConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class KickOAuthProvider implements OAuthProvider {
  readonly name = 'kick';
  private static readonly AUTH = 'https://id.kick.com/oauth/authorize';
  private static readonly TOKEN = 'https://id.kick.com/oauth/token';
  private static readonly USERS = 'https://api.kick.com/public/v1/users';

  constructor(private readonly config: KickConfig) {
    if (config.clientId === '' || config.clientSecret === '') {
      throw new Error('KickOAuthProvider: config incomplète (HUMAN_TODO.md T9)');
    }
  }

  authorizeUrl(state: string, codeChallenge: string): string {
    const p = new URL(KickOAuthProvider.AUTH);
    p.searchParams.set('client_id', this.config.clientId);
    p.searchParams.set('redirect_uri', this.config.redirectUri);
    p.searchParams.set('response_type', 'code');
    p.searchParams.set('scope', 'user:read');
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
    const res = await fetch(KickOAuthProvider.TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error(`Kick token exchange failed: ${res.status}`);
    const json = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: Date.now() + json.expires_in * 1000,
    };
  }

  async fetchUser(accessToken: string): Promise<OAuthUser> {
    const res = await fetch(KickOAuthProvider.USERS, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Kick users fetch failed: ${res.status}`);
    const json = (await res.json()) as {
      data?: Array<{ user_id: number | string; username?: string; slug?: string }>;
    };
    const u = json.data?.[0];
    if (u === undefined) throw new Error('Kick user introuvable');
    return {
      providerUserId: String(u.user_id),
      login: u.username ?? u.slug ?? '',
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenSet> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    const res = await fetch(KickOAuthProvider.TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error(`Kick refresh failed: ${res.status}`);
    const json = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? refreshToken,
      expiresAt: Date.now() + json.expires_in * 1000,
    };
  }
}
