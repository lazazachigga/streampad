// shared/oauth/OAuthProvider.ts
// Interface commune aux providers OAuth (T8 Twitch, T9 Kick).

export interface TokenSet {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiresAt: number; // epoch ms
}

export interface OAuthUser {
  /** Identifiant numérique stable du provider (pas le login). */
  readonly providerUserId: string;
  readonly login: string;
}

export interface OAuthProvider {
  readonly name: string;
  /** URL d'autorisation avec PKCE (state + code_challenge). */
  authorizeUrl(state: string, codeChallenge: string): string;
  /** Échange le code d'autorisation contre des tokens. */
  exchangeCode(code: string, codeVerifier: string): Promise<TokenSet>;
  /** Récupère l'utilisateur à partir de l'access token. */
  fetchUser(accessToken: string): Promise<OAuthUser>;
  /** Rafraîchit un access token. */
  refreshToken(refreshToken: string): Promise<TokenSet>;
}
