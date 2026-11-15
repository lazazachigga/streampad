'use client';

import { useEffect, useState } from 'react';
import { endpoints } from '../lib/api';

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'https://streampad-backend.onrender.com';

interface Token {
  mint: string;
  name: string;
  symbol: string;
  streamer: string;
  platform: string;
  marketCap: string;
  change: string;
}

const MOCK_TOKENS: Token[] = [
  { mint: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', name: 'Alpha Stream', symbol: 'ALPHA', streamer: 'TwitchStreamer', platform: 'twitch', marketCap: '12.4K', change: '+8.2%' },
  { mint: '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E', name: 'KickClips', symbol: 'KICK', streamer: 'KickCreator', platform: 'kick', marketCap: '8.1K', change: '+3.1%' },
  { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', name: 'NightOwl', symbol: 'OWL', streamer: 'NightOwlTV', platform: 'twitch', marketCap: '24.7K', change: '-1.4%' },
];

function PlatformBadge({ platform }: { platform: string }) {
  if (platform === 'twitch') {
    return <span className="text-xs px-2.5 py-1 rounded-full bg-twitch/20 text-twitch-light font-mono font-medium">Twitch</span>;
  }
  return <span className="text-xs px-2.5 py-1 rounded-full bg-kick/20 text-kick-light font-mono font-medium">Kick</span>;
}

function AuthButtons({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const padding = size === 'lg' ? 'px-8 py-4 text-base' : size === 'sm' ? 'px-4 py-2 text-sm' : 'px-6 py-3 text-sm';
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <a
        href={`${BACKEND}/auth/twitch/login`}
        className={`flex items-center justify-center gap-2.5 ${padding} rounded-lg bg-twitch text-white font-semibold hover:bg-twitch-dark transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-twitch/20`}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
        </svg>
        Continue with Twitch
      </a>
      <a
        href={`${BACKEND}/auth/x/login`}
        className={`flex items-center justify-center gap-2.5 ${padding} rounded-lg bg-white text-black font-semibold hover:bg-zinc-100 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg`}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Continue with X
      </a>
    </div>
  );
}

export default function HomePage() {
  const [tokens, setTokens] = useState<Token[]>(MOCK_TOKENS);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ totalFeesDistributed: number; tokensLaunched: number; activeStreamers: number; volume24h: number; claimsCount: number } | null>(null);

  useEffect(() => {
    Promise.all([
      endpoints.tokens().catch(() => ({ tokens: [] })),
      endpoints.stats().catch(() => null),
    ]).then(([t, s]) => {
      if (t.tokens && Array.isArray(t.tokens) && t.tokens.length > 0) {
        setTokens(t.tokens as Token[]);
      }
      if (s) setStats(s as typeof stats);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen">
      {/* Ticker */}
      <div className="border-b border-surface-3 bg-surface-1 overflow-hidden h-9 flex items-center">
        <div className="animate-marquee whitespace-nowrap text-xs font-mono text-text-secondary">
          <span className="mx-6">@streamer claimed 12.4 SOL</span>
          <span className="mx-6 text-volt">●</span>
          <span className="mx-6">$ALPHA +184% 24h</span>
          <span className="mx-6 text-volt">●</span>
          <span className="mx-6">new token: $OWL</span>
          <span className="mx-6 text-volt">●</span>
          <span className="mx-6">@streamer claimed 12.4 SOL</span>
          <span className="mx-6 text-volt">●</span>
          <span className="mx-6">$ALPHA +184% 24h</span>
          <span className="mx-6 text-volt">●</span>
          <span className="mx-6">new token: $OWL</span>
          <span className="mx-6 text-volt">●</span>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-twitch/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-surface-3 bg-surface-1 text-xs font-mono text-text-secondary mb-6">
                <span className="w-2 h-2 rounded-full bg-kick animate-pulse" />
                Live on Solana
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-black tracking-tight leading-[0.85] mb-6">
                YOUR STREAM.<br />
                YOUR TOKEN.<br />
                <span className="text-volt">YOUR FEES.</span>
              </h1>
              <p className="text-text-secondary text-lg md:text-xl mb-8 max-w-lg leading-relaxed">
                75% of fees for you, on-chain. Connect Twitch or Kick, wallet created automatically, claim in one click.
              </p>
              <AuthButtons size="lg" />
              <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6">
                {[
                  { value: stats?.totalFeesDistributed ?? '12.4', label: 'SOL distributed' },
                  { value: stats?.tokensLaunched ?? 42, label: 'Tokens launched' },
                  { value: stats?.activeStreamers ?? 18, label: 'Active streamers' },
                  { value: stats?.claimsCount ?? '1.2K', label: 'Claims' },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="text-2xl md:text-3xl font-mono font-bold tabular-nums">{m.value}</div>
                    <div className="text-xs text-text-secondary mt-1">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="rounded-2xl border border-surface-3 bg-surface-1 p-6 aspect-[9/16] max-h-[520px] flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-twitch to-kick flex items-center justify-center">
                  <span className="text-2xl">▶</span>
                </div>
                <p className="text-text-secondary text-sm text-center">Reels coming soon</p>
                <p className="text-xs text-text-secondary/60 text-center">Streamer clips will appear here</p>
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-volt/10 rounded-full blur-2xl" />
              <div className="absolute -top-4 -left-4 w-32 h-32 bg-twitch/10 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-surface-3">
        <div className="text-xs font-mono text-volt mb-4 tracking-widest">01 — HOW IT WORKS</div>
        <h2 className="text-3xl md:text-4xl font-display font-bold mb-10">3 steps to your token</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'Connect', desc: 'Twitch or Kick, in 1 click. No email, no password.', icon: '🔗' },
            { step: '02', title: 'Wallet', desc: 'Created automatically, non-custodial. You own the keys.', icon: '👛' },
            { step: '03', title: 'Claim', desc: 'Your fees, in 1 click. On-chain, verifiable.', icon: '💰' },
          ].map((s) => (
            <div key={s.step} className="group rounded-xl border border-surface-3 bg-surface-1 p-6 hover:border-volt/50 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl font-display font-black text-volt">{s.step}</div>
                <span className="text-2xl">{s.icon}</span>
              </div>
              <div className="font-semibold text-lg mb-2">{s.title}</div>
              <div className="text-sm text-text-secondary leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Tokens */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-surface-3">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs font-mono text-volt mb-4 tracking-widest">02 — TOKENS</div>
            <h2 className="text-3xl md:text-4xl font-display font-bold">Live tokens</h2>
          </div>
          <a href="/launch" className="hidden sm:block px-4 py-2 text-sm font-semibold text-volt hover:underline">
            Launch yours →
          </a>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tokens.map((t) => (
            <a
              key={t.mint}
              href={`/token/${t.mint}`}
              className="group block rounded-xl border border-surface-3 bg-surface-1 p-5 hover:border-volt/50 transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-text-primary group-hover:text-volt transition">{t.name}</div>
                  <div className="text-xs text-text-secondary font-mono">${t.symbol}</div>
                </div>
                <PlatformBadge platform={t.platform} />
              </div>
              <div className="text-sm text-text-secondary mb-4">by {t.streamer}</div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs text-text-secondary">Market cap</div>
                  <div className="font-mono text-sm font-medium">${t.marketCap}</div>
                </div>
                <div className={`text-sm font-mono font-medium ${t.change.startsWith('+') ? 'text-up' : 'text-down'}`}>
                  {t.change}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-surface-3">
        <div className="text-xs font-mono text-volt mb-4 tracking-widest">03 — METRICS</div>
        <h2 className="text-3xl md:text-4xl font-display font-bold mb-8">Live metrics</h2>
        {loading ? (
          <p className="text-text-secondary">Loading...</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Fees distributed to streamers', value: stats ? `${stats.totalFeesDistributed} SOL` : '12.4 SOL', demo: !stats },
              { label: 'Tokens launched', value: stats ? String(stats.tokensLaunched) : '42', demo: !stats },
              { label: 'Active streamers', value: stats ? String(stats.activeStreamers) : '18', demo: !stats },
              { label: 'Volume 24h', value: stats ? `$${stats.volume24h}` : '$1.2K', demo: !stats },
              { label: 'Claims', value: stats ? String(stats.claimsCount) : '1.2K', demo: !stats },
              { label: 'Definitive split', value: '75 / 25', demo: false },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-surface-3 bg-surface-1 p-5">
                <div className="text-xs text-text-secondary mb-2">{m.label}</div>
                <div className="text-2xl font-mono font-bold tabular-nums">{m.value}</div>
                {m.demo && <div className="text-[10px] text-volt mt-2 font-mono uppercase tracking-wider">Demo data</div>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Transparency */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-surface-3">
        <div className="rounded-2xl border border-surface-3 bg-surface-1 p-8 md:p-12">
          <div className="text-xs font-mono text-volt mb-4 tracking-widest">TRANSPARENCY</div>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Verifiable on-chain</h2>
          <p className="text-text-secondary mb-6 max-w-2xl">
            Program address, Solscan link, definitive split on-chain. No yield promises — buybacks are described as transparency on fee usage.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="/transparency" className="px-5 py-2.5 rounded-lg border border-surface-3 text-sm font-semibold hover:bg-surface-2 transition">
              View transparency
            </a>
            <a href="https://solscan.io" target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 rounded-lg border border-surface-3 text-sm font-semibold hover:bg-surface-2 transition">
              Solscan ↗
            </a>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-surface-3">
        <div className="rounded-2xl border border-volt/20 bg-gradient-to-br from-surface-1 to-surface-1 p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-twitch/5 to-kick/5 pointer-events-none" />
          <h2 className="text-3xl md:text-5xl font-display font-black mb-4 relative">Launch your token</h2>
          <p className="text-text-secondary mb-8 relative">75% for you. Non-negotiable, unchangeable.</p>
          <div className="relative">
            <AuthButtons />
          </div>
          <p className="text-xs text-text-secondary mt-8 relative">
            Tokens are volatile. You can lose everything you invest. This is not financial advice.
          </p>
        </div>
      </section>
    </div>
  );
}
