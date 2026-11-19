// apps/backend/src/routes/tokens.ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Connection, Keypair } from '@solana/web3.js';
import { PUMP_SDK, GLOBAL_PDA } from '@pump-fun/pump-sdk';
import BN from 'bn.js';

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
  description?: string;
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

// In-memory image storage (mint -> base64 data URI)
const imageStore = new Map<string, string>();

// Real pump.fun launch (requires LAUNCHER_WALLET_SECRET + SOLANA_RPC_URL)
async function launchOnPumpFun(name: string, symbol: string, imageUri: string): Promise<{ mint: string; signature: string } | null> {
  const secret = process.env.LAUNCHER_WALLET_SECRET;
  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (!secret || !rpcUrl) return null;

  try {
    const { Transaction, sendAndConfirmTransaction } = await import('@solana/web3.js');
    const connection = new Connection(rpcUrl, 'confirmed');
    const launcher = Keypair.fromSecretKey(Buffer.from(secret, 'base64'));
    
    const globalInfo = await connection.getAccountInfo(GLOBAL_PDA);
    if (!globalInfo) return null;
    const global = PUMP_SDK.decodeGlobal(globalInfo);

    const mint = Keypair.generate();
    const mintAddress = mint.publicKey.toBase58();
    
    // Store image for metadata serving
    if (imageUri) {
      imageStore.set(mintAddress, imageUri);
    }
    
    // Build metadata URL (served by our backend)
    const backendUrl = process.env.OAUTH_REDIRECT_BASE_URL?.replace('/auth', '') || 'https://streampad-backend.onrender.com';
    const metadataUri = `${backendUrl}/metadata/${mintAddress}`;
    
    const creator = launcher.publicKey;
    const ixs = await PUMP_SDK.createV2AndBuyInstructions({
      global,
      mint: mint.publicKey,
      name,
      symbol,
      uri: metadataUri,
      creator,
      user: launcher.publicKey,
      amount: new BN('1000000000'),
      solAmount: new BN('100000000'),
      mayhemMode: false,
    });
    
    const sig = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(...ixs),
      [launcher, mint],
      { commitment: 'confirmed' },
    );
    
    return { mint: mintAddress, signature: sig };
  } catch (err) {
    console.error('pump.fun launch failed:', err);
    return null;
  }
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

    // Try real pump.fun launch
    const pumpResult = await launchOnPumpFun(b.data.name, b.data.symbol, b.data.imageUri || '');

    const mint = pumpResult?.mint ?? `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const signature = pumpResult?.signature ?? 'mock-signature';
    const token = {
      mint,
      name: b.data.name,
      symbol: b.data.symbol,
      description: b.data.description || '',
      creator: b.data.creator,
      platform: b.data.platform,
      streamerHandle: b.data.streamerHandle ?? '',
      launchedAt: new Date().toISOString(),
      signature,
      launchedBy: 'self',
    };
    launchedTokens.push(token);

    // Notify the streamer
    addNotification(b.data.creator, 'token_launched', `Your token $${b.data.symbol} has been launched!`, { mint, symbol: b.data.symbol });

    return { ok: true, token, pumpFunUrl: `https://pump.fun/coin/${mint}` };
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

    // Try real pump.fun launch
    const pumpResult = await launchOnPumpFun(b.data.name, b.data.symbol, b.data.imageUri || '');
    
    const mint = pumpResult?.mint ?? `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const signature = pumpResult?.signature ?? 'mock-signature';
    const token = {
      mint,
      name: b.data.name,
      symbol: b.data.symbol,
      description: b.data.description || '',
      creator: `streamer-${parsed.username}`,
      platform: parsed.platform,
      streamerHandle: parsed.username,
      launchedAt: new Date().toISOString(),
      signature,
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

    return { ok: true, token, streamer: { ...parsed, ...streamerData }, pumpFunUrl: `https://pump.fun/coin/${mint}` };
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

  // Serve token metadata JSON (for pump.fun)
  app.get('/metadata/:mint', async (req, reply) => {
    const { mint } = req.params as { mint: string };
    const token = launchedTokens.find(t => t.mint === mint);
    if (!token) return reply.code(404).send({ error: 'token not found' });
    
    const imageUri = imageStore.get(mint) || '';
    const backendUrl = process.env.OAUTH_REDIRECT_BASE_URL?.replace('/auth', '') || 'https://streampad-backend.onrender.com';
    const imageUrl = imageUri.startsWith('data:') 
      ? `${backendUrl}/images/${mint}`
      : (imageUri || '');
    
    return {
      name: token.name,
      symbol: token.symbol,
      description: token.description || '',
      image: imageUrl,
      showName: true,
      createdOn: 'https://streampad.wtf',
    };
  });

  // Serve token image
  app.get('/images/:mint', async (req, reply) => {
    const { mint } = req.params as { mint: string };
    const imageUri = imageStore.get(mint);
    if (!imageUri) return reply.code(404).send({ error: 'image not found' });
    
    if (imageUri.startsWith('data:')) {
      const match = imageUri.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const contentType = match[1]!;
        const base64Data = match[2]!;
        const buffer = Buffer.from(base64Data, 'base64');
        reply.header('Content-Type', contentType);
        reply.header('Cache-Control', 'public, max-age=31536000');
        return reply.send(buffer);
      }
    }
    
    return reply.redirect(imageUri);
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
