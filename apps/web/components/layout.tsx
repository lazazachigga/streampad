'use client';

import Link from 'next/link';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useMemo } from 'react';

export function Header() {
  const { publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const short = useMemo(() => (publicKey ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}` : null), [publicKey]);

  return (
    <header className="border-b border-surface-3 bg-surface-1/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight font-display">
            <span className="text-volt">STREAM</span>
            <span className="text-text-primary">PAD</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-text-secondary">
          <Link href="/" className="hover:text-text-primary transition">Tokens</Link>
          <Link href="/launch" className="hover:text-text-primary transition">Launch</Link>
          <Link href="/transparency" className="hover:text-text-primary transition">Transparency</Link>
        </nav>
        <div className="flex items-center gap-3">
          {publicKey ? (
            <button
              onClick={() => disconnect()}
              className="px-3 py-1.5 rounded-sm border border-surface-3 text-xs font-mono hover:bg-surface-2 transition"
            >
              {short}
            </button>
          ) : (
            <button
              onClick={() => setVisible(true)}
              className="px-4 py-1.5 rounded-sm bg-volt text-black text-xs font-bold uppercase tracking-wider hover:bg-volt-dark transition"
            >
              Connect wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-surface-3 bg-surface-1 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-8 text-sm text-text-secondary">
        <div>
          <div className="font-bold text-text-primary mb-2 font-display">STREAMPAD</div>
          <p>pump.fun tokens for Twitch &amp; Kick streamers. 75/25 fee sharing, definitive.</p>
        </div>
        <div>
          <div className="font-semibold text-text-primary mb-2">Links</div>
          <ul className="space-y-1">
            <li><Link href="/transparency" className="hover:text-text-primary">Transparency</Link></li>
            <li><Link href="/launch" className="hover:text-text-primary">Launch a token</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-text-primary mb-2">Compliance</div>
          <p>Tokens are volatile. You can lose everything you invest. This is not financial advice.</p>
        </div>
      </div>
      <div className="border-t border-surface-3 py-4 text-center text-xs text-text-secondary">
        © StreamPad — external audit required before mainnet.
      </div>
    </footer>
  );
}
