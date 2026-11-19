// apps/backend/src/routes/tokens.ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import BN from 'bn.js';

const LaunchBody = z.object({
  name: z.string().min(1).max(32),
  symbol: z.string().min(1).max(10),
  description: z.string().max(500).optional(),
  imageUri: z.string().max(2_000_000).optional(),
  creator: z.string().min(1),
  platform: z.enum(['twitch', 'kick']).default('twitch'),
  streamerHandle: z.string().optional(),
});

const LaunchForStreamerBody = z.object({
  streamerUrl: z.string().min(1),
  name: z.string().min(1).max(32),
  symbol: z.string().min(1).max(10),
  description: z.string().max(500).optional(),
  imageUri: z.string().max(2_000_000).optional(),
});

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

// In-memory image storage (mint -> base64 data URI)
const imageStore = new Map<string, string>();

async function validateTwitchUsername(username: string): Promise<boolean> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return true;
  try {
    const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
    });
    if (!tokenRes.ok) return true;
    const tokenData = (await tokenRes.json()) as { access_token: string };
    const userRes = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`, {
      headers: { 'Client-Id': clientId, 'Authorization': `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) return true;
    const userData = (await userRes.json()) as { data: Array<{ id: string }> };
    return Array.isArray(userData.data) && userData.data.length > 0;
  } catch {
    return true;
  }
}

async function validateKickUsername(username: string): Promise<boolean> {
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
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
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

async function fetchKickUserData(username: string): Promise<{ displayName: string; profileImageUrl: string; followers: number; isLive: boolean; streamTitle: string; viewerCount: number } | null> {
  try {
    const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(username)}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    if (!data || !data.user) return null;
    const user = data.user;
    const isLive = !!data.livestream;
    const streamTitle = data.livestream?.session_title || '';
    const viewerCount = data.livestream?.viewer_count || 0;
    return {
      displayName: user.username || username,
      profileImageUrl: user.profile_pic || '',
      followers: parseInt(data.followers_count) || 0,
      isLive,
      streamTitle,
      viewerCount,
    };
  } catch {
    return null;
  }
}

function parseStreamerUrl(url: string): { platform: 'twitch' | 'kick'; username: string } | null {
  const twitchMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  if (twitchMatch && twitchMatch[1]) return { platform: 'twitch', username: twitchMatch[1] };
  const kickMatch = url.match(/kick\.com\/([a-zA-Z0-9_]+)/);
  if (kickMatch && kickMatch[1]) return { platform: 'kick', username: kickMatch[1] };
  if (url.startsWith('@')) {
    const handle = url.slice(1);
    if (handle.length > 0) return { platform: 'twitch', username: handle };
  }
  return null;
}

// Durable metadata: image + JSON pinned to IPFS via Pinata (PINATA_JWT on Render)
async function uploadToPinata(file: Blob, fileName: string): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error('PINATA_JWT not set');
  const form = new FormData();
  form.append('network', 'public');
  form.append('file', file, fileName);
  const res = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });
  if (!res.ok) throw new Error(`pinata upload failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { data?: { cid?: string } };
  if (!json.data?.cid) throw new Error('pinata returned no cid');
  return json.data.cid;
}

async function buildMetadataUri(name: string, symbol: string, description: string, imageDataUri: string): Promise<string> {
  const match = imageDataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('image must be a base64 data URI');
  const bytes = Buffer.from(match[2]!, 'base64');
  const imageCid = await uploadToPinata(new Blob([bytes], { type: match[1]! }), `${symbol}-image`);
  const image = `https://ipfs.io/ipfs/${imageCid}`;
  const metaCid = await uploadToPinata(
    new Blob([JSON.stringify({ name, symbol, description, image, showName: true, createdOn: 'https://streampad.wtf' })], { type: 'application/json' }),
    `${symbol}-metadata.json`,
  );
  return `https://ipfs.io/ipfs/${metaCid}`;
}

// PumpPortal token creation (makes token visible on pump.fun)
async function launchViaPumpPortal(name: string, symbol: string, description: string, imageUri: string): Promise<{ mint: string; signature: string } | null> {
  const secret = process.env.LAUNCHER_WALLET_SECRET;
  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (!secret || !rpcUrl) return null;

  try {
    const { Connection, Keypair, VersionedTransaction } = await import('@solana/web3.js');
    const connection = new Connection(rpcUrl, 'confirmed');
    const launcher = Keypair.fromSecretKey(Buffer.from(secret, 'base64'));
    const mint = Keypair.generate();

    const metadataUri = await buildMetadataUri(name, symbol, description, imageUri);
    
    const response = await fetch('https://pumpportal.fun/api/trade-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: launcher.publicKey.toBase58(),
        action: 'create',
        tokenMetadata: {
          name,
          symbol,
          uri: metadataUri,
        },
        mint: mint.publicKey.toBase58(),
        denominatedInSol: 'true',
        amount: 0.001,
        slippage: 10,
        priorityFee: 0.00005,
        pool: 'pump',
      }),
    });
    
    if (!response.ok) {
      console.error('pumpportal failed:', response.status, await response.text());
      return null;
    }
    
    const txData = await response.arrayBuffer();
    const tx = VersionedTransaction.deserialize(new Uint8Array(txData));
    
    tx.sign([mint, launcher]);
    
    const signature = await connection.sendTransaction(tx, { skipPreflight: false });
    await connection.confirmTransaction(signature, 'confirmed');
    
    return { mint: mint.publicKey.toBase58(), signature };
  } catch (err) {
    console.error('pumpportal launch failed:', err);
    return null;
  }
}

export async function tokenRoutes(app: FastifyInstance): Promise<void> {
  // Serve token metadata JSON (for pump.fun)
  app.get('/metadata/:mint', async (req, reply) => {
    const { mint } = req.params as { mint: string };
    const token = launchedTokens.find(t => t.mint === mint);
    if (!token) return reply.code(404).send({ error: 'token not found' });
    
    // Allow cross-origin access for pump.fun
    reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
    reply.header('Access-Control-Allow-Origin', '*');
    
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
    
    // Allow cross-origin access for pump.fun
    reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET');
    
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

  // Launch a token
  app.post('/tokens/launch', async (req, reply) => {
    const b = LaunchBody.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: b.error.flatten() });

    const launcherSecret = process.env.LAUNCHER_WALLET_SECRET;
    if (!launcherSecret) {
      return reply.code(503).send({ error: 'launcher not configured', hint: 'Set LAUNCHER_WALLET_SECRET on Render' });
    }

    if (!process.env.PINATA_JWT) {
      return reply.code(503).send({ error: 'metadata storage not configured', hint: 'Set PINATA_JWT on Render (free Pinata account)' });
    }
    const pumpResult = await launchViaPumpPortal(b.data.name, b.data.symbol, b.data.description || '', b.data.imageUri || '');
    if (!pumpResult) {
      return reply.code(502).send({ error: 'token launch failed on-chain', hint: 'Check launcher wallet balance and RPC on Render' });
    }

    const mint = pumpResult.mint;
    const signature = pumpResult.signature;
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

    if (!process.env.PINATA_JWT) {
      return reply.code(503).send({ error: 'metadata storage not configured', hint: 'Set PINATA_JWT on Render (free Pinata account)' });
    }
    const pumpResult = await launchViaPumpPortal(b.data.name, b.data.symbol, b.data.description || '', b.data.imageUri || '');
    if (!pumpResult) {
      return reply.code(502).send({ error: 'token launch failed on-chain', hint: 'Check launcher wallet balance and RPC on Render' });
    }

    const mint = pumpResult.mint;
    const signature = pumpResult.signature;
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

    const streamerData = parsed.platform === 'twitch' 
      ? await fetchTwitchUserData(parsed.username) 
      : await fetchKickUserData(parsed.username);

    addNotification(
      `streamer-${parsed.username}`,
      'token_launched_for_you',
      `Someone launched a token for you: $${b.data.symbol} (${b.data.name})! Claim your fees at streampad.wtf`,
      { mint, symbol: b.data.symbol, name: b.data.name, platform: parsed.platform }
    );

    return { ok: true, token, streamer: { ...parsed, ...streamerData }, pumpFunUrl: `https://pump.fun/coin/${mint}` };
  });

  // Streamer info endpoint
  app.get('/streamers/:platform/:username', async (req, reply) => {
    const { platform, username } = req.params as { platform: string; username: string };
    
    if (platform === 'twitch') {
      const data = await fetchTwitchUserData(username);
      if (!data) return reply.code(404).send({ error: 'streamer not found' });
      
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
    
    if (platform === 'kick') {
      const data = await fetchKickUserData(username);
      if (!data) return reply.code(404).send({ error: 'streamer not found' });
      return { platform: 'kick', username, displayName: data.displayName, profileImageUrl: data.profileImageUrl, followers: data.followers, isLive: data.isLive, streamTitle: data.streamTitle, viewerCount: data.viewerCount };
    }
    
    return reply.code(400).send({ error: 'unsupported platform' });
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