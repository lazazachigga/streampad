// shared/oauth/TwitchOAuthProvider.ts
// Adaptateur Twitch (Authorization Code + PKCE) — PRÊT À BRANCHER.
// Nécessite : TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET (voir HUMAN_TODO.md T8).
// Endpoints : https://id.twitch.tv/oauth2/authorize, /token, https://api.twitch.tv/helix/users
// L'ID utilisateur Twitch est numérique et stable (pas le login).

import type { OAuthProvider, OAuthUser, TokenSet } from './OAuthProvider.js';

export interface TwitchConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class TwitchOAuthProvider implements OAuthProvider {
  readonly name = 'twitch';
  private static readonly AUTH = 'https://id.twitch.tv/oauth2/authorize';
  private static readonly TOKEN = 'https://id.twitch.tv/oauth2/token';
  private static readonly USERS = 'https://api.twitch.tv/helix/users';

  constructor(private readonly config: TwitchConfig) {
    if (config.clientId === '' || config.clientSecret === '') {
      throw new Error('TwitchOAuthProvider: config incomplète (HUMAN_TODO.md T8)');
    }
  }

  authorizeUrl(state: string, codeChallenge: string): string {
    const p = new URL(TwitchOAuthProvider.AUTH);
    p.searchParams.set('client_id', this.config.clientId);
    p.searchParams.set('redirect_uri', this.config.redirectUri);
    p.searchParams.set('response_type', 'code');
    p.searchParams.set('scope', 'user:read:email');
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
    const res = await fetch(TwitchOAuthProvider.TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error(`Twitch token exchange failed: ${res.status}`);
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
    const res = await fetch(TwitchOAuthProvider.USERS, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': this.config.clientId,
      },
    });
    if (!res.ok) throw new Error(`Twitch users fetch failed: ${res.status}`);
    const json = (await res.json()) as { data: Array<{ id: string; login: string }> };
    const u = json.data[0];
    if (u === undefined) throw new Error('Twitch user introuvable');
    return { providerUserId: u.id, login: u.login };
  }

  async refreshToken(refreshToken: string): Promise<TokenSet> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    const res = await fetch(TwitchOAuthProvider.TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error(`Twitch refresh failed: ${res.status}`);
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
