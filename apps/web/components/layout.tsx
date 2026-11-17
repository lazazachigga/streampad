'use client';

import Link from 'next/link';
import { useWallet } from '../lib/wallet';
import { useMemo } from 'react';

const BACKEND = 'https://streampad-backend.onrender.com';

export function Header() {
  const { publicKey, disconnect, connect } = useWallet();
  const short = useMemo(() => (publicKey ? `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}` : null), [publicKey]);

  return (
    <header className="border-b border-surface-3 bg-surface-0/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-twitch to-kick flex items-center justify-center">
            <span className="text-sm font-black text-white">S</span>
          </div>
          <span className="text-lg font-bold tracking-tight font-display">
            <span className="text-volt">STREAM</span>
            <span className="text-text-primary">PAD</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
          <Link href="/" className="hover:text-text-primary transition">Tokens</Link>
          <Link href="/launch" className="hover:text-text-primary transition">Launch</Link>
          <Link href="/token/sp" className="hover:text-text-primary transition">StreamPad Token</Link>
          <Link href="/transparency" className="hover:text-text-primary transition">Transparency</Link>
        </nav>
        <div className="flex items-center gap-3">
          {publicKey ? (
            <button
              onClick={() => disconnect()}
              className="px-3 py-1.5 rounded-lg border border-surface-3 text-xs font-mono hover:bg-surface-2 transition"
            >
              {short} · Disconnect
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <a
                href={`${BACKEND}/auth/twitch/login`}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-twitch/10 text-twitch-light text-xs font-medium hover:bg-twitch/20 transition"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
                </svg>
                Twitch
              </a>
              <a
                href={`${BACKEND}/auth/kick/login`}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-kick/10 text-kick-light text-xs font-medium hover:bg-kick/20 transition"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                Kick
              </a>
              <button
                onClick={() => connect()}
                className="px-4 py-1.5 rounded-lg bg-volt text-black text-xs font-bold uppercase tracking-wider hover:bg-volt-dark transition"
              >
                Connect wallet
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-surface-3 bg-surface-0 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8 text-sm text-text-secondary">
        <div>
          <div className="font-bold text-text-primary mb-3 font-display text-lg">STREAMPAD</div>
          <p>pump.fun tokens for Twitch &amp; Kick streamers. 75/25 fee sharing, definitive.</p>
        </div>
        <div>
          <div className="font-semibold text-text-primary mb-3">Product</div>
          <ul className="space-y-2">
            <li><Link href="/" className="hover:text-text-primary transition">Tokens</Link></li>
            <li><Link href="/launch" className="hover:text-text-primary transition">Launch</Link></li>
            <li><Link href="/token/sp" className="hover:text-text-primary transition">$SP Token</Link></li>
            <li><Link href="/transparency" className="hover:text-text-primary transition">Transparency</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-text-primary mb-3">Account</div>
          <ul className="space-y-2">
            <li><a href={`${BACKEND}/auth/twitch/login`} className="hover:text-text-primary transition">Sign in with Twitch</a></li>
            <li><a href={`${BACKEND}/auth/kick/login`} className="hover:text-text-primary transition">Sign in with Kick</a></li>
            <li><Link href="/dashboard" className="hover:text-text-primary transition">Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-text-primary mb-3">Compliance</div>
          <p>Tokens are volatile. You can lose everything you invest. This is not financial advice.</p>
        </div>
      </div>
      <div className="border-t border-surface-3 py-4 text-center text-xs text-text-secondary">
        © StreamPad — external audit required before mainnet. DYOR. NFA. Not financial advice.
      </div>
    </footer>
  );
}
