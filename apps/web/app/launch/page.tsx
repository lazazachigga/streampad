'use client';

import { useState, useEffect } from 'react';
import { endpoints } from '../../lib/api';

const BACKEND = 'https://streampad-backend.onrender.com';

interface StreamerInfo {
  platform: string;
  username: string;
  displayName: string;
  profileImageUrl: string;
  followers: number;
  isLive: boolean;
  streamTitle: string;
  viewerCount: number;
}

export default function LaunchPage() {
  const [tab, setTab] = useState<'self' | 'streamer'>('self');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Self launch form
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Launch for streamer form
  const [streamerUrl, setStreamerUrl] = useState('');
  const [sName, setSName] = useState('');
  const [sSymbol, setSSymbol] = useState('');
  const [sDescription, setSDescription] = useState('');
  const [sImageUri, setSImageUri] = useState('');
  const [sImageFile, setSImageFile] = useState<File | null>(null);
  const [sImagePreview, setSImagePreview] = useState<string | null>(null);
  const [streamerInfo, setStreamerInfo] = useState<StreamerInfo | null>(null);
  const [streamerLoading, setStreamerLoading] = useState(false);

  // Fetch streamer info when URL changes
  useEffect(() => {
    if (tab !== 'streamer' || !streamerUrl) { setStreamerInfo(null); return; }
    const match = streamerUrl.match(/(twitch\.tv|kick\.com)\/([a-zA-Z0-9_]+)/);
    if (!match) { setStreamerInfo(null); return; }
    const platform = match[1].includes('twitch') ? 'twitch' : 'kick';
    const username = match[2];
    setStreamerLoading(true);
    fetch(`${BACKEND}/streamers/${platform}/${username}`)
      .then(r => r.json())
      .then(data => { if (data.platform) setStreamerInfo(data); else setStreamerInfo(null); })
      .catch(() => setStreamerInfo(null))
      .finally(() => setStreamerLoading(false));
  }, [streamerUrl, tab]);

  const handleImageUpload = (file: File | null, setPreview: (v: string | null) => void, setUri: (v: string) => void) => {
    if (!file) { setPreview(null); setUri(''); return; }
    // Validate
    if (!file.type.startsWith('image/')) { setError('File must be an image (PNG, JPG, GIF, WebP)'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      setUri(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSelfLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await endpoints.launch({ name, symbol, description, imageUri, creator: 'self', platform: 'twitch' });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Launch failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStreamerLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${BACKEND}/tokens/launch-for-streamer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamerUrl, name: sName, symbol: sSymbol, description: sDescription, imageUri: sImageUri }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = typeof data.error === 'string' ? data.error : (data.error?.message || JSON.stringify(data.error) || 'Launch failed');
        throw new Error(errMsg);
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Launch failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">Launch a token</h1>
      <p className="text-zinc-400 mb-8">Launch on pump.fun with 75/25 fee sharing (streamer/protocol).</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setTab('self'); setResult(null); setError(null); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === 'self' ? 'bg-volt text-black' : 'bg-surface-2 text-text-secondary hover:bg-surface-3'}`}
        >
          Launch my token
        </button>
        <button
          onClick={() => { setTab('streamer'); setResult(null); setError(null); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === 'streamer' ? 'bg-volt text-black' : 'bg-surface-2 text-text-secondary hover:bg-surface-3'}`}
        >
          Launch for a streamer
        </button>
      </div>

      {tab === 'self' ? (
        <form onSubmit={handleSelfLaunch} className="space-y-5 rounded-2xl border border-surface-3 bg-surface-1 p-6">
          <div>
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl bg-surface-2 border border-surface-3 px-3 py-2 text-sm focus:outline-none focus:border-twitch" placeholder="My Token" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Symbol</label>
            <input value={symbol} onChange={e => setSymbol(e.target.value)} className="w-full rounded-xl bg-surface-2 border border-surface-3 px-3 py-2 text-sm focus:outline-none focus:border-twitch" placeholder="MTK" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-xl bg-surface-2 border border-surface-3 px-3 py-2 text-sm focus:outline-none focus:border-twitch" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Image</label>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={e => handleImageUpload(e.target.files?.[0] || null, setImagePreview, setImageUri)}
                className="w-full rounded-xl bg-surface-2 border border-surface-3 px-3 py-2 text-sm focus:outline-none focus:border-twitch file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-volt file:text-black file:text-xs file:font-bold"
              />
              <p className="text-xs text-text-secondary">PNG, JPG, GIF or WebP. Max 2MB.</p>
              {imagePreview && (
                <div className="mt-2">
                  <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-xl object-cover border border-surface-3" />
                </div>
              )}
            </div>
          </div>
          <div className="rounded-xl bg-surface-2 p-4 text-sm">
            <div className="font-semibold mb-1">Definitive split</div>
            <div className="flex justify-between text-zinc-400">
              <span>Streamer</span><span className="text-kick font-mono">75%</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Protocol</span><span className="text-twitch font-mono">25%</span>
            </div>
            <p className="text-xs text-zinc-500 mt-2">The split is definitive on pump.fun and cannot be changed.</p>
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-twitch text-white font-medium hover:bg-twitch-dark transition disabled:opacity-50">
            {loading ? 'Launching...' : 'Launch my token'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleStreamerLaunch} className="space-y-5 rounded-2xl border border-surface-3 bg-surface-1 p-6">
          <div>
            <label className="block text-sm font-medium mb-1.5">Streamer URL (Twitch or Kick)</label>
            <input value={streamerUrl} onChange={e => setStreamerUrl(e.target.value)} className="w-full rounded-xl bg-surface-2 border border-surface-3 px-3 py-2 text-sm focus:outline-none focus:border-twitch" placeholder="https://twitch.tv/username or https://kick.com/username" required />
            <p className="text-xs text-text-secondary mt-1">The streamer will be notified and can claim their 75% fees.</p>
          </div>

          {/* Streamer info card */}
          {streamerLoading && (
            <div className="rounded-xl bg-surface-2 p-4 text-sm text-text-secondary">Loading streamer info...</div>
          )}
          {streamerInfo && (
            <div className="rounded-xl bg-surface-2 p-4 text-sm">
              <div className="flex items-center gap-3 mb-3">
                {streamerInfo.profileImageUrl && (
                  <img src={streamerInfo.profileImageUrl} alt={streamerInfo.displayName} className="w-12 h-12 rounded-full" />
                )}
                <div>
                  <div className="font-semibold">{streamerInfo.displayName}</div>
                  <div className="text-xs text-text-secondary">@{streamerInfo.username} on {streamerInfo.platform}</div>
                </div>
                <div className={`ml-auto px-2 py-1 rounded-full text-xs font-bold ${streamerInfo.isLive ? 'bg-red-500/20 text-red-400' : 'bg-surface-3 text-text-secondary'}`}>
                  {streamerInfo.isLive ? '🔴 LIVE' : 'Offline'}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-lg font-mono font-bold text-volt">{streamerInfo.followers.toLocaleString()}</div>
                  <div className="text-[10px] text-text-secondary uppercase">Followers</div>
                </div>
                {streamerInfo.isLive && (
                  <>
                    <div>
                      <div className="text-lg font-mono font-bold text-kick">{streamerInfo.viewerCount.toLocaleString()}</div>
                      <div className="text-[10px] text-text-secondary uppercase">Viewers</div>
                    </div>
                    <div className="col-span-1">
                      <div className="text-xs text-text-secondary truncate">{streamerInfo.streamTitle}</div>
                      <div className="text-[10px] text-text-secondary uppercase">Title</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Token Name</label>
            <input value={sName} onChange={e => setSName(e.target.value)} className="w-full rounded-xl bg-surface-2 border border-surface-3 px-3 py-2 text-sm focus:outline-none focus:border-twitch" placeholder="Streamer Token" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Symbol</label>
            <input value={sSymbol} onChange={e => setSSymbol(e.target.value)} className="w-full rounded-xl bg-surface-2 border border-surface-3 px-3 py-2 text-sm focus:outline-none focus:border-twitch" placeholder="STRM" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea value={sDescription} onChange={e => setSDescription(e.target.value)} className="w-full rounded-xl bg-surface-2 border border-surface-3 px-3 py-2 text-sm focus:outline-none focus:border-twitch" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Image</label>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={e => handleImageUpload(e.target.files?.[0] || null, setSImagePreview, setSImageUri)}
                className="w-full rounded-xl bg-surface-2 border border-surface-3 px-3 py-2 text-sm focus:outline-none focus:border-twitch file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-volt file:text-black file:text-xs file:font-bold"
              />
              <p className="text-xs text-text-secondary">PNG, JPG, GIF or WebP. Max 2MB.</p>
              {sImagePreview && (
                <div className="mt-2">
                  <img src={sImagePreview} alt="Preview" className="w-20 h-20 rounded-xl object-cover border border-surface-3" />
                </div>
              )}
            </div>
          </div>
          <div className="rounded-xl bg-surface-2 p-4 text-sm">
            <div className="font-semibold mb-1">Definitive split</div>
            <div className="flex justify-between text-zinc-400">
              <span>Streamer</span><span className="text-kick font-mono">75%</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Protocol</span><span className="text-twitch font-mono">25%</span>
            </div>
            <p className="text-xs text-zinc-500 mt-2">The streamer can claim their 75% at any time. The split is definitive.</p>
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-kick text-black font-bold hover:bg-kick-dark transition disabled:opacity-50">
            {loading ? 'Launching...' : 'Launch for streamer'}
          </button>
        </form>
      )}

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-down/10 border border-down/30 text-down text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 rounded-xl bg-kick/10 border border-kick/30 text-sm">
          <p className="text-kick font-semibold">✅ Token launched!</p>
          <p className="text-text-secondary mt-1">Mint: {result.token?.mint}</p>
          <p className="text-text-secondary">Symbol: {result.token?.symbol}</p>
          {result.streamer && <p className="text-text-secondary">Streamer: @{result.streamer.username} on {result.streamer.platform}</p>}
          {result.streamer?.followers !== undefined && (
            <p className="text-text-secondary">Followers: {result.streamer.followers?.toLocaleString()}</p>
          )}
          {result.token?.mint && (
            <a
              href={result.pumpFunUrl || `https://pump.fun/coin/${result.token.mint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl bg-volt text-black text-sm font-bold hover:bg-volt-dark transition"
            >
              View on pump.fun ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}