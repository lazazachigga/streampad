'use client';

import { useState } from 'react';
import { endpoints } from '../../lib/api';

const BACKEND = 'https://streampad-backend.onrender.com';

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

  // Launch for streamer form
  const [streamerUrl, setStreamerUrl] = useState('');
  const [sName, setSName] = useState('');
  const [sSymbol, setSSymbol] = useState('');
  const [sDescription, setSDescription] = useState('');
  const [sImageUri, setSImageUri] = useState('');

  const handleSelfLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await endpoints.launch({ name, symbol, description, imageUri, creator: 'self', platform: 'twitch' });
      setResult(res);
    } catch (err: any) {
      setError(err.message);
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
      setError(err.message);
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
            <label className="block text-sm font-medium mb-1.5">Image URL</label>
            <input value={imageUri} onChange={e => setImageUri(e.target.value)} className="w-full rounded-xl bg-surface-2 border border-surface-3 px-3 py-2 text-sm focus:outline-none focus:border-twitch" placeholder="https://..." />
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
            <label className="block text-sm font-medium mb-1.5">Image URL</label>
            <input value={sImageUri} onChange={e => setSImageUri(e.target.value)} className="w-full rounded-xl bg-surface-2 border border-surface-3 px-3 py-2 text-sm focus:outline-none focus:border-twitch" placeholder="https://..." />
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
          {result.token?.mint && (
            <a
              href={`https://pump.fun/coin/${result.token.mint}`}
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
