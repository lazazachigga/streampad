// apps/backend/src/routes/auth.ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';

const CallbackQuery = z.object({ code: z.string().optional(), state: z.string().optional() });

const TWITCH_AUTH = 'https://id.twitch.tv/oauth2/authorize';
const TWITCH_TOKEN = 'https://id.twitch.tv/oauth2/token';
const TWITCH_USERS = 'https://api.twitch.tv/helix/users';

// In-memory state store (use Redis in production)
const oauthStates = new Map<string, { provider: string; codeVerifier: string; createdAt: number }>();

// Clean up expired states every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of oauthStates) {
    if (now - val.createdAt > 10 * 60 * 1000) oauthStates.delete(key);
  }
}, 5 * 60 * 1000);

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Twitch
  app.get('/auth/twitch/login', async (_req, reply) => {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const redirectUri = `${process.env.OAUTH_REDIRECT_BASE_URL ?? 'http://localhost:4000'}/auth/twitch/callback`;
    if (!clientId) return reply.code(500).send({ error: 'TWITCH_CLIENT_ID not configured' });

    const state = generateState();
    oauthStates.set(state, { provider: 'twitch', codeVerifier: '', createdAt: Date.now() });

    const url = new URL(TWITCH_AUTH);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'user:read:email');
    url.searchParams.set('state', state);
    reply.redirect(url.toString());
  });

  app.get('/auth/twitch/callback', async (req, reply) => {
    const q = CallbackQuery.safeParse(req.query);
    if (!q.success || !q.data.code) return reply.code(400).send({ error: 'bad query' });

    // Validate state (CSRF protection)
    if (!q.data.state || !oauthStates.has(q.data.state)) {
      return reply.code(400).send({ error: 'invalid or expired state' });
    }
    const stateData = oauthStates.get(q.data.state)!;
    oauthStates.delete(q.data.state);

    if (stateData.provider !== 'twitch') {
      return reply.code(400).send({ error: 'state provider mismatch' });
    }

    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    const redirectUri = `${process.env.OAUTH_REDIRECT_BASE_URL ?? 'http://localhost:4000'}/auth/twitch/callback`;
    if (!clientId || !clientSecret) return reply.code(500).send({ error: 'Twitch not configured' });

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: q.data.code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });
    const tokenRes = await fetch(TWITCH_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Twitch token exchange failed:', errText);
      return reply.code(400).send({ error: 'token exchange failed', details: errText });
    }
    const tokenJson = (await tokenRes.json()) as { access_token: string };
    const userRes = await fetch(TWITCH_USERS, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}`, 'Client-Id': clientId },
    });
    if (!userRes.ok) return reply.code(400).send({ error: 'user fetch failed' });
    const userJson = (await userRes.json()) as { data: Array<{ id: string; login: string }> };
    const user = userJson.data[0];
    if (!user) return reply.code(400).send({ error: 'user not found' });

    // Set session cookie
    reply.setCookie('session', JSON.stringify({ provider: 'twitch', userId: user.id, login: user.login }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Redirect to frontend
    const frontendUrl = process.env.WEB_ORIGIN ?? 'https://streampad.wtf';
    return reply.redirect(`${frontendUrl}/streamer?provider=twitch&login=${encodeURIComponent(user.login)}`);
  });

  // Kick
  app.get('/auth/kick/login', async (_req, reply) => {
    const clientId = process.env.KICK_CLIENT_ID;
    const redirectUri = `${process.env.OAUTH_REDIRECT_BASE_URL ?? 'http://localhost:4000'}/auth/kick/callback`;
    if (!clientId) return reply.code(500).send({ error: 'KICK_CLIENT_ID not configured' });

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    oauthStates.set(state, { provider: 'kick', codeVerifier, createdAt: Date.now() });

    const url = new URL('https://id.kick.com/oauth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'user:read');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    reply.redirect(url.toString());
  });

  app.get('/auth/kick/callback', async (req, reply) => {
    const q = CallbackQuery.safeParse(req.query);
    if (!q.success || !q.data.code) return reply.code(400).send({ error: 'bad query' });

    if (!q.data.state || !oauthStates.has(q.data.state)) {
      return reply.code(400).send({ error: 'invalid or expired state' });
    }
    const stateData = oauthStates.get(q.data.state)!;
    oauthStates.delete(q.data.state);

    if (stateData.provider !== 'kick') {
      return reply.code(400).send({ error: 'state provider mismatch' });
    }

    const clientId = process.env.KICK_CLIENT_ID;
    const clientSecret = process.env.KICK_CLIENT_SECRET;
    const redirectUri = `${process.env.OAUTH_REDIRECT_BASE_URL ?? 'http://localhost:4000'}/auth/kick/callback`;
    if (!clientId || !clientSecret) return reply.code(500).send({ error: 'Kick not configured' });

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: q.data.code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: stateData.codeVerifier,
    });
    const tokenRes = await fetch('https://id.kick.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Kick token exchange failed:', errText);
      return reply.code(400).send({ error: 'token exchange failed' });
    }
    const tokenJson = (await tokenRes.json()) as { access_token: string };
    const userRes = await fetch('https://api.kick.com/public/v1/users', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!userRes.ok) {
      const errText = await userRes.text();
      console.error('Kick user fetch failed:', errText);
      return reply.code(400).send({ error: 'user fetch failed' });
    }
    const userJson = (await userRes.json()) as { data: Array<{ user_id: number; username: string }> };
    const user = userJson.data?.[0];
    if (!user) return reply.code(400).send({ error: 'user not found' });

    reply.setCookie('session', JSON.stringify({ provider: 'kick', userId: String(user.user_id), login: user.username }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    const frontendUrl = process.env.WEB_ORIGIN ?? 'https://streampad.wtf';
    return reply.redirect(`${frontendUrl}/streamer?provider=kick&login=${encodeURIComponent(user.username)}`);
  });
}
