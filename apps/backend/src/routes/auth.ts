// apps/backend/src/routes/auth.ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const CallbackQuery = z.object({ code: z.string().optional(), state: z.string().optional() });

const TWITCH_AUTH = 'https://id.twitch.tv/oauth2/authorize';
const TWITCH_TOKEN = 'https://id.twitch.tv/oauth2/token';
const TWITCH_USERS = 'https://api.twitch.tv/helix/users';

const X_AUTH = 'https://twitter.com/i/oauth2/authorize';
const X_TOKEN = 'https://api.twitter.com/2/oauth2/token';
const X_USERS = 'https://api.twitter.com/2/users/me';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Twitch
  app.get('/auth/twitch/login', async (_req, reply) => {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const redirectUri = `${process.env.OAUTH_REDIRECT_BASE_URL ?? 'http://localhost:4000'}/auth/twitch/callback`;
    if (!clientId) return reply.code(500).send({ error: 'TWITCH_CLIENT_ID not configured' });
    const url = new URL(TWITCH_AUTH);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'user:read:email');
    reply.redirect(url.toString());
  });

  app.get('/auth/twitch/callback', async (req, reply) => {
    const q = CallbackQuery.safeParse(req.query);
    if (!q.success || !q.data.code) return reply.code(400).send({ error: 'bad query' });
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
    if (!tokenRes.ok) return reply.code(400).send({ error: 'token exchange failed' });
    const tokenJson = (await tokenRes.json()) as { access_token: string };
    const userRes = await fetch(TWITCH_USERS, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}`, 'Client-Id': clientId },
    });
    if (!userRes.ok) return reply.code(400).send({ error: 'user fetch failed' });
    const userJson = (await userRes.json()) as { data: Array<{ id: string; login: string }> };
    const user = userJson.data[0];
    if (!user) return reply.code(400).send({ error: 'user not found' });
    return { ok: true, provider: 'twitch', userId: user.id, login: user.login };
  });

  // X (Twitter)
  app.get('/auth/x/login', async (_req, reply) => {
    const clientId = process.env.X_CLIENT_ID;
    const redirectUri = `${process.env.OAUTH_REDIRECT_BASE_URL ?? 'http://localhost:4000'}/auth/x/callback`;
    if (!clientId) return reply.code(500).send({ error: 'X_CLIENT_ID not configured' });
    const url = new URL(X_AUTH);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'users.read tweet.read offline.access');
    url.searchParams.set('state', 'state_' + Date.now());
    url.searchParams.set('code_challenge', 'challenge_' + Date.now());
    url.searchParams.set('code_challenge_method', 'S256');
    reply.redirect(url.toString());
  });

  app.get('/auth/x/callback', async (req, reply) => {
    const q = CallbackQuery.safeParse(req.query);
    if (!q.success || !q.data.code) return reply.code(400).send({ error: 'bad query' });
    const clientId = process.env.X_CLIENT_ID;
    const clientSecret = process.env.X_CLIENT_SECRET;
    const redirectUri = `${process.env.OAUTH_REDIRECT_BASE_URL ?? 'http://localhost:4000'}/auth/x/callback`;
    if (!clientId || !clientSecret) return reply.code(500).send({ error: 'X not configured' });

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: q.data.code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: 'verifier_' + Date.now(),
    });
    const tokenRes = await fetch(X_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!tokenRes.ok) return reply.code(400).send({ error: 'token exchange failed' });
    const tokenJson = (await tokenRes.json()) as { access_token: string };
    const userRes = await fetch(`${X_USERS}?user.fields=id,username`, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!userRes.ok) return reply.code(400).send({ error: 'user fetch failed' });
    const userJson = (await userRes.json()) as { data: { id: string; username: string } };
    return { ok: true, provider: 'x', userId: userJson.data.id, login: userJson.data.username };
  });

  // Kick
  app.get('/auth/kick/login', async (_req, reply) => {
    const clientId = process.env.KICK_CLIENT_ID;
    const redirectUri = `${process.env.OAUTH_REDIRECT_BASE_URL ?? 'http://localhost:4000'}/auth/kick/callback`;
    if (!clientId) return reply.code(500).send({ error: 'KICK_CLIENT_ID not configured' });
    const url = new URL('https://id.kick.com/oauth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'user:read');
    reply.redirect(url.toString());
  });

  app.get('/auth/kick/callback', async (req, reply) => {
    const q = CallbackQuery.safeParse(req.query);
    if (!q.success || !q.data.code) return reply.code(400).send({ error: 'bad query' });
    return { ok: true, code: q.data.code };
  });
}
