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
    <header className="border-b border-surface-3 bg-surface-1/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-twitch">Stream</span>
            <span className="text-kick">Pad</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-300">
          <Link href="/" className="hover:text-white transition">Tokens</Link>
          <Link href="/launch" className="hover:text-white transition">Launch</Link>
          <Link href="/transparency" className="hover:text-white transition">Transparency</Link>
        </nav>
        <div className="flex items-center gap-3">
          {publicKey ? (
            <button
              onClick={() => disconnect()}
              className="px-4 py-2 rounded-lg bg-surface-2 border border-surface-3 text-sm font-medium hover:bg-surface-3 transition font-mono"
            >
              {short} · Disconnect
            </button>
          ) : (
            <button
              onClick={() => setVisible(true)}
              className="px-4 py-2 rounded-lg bg-twitch text-white text-sm font-medium hover:bg-twitch-dark transition"
            >
              Connect Wallet
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
      <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-8 text-sm text-zinc-400">
        <div>
          <div className="font-bold text-white mb-2">StreamPad</div>
          <p>pump.fun tokens for Twitch &amp; X streamers. 75/25 fee sharing, definitive. Automatic wallet, on-chain claims.</p>
        </div>
        <div>
          <div className="font-semibold text-white mb-2">Links</div>
          <ul className="space-y-1">
            <li><Link href="/transparency" className="hover:text-white">Transparency</Link></li>
            <li><Link href="/launch" className="hover:text-white">Launch a token</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-white mb-2">Compliance</div>
          <p>No yield promises. Buybacks are transparency on fee usage. Legal review required before public launch.</p>
        </div>
      </div>
      <div className="border-t border-surface-3 py-4 text-center text-xs text-zinc-500">
        © StreamPad — external audit required before mainnet.
      </div>
    </footer>
  );
}
