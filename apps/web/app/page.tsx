'use client';

import { useEffect, useState, useRef } from 'react';
import { endpoints } from '../lib/api';

const BACKEND = 'https://streampad-backend.onrender.com';

interface Token {
  mint: string;
  name: string;
  symbol: string;
  streamer: string;
  platform: string;
  marketCap: string;
  change: string;
}

const MOCK_TOKENS: Token[] = [];

function PlatformBadge({ platform }: { platform: string }) {
  if (platform === 'twitch') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-gradient-to-r from-twitch/20 to-twitch/10 text-twitch-light font-mono font-medium border border-twitch/30 backdrop-blur">
        <span className="w-1.5 h-1.5 rounded-full bg-twitch animate-pulse" />
        Twitch
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-gradient-to-r from-kick/20 to-kick/10 text-kick-light font-mono font-medium border border-kick/30 backdrop-blur">
      <span className="w-1.5 h-1.5 rounded-full bg-kick animate-pulse" />
      Kick
    </span>
  );
}

function AuthButtons({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const padding = size === 'lg' ? 'px-10 py-5 text-lg' : size === 'sm' ? 'px-5 py-2.5 text-sm' : 'px-7 py-3.5 text-base';
  return (
    <div className="flex flex-col sm:flex-row gap-4 flex-wrap justify-center">
      <a
        href={`${BACKEND}/auth/twitch/login`}
        className={`group relative flex items-center justify-center gap-3 ${padding} rounded-2xl bg-gradient-to-r from-twitch to-twitch-dark text-white font-bold overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-twitch/40 active:scale-[0.98]`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        <svg className="w-6 h-6 relative z-10 group-hover:rotate-12 transition-transform duration-300" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
        </svg>
        <span className="relative z-10">Twitch</span>
      </a>
      <a
        href={`${BACKEND}/auth/kick/login`}
        className={`group relative flex items-center justify-center gap-3 ${padding} rounded-2xl bg-gradient-to-r from-kick to-kick-dark text-black font-bold overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-kick/40 active:scale-[0.98]`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/0 via-black/10 to-black/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        <svg className="w-6 h-6 relative z-10 group-hover:rotate-12 transition-transform duration-300" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
        <span className="relative z-10">Kick</span>
      </a>
    </div>
  );
}

// Floating orb component
function FloatingOrb({ color, size, top, left, delay }: { color: string; size: string; top: string; left: string; delay: string }) {
  return (
    <div
      className="absolute rounded-full blur-3xl animate-float pointer-events-none"
      style={{
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        width: size,
        height: size,
        top,
        left,
        animationDelay: delay,
        opacity: 0.4,
      }}
    />
  );
}

// Counter animation
function AnimatedCounter({ value, suffix = '' }: { value: string | number; suffix?: string }) {
  const [display, setDisplay] = useState('0');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value;
    if (isNaN(num)) { setDisplay(String(value)); return; }
    const duration = 1500;
    const steps = 40;
    const increment = num / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= num) {
        setDisplay(String(value));
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current).toLocaleString());
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return <div ref={ref} className="tabular-nums">{display}{suffix}</div>;
}

export default function HomePage() {
  const [tokens, setTokens] = useState<Token[]>(MOCK_TOKENS);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ totalFeesDistributed: number; tokensLaunched: number; activeStreamers: number; volume24h: number; claimsCount: number } | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [solChange, setSolChange] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true')
      .then(r => r.json())
      .then(data => {
        if (data.solana) {
          setSolPrice(data.solana.usd);
          setSolChange(data.solana.usd_24h_change);
        }
      })
      .catch(() => {});

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

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePos({
          x: ((e.clientX - rect.left) / rect.width - 0.5) * 20,
          y: ((e.clientY - rect.top) / rect.height - 0.5) * 20,
        });
      }
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Ticker */}
      <div className="border-b border-surface-3 bg-surface-1/60 backdrop-blur-xl overflow-hidden h-10 flex items-center relative z-20">
        <div className="absolute inset-0 bg-gradient-to-r from-twitch/5 via-transparent to-kick/5" />
        <div className="animate-marquee whitespace-nowrap text-xs font-mono relative z-10">
          {solPrice && (
            <>
              <span className="mx-4 text-volt font-bold">SOL ${solPrice.toFixed(2)}</span>
              <span className={`mx-2 font-bold ${solChange && solChange >= 0 ? 'text-up' : 'text-down'}`}>
                {solChange ? `${solChange >= 0 ? '▲' : '▼'} ${Math.abs(solChange).toFixed(2)}%` : ''}
              </span>
              <span className="mx-4 text-text-secondary/40">│</span>
            </>
          )}
          {['@streamer claimed 12.4 SOL', '$ALPHA +184% 24h', 'new token: $OWL', '@streamer claimed 8.2 SOL', '$KICK +45% 24h', 'new token: $SKING'].map((item, i) => (
            <span key={i} className="mx-4 text-text-secondary hover:text-volt transition-colors cursor-default">
              {item} <span className="text-volt/40 mx-2">●</span>
            </span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Floating orbs */}
        <FloatingOrb color="#9146FF" size="400px" top="10%" left="5%" delay="0s" />
        <FloatingOrb color="#53FC18" size="350px" top="60%" left="70%" delay="2s" />
        <FloatingOrb color="#E8FF3A" size="300px" top="30%" left="80%" delay="4s" />
        <FloatingOrb color="#FF4D6D" size="250px" top="70%" left="20%" delay="1s" />

        <div className="max-w-7xl mx-auto px-6 py-20 md:py-32 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div style={{ transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)` }} className="transition-transform duration-300 ease-out">
              <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-volt/30 bg-volt/5 text-xs font-mono text-volt mb-8 backdrop-blur-xl shadow-lg shadow-volt/5">
                <span className="w-2 h-2 rounded-full bg-kick animate-pulse shadow-lg shadow-kick/50" />
                Live on Solana
                {solPrice && (
                  <span className="ml-1 text-text-secondary">
                    · SOL <span className="text-volt font-bold">${solPrice.toFixed(2)}</span>
                    <span className={`ml-1 ${solChange && solChange >= 0 ? 'text-up' : 'text-down'}`}>
                      {solChange ? `${solChange >= 0 ? '▲' : '▼'}${Math.abs(solChange).toFixed(1)}%` : ''}
                    </span>
                  </span>
                )}
              </div>

              <h1 className="text-6xl md:text-8xl lg:text-9xl font-display font-black tracking-tighter leading-[0.8] mb-8">
                <span className="block text-text-primary">YOUR</span>
                <span className="block text-text-primary">STREAM.</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-volt via-kick to-volt bg-[length:200%_auto] animate-gradient">
                  YOUR TOKEN.
                </span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-twitch via-volt to-twitch bg-[length:200%_auto] animate-gradient" style={{ animationDelay: '0.5s' }}>
                  YOUR FEES.
                </span>
              </h1>

              <p className="text-text-secondary text-xl md:text-2xl mb-10 max-w-xl leading-relaxed">
                75% of fees for you, <span className="text-volt font-semibold">on-chain</span>. Connect Twitch or Kick, wallet created automatically, claim in one click.
              </p>

              <AuthButtons size="lg" />

              <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6">
                {[
                  { value: stats?.totalFeesDistributed ?? 0, label: 'SOL distributed', color: 'volt' },
                  { value: stats?.tokensLaunched ?? 0, label: 'Tokens launched', color: 'twitch' },
                  { value: stats?.activeStreamers ?? 0, label: 'Active streamers', color: 'kick' },
                  { value: stats?.claimsCount ?? 0, label: 'Claims', color: 'up' },
                ].map((m, i) => (
                  <div key={m.label} className="group relative" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className={`text-3xl md:text-4xl font-mono font-black tabular-nums text-${m.color} group-hover:scale-110 transition-transform duration-300`}>
                      <AnimatedCounter value={m.value} />
                    </div>
                    <div className="text-xs text-text-secondary mt-1 uppercase tracking-wider">{m.label}</div>
                    <div className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-${m.color} group-hover:w-full transition-all duration-500`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive 3D-like card */}
            <div className="relative hidden lg:block transition-transform duration-300 ease-out" style={{ transform: `translate(${mousePos.x * -0.3}px, ${mousePos.y * -0.3}px)` }}>
              <div className="relative w-full max-w-md mx-auto">
                {/* Glow behind */}
                <div className="absolute inset-0 bg-gradient-to-br from-twitch/30 via-volt/20 to-kick/30 rounded-3xl blur-3xl scale-110 animate-pulse" />
                
                {/* Main card */}
                <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-surface-1/80 to-surface-1/40 backdrop-blur-2xl p-8 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-twitch to-kick flex items-center justify-center shadow-lg">
                        <span className="text-xl font-black text-white">S</span>
                      </div>
                      <div>
                        <div className="font-bold text-lg">StreamPad</div>
                        <div className="text-xs text-text-secondary">Launchpad</div>
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-kick/20 text-kick text-xs font-mono border border-kick/30">
                      LIVE
                    </div>
                  </div>

                  {/* Token preview cards */}
                  <div className="space-y-3">
                    {tokens.length === 0 ? (
                      <div className="text-center py-8 text-text-secondary">
                        <div className="text-4xl mb-3">🚀</div>
                        <div className="font-semibold">No tokens launched yet</div>
                        <div className="text-xs mt-1">Be the first to launch!</div>
                      </div>
                    ) : (
                      tokens.slice(0, 3).map((t, i) => (
                        <div key={t.mint} className="flex items-center justify-between p-3 rounded-xl bg-surface-0/50 border border-surface-3/50 hover:border-volt/30 transition-all hover:translate-x-1 group">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${t.platform === 'twitch' ? 'bg-twitch/20 text-twitch-light' : 'bg-kick/20 text-kick-light'}`}>
                              ${t.symbol.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-sm group-hover:text-volt transition">{t.name}</div>
                              <div className="text-xs text-text-secondary">${t.symbol} · @{t.streamer}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-mono font-bold">${t.marketCap}</div>
                            <div className={`text-xs font-mono ${t.change.startsWith('+') ? 'text-up' : 'text-down'}`}>{t.change}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Stats bar */}
                  <div className="mt-6 pt-6 border-t border-surface-3/50">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-mono font-bold text-volt">75%</div>
                        <div className="text-[10px] text-text-secondary uppercase">Streamer</div>
                      </div>
                      <div>
                        <div className="text-lg font-mono font-bold text-twitch">25%</div>
                        <div className="text-[10px] text-text-secondary uppercase">Protocol</div>
                      </div>
                      <div>
                        <div className="text-lg font-mono font-bold text-kick">100%</div>
                        <div className="text-[10px] text-text-secondary uppercase">On-chain</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating badges */}
                <div className="absolute -top-4 -right-4 px-4 py-2 rounded-full bg-gradient-to-r from-volt to-kick text-black text-xs font-bold shadow-lg shadow-volt/30 animate-bounce">
                  🚀 Launch yours
                </div>
                <div className="absolute -bottom-4 -left-4 px-4 py-2 rounded-full bg-surface-1 border border-surface-3 text-xs font-mono text-text-secondary shadow-lg backdrop-blur">
                  {solPrice ? `SOL $${solPrice.toFixed(2)}` : 'Loading...'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works - interactive cards */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-surface-3/50">
        <div className="text-center mb-16">
          <div className="text-xs font-mono text-volt mb-4 tracking-widest">01 — HOW IT WORKS</div>
          <h2 className="text-4xl md:text-6xl font-display font-black mb-4">
            3 steps to your <span className="text-transparent bg-clip-text bg-gradient-to-r from-volt to-kick">token</span>
          </h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            From stream to token in under 60 seconds. No code, no complexity.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Connect', desc: 'Twitch or Kick, in 1 click. No email, no password, no forms.', icon: '🔗', gradient: 'from-twitch to-twitch-dark', glow: 'twitch' },
            { step: '02', title: 'Wallet', desc: 'Created automatically, non-custodial. You own the keys, always.', icon: '👛', gradient: 'from-volt to-volt-dark', glow: 'volt' },
            { step: '03', title: 'Claim', desc: 'Your fees, in 1 click. On-chain, verifiable, instant.', icon: '💰', gradient: 'from-kick to-kick-dark', glow: 'kick' },
          ].map((s, i) => (
            <div
              key={s.step}
              className="group relative rounded-3xl border border-surface-3/50 bg-gradient-to-br from-surface-1/80 to-surface-1/40 backdrop-blur-xl p-8 hover:border-volt/40 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-volt/10 cursor-pointer overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-volt/0 to-volt/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <span className={`text-6xl font-display font-black bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent`}>
                    {s.step}
                  </span>
                  <span className="text-4xl group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500">{s.icon}</span>
                </div>
                <h3 className="text-2xl font-display font-bold mb-3 group-hover:text-volt transition-colors">{s.title}</h3>
                <p className="text-text-secondary leading-relaxed">{s.desc}</p>
                <div className={`mt-6 h-1 w-0 bg-gradient-to-r ${s.gradient} group-hover:w-full transition-all duration-700 rounded-full`} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tokens - interactive grid */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-surface-3/50">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="text-xs font-mono text-volt mb-4 tracking-widest">02 — LIVE TOKENS</div>
            <h2 className="text-4xl md:text-6xl font-display font-black">
              Trending <span className="text-transparent bg-clip-text bg-gradient-to-r from-volt to-kick">tokens</span>
            </h2>
          </div>
          <a href="/launch" className="group inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-volt to-volt-dark text-black font-bold hover:shadow-lg hover:shadow-volt/30 transition-all hover:scale-105">
            Launch yours
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tokens.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <div className="text-6xl mb-4">🚀</div>
              <div className="text-2xl font-display font-bold mb-2">No tokens launched yet</div>
              <p className="text-text-secondary mb-6">Be the first streamer to launch a token on StreamPad.</p>
              <a href="/launch" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-volt to-volt-dark text-black font-bold hover:shadow-lg hover:shadow-volt/30 transition-all hover:scale-105">
                Launch your token
              </a>
            </div>
          ) : (
            tokens.map((t, i) => (
            <a
              key={t.mint}
              href={`/token/${t.mint}`}
              className="group block rounded-3xl border border-surface-3/50 bg-gradient-to-br from-surface-1/60 to-surface-1/30 backdrop-blur-xl p-6 hover:border-volt/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-volt/5 relative overflow-hidden"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-volt/5 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold transition-transform group-hover:scale-110 group-hover:rotate-6 ${t.platform === 'twitch' ? 'bg-gradient-to-br from-twitch/30 to-twitch/10 text-twitch-light border border-twitch/30' : 'bg-gradient-to-br from-kick/30 to-kick/10 text-kick-light border border-kick/30'}`}>
                      ${t.symbol.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-lg group-hover:text-volt transition-colors">{t.name}</div>
                      <div className="text-xs text-text-secondary font-mono">${t.symbol}</div>
                    </div>
                  </div>
                  <PlatformBadge platform={t.platform} />
                </div>
                <div className="text-sm text-text-secondary mb-4">by <span className="text-text-primary font-medium">{t.streamer}</span></div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Market Cap</div>
                    <div className="font-mono text-lg font-bold">${t.marketCap}</div>
                  </div>
                  <div className={`text-lg font-mono font-bold ${t.change.startsWith('+') ? 'text-up' : 'text-down'}`}>
                    {t.change.startsWith('+') ? '▲' : '▼'} {t.change}
                  </div>
                </div>
              </div>
            </a>
          ))
          )
      }
        </div>
      </section>

      {/* Metrics - animated */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-surface-3/50">
        <div className="text-center mb-16">
          <div className="text-xs font-mono text-volt mb-4 tracking-widest">03 — LIVE METRICS</div>
          <h2 className="text-4xl md:text-6xl font-display font-black">
            Real-time <span className="text-transparent bg-clip-text bg-gradient-to-r from-volt to-kick">numbers</span>
          </h2>
        </div>
        {loading ? (
          <div className="text-center text-text-secondary">Loading...</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { label: 'Fees distributed to streamers', value: stats ? `${stats.totalFeesDistributed} SOL` : '0 SOL', icon: '💰', gradient: 'from-volt to-kick' },
              { label: 'Tokens launched', value: stats ? String(stats.tokensLaunched) : '0', icon: '🚀', gradient: 'from-twitch to-volt' },
              { label: 'Active streamers', value: stats ? String(stats.activeStreamers) : '0', icon: '🎮', gradient: 'from-kick to-up' },
              { label: 'Volume 24h', value: stats ? `$${stats.volume24h}` : '$0', icon: '📊', gradient: 'from-volt to-twitch' },
              { label: 'Claims processed', value: stats ? String(stats.claimsCount) : '0', icon: '✅', gradient: 'from-up to-kick' },
              { label: 'Definitive split', value: '75 / 25', icon: '⚖️', gradient: 'from-twitch to-kick' },
            ].map((m, i) => (
              <div
                key={m.label}
                className="group relative rounded-3xl border border-surface-3/50 bg-gradient-to-br from-surface-1/60 to-surface-1/30 backdrop-blur-xl p-6 hover:border-volt/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${m.gradient} opacity-5 rounded-full blur-2xl group-hover:opacity-15 transition-opacity duration-500`} />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl group-hover:scale-125 transition-transform duration-300">{m.icon}</span>
                    <div className="text-xs text-text-secondary uppercase tracking-wider">{m.label}</div>
                  </div>
                  <div className={`text-3xl font-mono font-black tabular-nums bg-gradient-to-r ${m.gradient} bg-clip-text text-transparent`}>
                    {m.value}
                  </div>
                  {(!stats) && m.label !== 'Definitive split' && (
                    <div className="text-[10px] text-volt/60 mt-2 font-mono uppercase tracking-wider">Demo data</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Transparency - glassmorphism */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-surface-3/50">
        <div className="relative rounded-3xl border border-volt/20 bg-gradient-to-br from-surface-1/80 via-surface-1/50 to-surface-1/30 backdrop-blur-2xl p-10 md:p-16 overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-volt/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-twitch/5 rounded-full blur-3xl" />
          <div className="relative grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-mono text-volt mb-4 tracking-widest">TRANSPARENCY</div>
              <h2 className="text-4xl md:text-5xl font-display font-black mb-6">
                Verifiable <span className="text-transparent bg-clip-text bg-gradient-to-r from-volt to-kick">on-chain</span>
              </h2>
              <p className="text-text-secondary text-lg mb-8 leading-relaxed">
                Program address, Solscan link, definitive split on-chain. No yield promises — buybacks are described as transparency on fee usage. Every transaction is publicly verifiable.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="/transparency" className="group px-6 py-3 rounded-2xl border border-surface-3 bg-surface-1/50 text-sm font-bold hover:border-volt/50 hover:bg-volt/5 transition-all">
                  View transparency
                  <svg className="inline w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
                <a href="https://solscan.io" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-2xl border border-surface-3 bg-surface-1/50 text-sm font-bold hover:border-volt/50 hover:bg-volt/5 transition-all">
                  Solscan ↗
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Program', value: 'StreamVault', icon: '🔐' },
                { label: 'Network', value: 'Solana', icon: '🌐' },
                { label: 'Split', value: '75/25', icon: '⚖️' },
                { label: 'Status', value: 'Live', icon: '🟢' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-surface-3/50 bg-surface-0/50 backdrop-blur p-5 text-center hover:border-volt/30 transition-colors group">
                  <div className="text-2xl mb-2 group-hover:scale-125 transition-transform">{item.icon}</div>
                  <div className="text-xs text-text-secondary uppercase tracking-wider mb-1">{item.label}</div>
                  <div className="font-mono font-bold text-volt">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Onboard streamers */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-surface-3/50">
        <div className="rounded-3xl border border-kick/20 bg-gradient-to-br from-surface-1/80 via-kick/5 to-surface-1/40 backdrop-blur-2xl p-10 md:p-16 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-kick/10 rounded-full blur-3xl" />
          <div className="relative grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-mono text-kick mb-4 tracking-widest">ONBOARD STREAMERS</div>
              <h2 className="text-4xl md:text-5xl font-display font-black mb-6">
                Launch a token for <span className="text-transparent bg-clip-text bg-gradient-to-r from-kick to-volt">your favorite streamer</span>
              </h2>
              <p className="text-text-secondary text-lg mb-8 leading-relaxed">
                Know a Twitch or Kick streamer who should have a token? Launch one for them.
                They'll be notified and can claim their 75% fees at any time. You help them onboard.
              </p>
              <a href="/launch" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-kick to-kick-dark text-black font-bold hover:shadow-lg hover:shadow-kick/30 transition-all hover:scale-105">
                Launch for a streamer
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '🎮', label: 'Twitch streamers', desc: 'Launch for any Twitch creator' },
                { icon: '🟢', label: 'Kick streamers', desc: 'Launch for any Kick creator' },
                { icon: '💰', label: '75% to streamer', desc: 'They claim when ready' },
                { icon: '🔔', label: 'Auto-notify', desc: 'Streamer gets notified' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-surface-3/50 bg-surface-0/50 backdrop-blur p-5 text-center hover:border-kick/30 transition-colors group">
                  <div className="text-2xl mb-2 group-hover:scale-125 transition-transform">{item.icon}</div>
                  <div className="text-sm font-semibold mb-1">{item.label}</div>
                  <div className="text-xs text-text-secondary">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Buybacks & Transparency */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-surface-3/50">
        <div className="text-center mb-16">
          <div className="text-xs font-mono text-volt mb-4 tracking-widest">BUYBACKS & TRANSPARENCY</div>
          <h2 className="text-4xl md:text-6xl font-display font-black">
            Every fee, <span className="text-transparent bg-clip-text bg-gradient-to-r from-volt to-kick">verifiable</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: '💰', title: '25% Protocol Fees', desc: 'Every token launched generates 25% protocol fees, tracked on-chain.' },
            { icon: '🔄', title: 'Buybacks', desc: 'Protocol fees fund buybacks of the $SP token. Each buyback is logged with signature, amount, and avg price.' },
            { icon: '📊', title: 'Public Dashboard', desc: 'All fees, buybacks, and distributions are visible on the transparency page.' },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-surface-3/50 bg-surface-1/50 backdrop-blur-xl p-6 hover:border-volt/30 transition-colors group">
              <div className="text-3xl mb-4 group-hover:scale-125 transition-transform">{item.icon}</div>
              <h3 className="text-lg font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <a href="/transparency" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-surface-3 text-sm font-bold hover:border-volt/50 hover:bg-volt/5 transition-all">
            View full transparency
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </section>

      {/* Footer CTA - massive */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-surface-3/50">
        <div className="relative rounded-3xl border border-volt/30 bg-gradient-to-br from-surface-1/80 via-volt/5 to-surface-1/40 backdrop-blur-2xl p-12 md:p-20 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-twitch/10 via-volt/10 to-kick/10 pointer-events-none" />
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-volt/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-twitch/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="relative">
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-display font-black mb-6 leading-[0.9]">
              Launch your<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-volt via-kick to-volt bg-[length:200%_auto] animate-gradient">token today</span>
            </h2>
            <p className="text-text-secondary text-xl mb-12 max-w-2xl mx-auto">
              75% for you. Non-negotiable, unchangeable, forever.
            </p>
            <AuthButtons size="lg" />
            <p className="text-xs text-text-secondary mt-12 max-w-lg mx-auto">
              Tokens are volatile. You can lose everything you invest. This is not financial advice. External audit required before mainnet.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
