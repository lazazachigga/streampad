// apps/backend/src/routes/tokens.ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const LaunchBody = z.object({
  name: z.string().min(1).max(32),
  symbol: z.string().min(1).max(10),
  description: z.string().max(500).optional(),
  imageUri: z.string().url().optional(),
  creator: z.string().min(1), // base58 pubkey du streamer
  platform: z.enum(['twitch', 'kick', 'x']).default('twitch'),
  streamerHandle: z.string().optional(), // @handle du streamer
});

const LaunchForStreamerBody = z.object({
  streamerUrl: z.string().min(1), // URL Twitch/Kick du streamer
  name: z.string().min(1).max(32),
  symbol: z.string().min(1).max(10),
  description: z.string().max(500).optional(),
  imageUri: z.string().url().optional(),
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

function addNotification(userId: string, type: notifications[0]['type'], message: string, metadata: Record<string, unknown> = {}) {
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

// Parse Twitch/Kick URL to extract platform and username
function parseStreamerUrl(url: string): { platform: 'twitch' | 'kick' | 'x'; username: string } | null {
  const twitchMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  if (twitchMatch) return { platform: 'twitch', username: twitchMatch[1] };

  const kickMatch = url.match(/kick\.com\/([a-zA-Z0-9_]+)/);
  if (kickMatch) return { platform: 'kick', username: kickMatch[1] };

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

    // Notify the streamer that someone launched a token for them
    addNotification(
      `streamer-${parsed.username}`,
      'token_launched_for_you',
      `Someone launched a token for you: $${b.data.symbol} (${b.data.name})! Claim your fees at streampad.wtf`,
      { mint, symbol: b.data.symbol, name: b.data.name, platform: parsed.platform }
    );

    return { ok: true, token, streamer: parsed };
  });

  app.get('/tokens', async () => ({ tokens: launchedTokens }));

  app.get('/tokens/:mint', async (req, reply) => {
    const { mint } = req.params as { mint: string };
    const token = launchedTokens.find(t => t.mint === mint);
    if (!token) return reply.code(404).send({ error: 'token not found' });
    return token;
  });

  // Notifications
  app.get('/notifications', async (req, reply) => {
    const userId = (req.query as any)?.userId ?? '';
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
