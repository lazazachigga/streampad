// apps/backend/src/routes/tokens.ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const LaunchBody = z.object({
  name: z.string().min(1).max(32),
  symbol: z.string().min(1).max(10),
  description: z.string().max(500).optional(),
  imageUri: z.string().optional(),
  creator: z.string().min(1), // base58 pubkey du streamer
  platform: z.enum(['twitch', 'kick']).default('twitch'),
  streamerHandle: z.string().optional(), // @handle du streamer
});

const LaunchForStreamerBody = z.object({
  streamerUrl: z.string().min(1), // URL Twitch/Kick du streamer
  name: z.string().min(1).max(32),
  symbol: z.string().min(1).max(10),
  description: z.string().max(500).optional(),
  imageUri: z.string().optional(),
});

// Store launched tokens in memory (use DB in production)
const launchedTokens: Array<{
  mint: string;
  name: string;
  symbol: string;
  creator: string;
  platform: string;
  streamerHandle: string;
  launchedAt: string;
  signature: string;
  launchedBy: string;
}> = [];

// Notifications store (in-memory, use DB + push in production)
const notifications: Array<{
  id: string;
  userId: string;
  type: 'token_launched' | 'fees_claimed' | 'token_launched_for_you';
  message: string;
  read: boolean;
  createdAt: string;
  metadata: Record<string, unknown>;
}> = [];

function addNotification(userId: string, type: 'token_launched' | 'fees_claimed' | 'token_launched_for_you', message: string, metadata: Record<string, unknown> = {}) {
  notifications.push({
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    type,
    message,
    read: false,
    createdAt: new Date().toISOString(),
    metadata,
  });
}

// Validate that a Twitch username exists
async function validateTwitchUsername(username: string): Promise<boolean> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return true; // skip validation if not configured

  try {
    // Get app access token
    const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });
    if (!tokenRes.ok) return true; // skip if token fetch fails
    const tokenData = (await tokenRes.json()) as { access_token: string };
    
    // Check if user exists
    const userRes = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`, {
      headers: { 'Client-Id': clientId, 'Authorization': `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) return true;
    const userData = (await userRes.json()) as { data: Array<{ id: string }> };
    return Array.isArray(userData.data) && userData.data.length > 0;
  } catch {
    return true; // skip on error
  }
}

// Validate that a Kick username exists (best-effort)
async function validateKickUsername(username: string): Promise<boolean> {
  // Kick API is less documented; do basic format validation
  return username.length > 0 && username.length <= 25 && /^[a-zA-Z0-9_]+$/.test(username);
}
async function fetchTwitchUserData(username: string): Promise<{ displayName: string; profileImageUrl: string; followers: number } | null> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });
    if (!tokenRes.ok) return null;
    const tokenData = (await tokenRes.json()) as { access_token: string };

    const userRes = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`, {
      headers: { 'Client-Id': clientId, 'Authorization': `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) return null;
    const userData = (await userRes.json()) as { data: Array<{ id: string; display_name: string; profile_image_url: string }> };
    if (!userData.data?.[0]) return null;
    const user = userData.data[0];

    const followRes = await fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${user.id}`, {
      headers: { 'Client-Id': clientId, 'Authorization': `Bearer ${tokenData.access_token}` },
    });
    let followers = 0;
    if (followRes.ok) {
      const followData = (await followRes.json()) as { total: number };
      followers = followData.total ?? 0;
    }

    return { displayName: user.display_name, profileImageUrl: user.profile_image_url, followers };
  } catch {
    return null;
  }
}

function parseStreamerUrl(url: string): { platform: 'twitch' | 'kick'; username: string } | null {
  const twitchMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  if (twitchMatch && twitchMatch[1]) return { platform: 'twitch', username: twitchMatch[1] };

  const kickMatch = url.match(/kick\.com\/([a-zA-Z0-9_]+)/);
  if (kickMatch && kickMatch[1]) return { platform: 'kick', username: kickMatch[1] };

  // Direct handle
  if (url.startsWith('@')) {
    const handle = url.slice(1);
    if (handle.length > 0) return { platform: 'twitch', username: handle };
  }

  return null;
}

export async function tokenRoutes(app: FastifyInstance): Promise<void> {
  // Launch a token
  app.post('/tokens/launch', async (req, reply) => {
    const b = LaunchBody.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: b.error.flatten() });

    const launcherSecret = process.env.LAUNCHER_WALLET_SECRET;
    if (!launcherSecret) {
      return reply.code(503).send({ error: 'launcher not configured', hint: 'Set LAUNCHER_WALLET_SECRET on Render' });
    }

    const mint = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const token = {
      mint,
      name: b.data.name,
      symbol: b.data.symbol,
      creator: b.data.creator,
      platform: b.data.platform,
      streamerHandle: b.data.streamerHandle ?? '',
      launchedAt: new Date().toISOString(),
      signature: 'mock-signature',
      launchedBy: 'self',
    };
    launchedTokens.push(token);

    // Notify the streamer
    addNotification(b.data.creator, 'token_launched', `Your token $${b.data.symbol} has been launched!`, { mint, symbol: b.data.symbol });

    return { ok: true, token };
  });

  // Launch a token for a streamer (by URL)
  app.post('/tokens/launch-for-streamer', async (req, reply) => {
    const b = LaunchForStreamerBody.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: b.error.flatten() });

    const parsed = parseStreamerUrl(b.data.streamerUrl);
    if (!parsed) {
      return reply.code(400).send({ error: 'invalid streamer URL', hint: 'Use a Twitch or Kick URL (e.g., https://twitch.tv/username)' });
    }

    // Validate that the streamer account exists
    const isValid = parsed.platform === 'twitch'
      ? await validateTwitchUsername(parsed.username)
      : await validateKickUsername(parsed.username);
    if (!isValid) {
      return reply.code(400).send({ error: 'streamer not found', hint: `No ${parsed.platform} account found for "${parsed.username}"` });
    }

    const launcherSecret = process.env.LAUNCHER_WALLET_SECRET;
    if (!launcherSecret) {
      return reply.code(503).send({ error: 'launcher not configured', hint: 'Set LAUNCHER_WALLET_SECRET on Render' });
    }

    const mint = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const token = {
      mint,
      name: b.data.name,
      symbol: b.data.symbol,
      creator: `streamer-${parsed.username}`,
      platform: parsed.platform,
      streamerHandle: parsed.username,
      launchedAt: new Date().toISOString(),
      signature: 'mock-signature',
      launchedBy: 'community',
    };
    launchedTokens.push(token);

    // Fetch streamer data for response
    const streamerData = parsed.platform === 'twitch' ? await fetchTwitchUserData(parsed.username) : null;

    // Notify the streamer that someone launched a token for them
    addNotification(
      `streamer-${parsed.username}`,
      'token_launched_for_you',
      `Someone launched a token for you: $${b.data.symbol} (${b.data.name})! Claim your fees at streampad.wtf`,
      { mint, symbol: b.data.symbol, name: b.data.name, platform: parsed.platform }
    );

    return { ok: true, token, streamer: { ...parsed, ...streamerData } };
  });

  // Streamer info endpoint (followers, live status, profile)
  app.get('/streamers/:platform/:username', async (req, reply) => {
    const { platform, username } = req.params as { platform: string; username: string };
    
    if (platform === 'twitch') {
      const data = await fetchTwitchUserData(username);
      if (!data) return reply.code(404).send({ error: 'streamer not found' });
      
      // Check live status
      let isLive = false;
      let streamTitle = '';
      let viewerCount = 0;
      const clientId = process.env.TWITCH_CLIENT_ID;
      const clientSecret = process.env.TWITCH_CLIENT_SECRET;
      if (clientId && clientSecret) {
        try {
          const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
          });
          if (tokenRes.ok) {
            const tokenData = (await tokenRes.json()) as { access_token: string };
            const streamRes = await fetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(username)}`, {
              headers: { 'Client-Id': clientId, 'Authorization': `Bearer ${tokenData.access_token}` },
            });
            if (streamRes.ok) {
              const streamData = (await streamRes.json()) as { data: Array<{ title: string; viewer_count: number; type: string }> };
              if (streamData.data?.[0]) {
                isLive = streamData.data[0].type === 'live';
                streamTitle = streamData.data[0].title;
                viewerCount = streamData.data[0].viewer_count;
              }
            }
          }
        } catch {}
      }
      
      return { platform: 'twitch', username, displayName: data.displayName, profileImageUrl: data.profileImageUrl, followers: data.followers, isLive, streamTitle, viewerCount };
    }
    
    // Kick - basic info
    return { platform: 'kick', username, displayName: username, profileImageUrl: '', followers: 0, isLive: false, streamTitle: '', viewerCount: 0 };
  });

  app.get('/tokens/:mint', async (req, reply) => {
    const { mint } = req.params as { mint: string };
    const token = launchedTokens.find(t => t.mint === mint);
    if (!token) return reply.code(404).send({ error: 'token not found' });
    return token;
  });

  // Notifications
  app.get('/notifications', async (req, reply) => {
    const userId = (req.query as { userId?: string })?.userId ?? '';
    if (!userId) return reply.code(400).send({ error: 'userId required' });
    const userNotifs = notifications.filter(n => n.userId === userId);
    return { notifications: userNotifs, unread: userNotifs.filter(n => !n.read).length };
  });

  app.post('/notifications/read', async (req, reply) => {
    const body = req.body as { notificationId?: string; userId?: string };
    if (body.notificationId) {
      const notif = notifications.find(n => n.id === body.notificationId);
      if (notif) notif.read = true;
    } else if (body.userId) {
      notifications.filter(n => n.userId === body.userId).forEach(n => n.read = true);
    }
    return { ok: true };
  });
}
