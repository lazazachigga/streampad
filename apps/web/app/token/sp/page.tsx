'use client';

import { useEffect, useState } from 'react';
import { endpoints } from '../../../lib/api';

const BACKEND = 'https://streampad-backend.onrender.com';

export default function StreamPadTokenPage() {
  const [solPrice, setSolPrice] = useState<number | null>(null);

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true')
      .then(r => r.json())
      .then(data => { if (data.solana) setSolPrice(data.solana.usd); })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="text-center mb-12">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-volt to-kick flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-volt/30">
          <span className="text-3xl font-black text-black">SP</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-display font-black mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-volt to-kick">$SP</span> Token
        </h1>
        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
          The StreamPad protocol token. Launched on pump.fun. Powered by 25% of all streamer token fees.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="rounded-2xl border border-surface-3 bg-surface-1 p-6">
          <h3 className="text-lg font-bold mb-4">How it works</h3>
          <div className="space-y-3 text-sm text-text-secondary">
            <div className="flex items-start gap-3">
              <span className="text-volt">1.</span>
              <span>Streamers launch tokens on pump.fun with 75/25 fee sharing</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-volt">2.</span>
              <span>25% of all fees go to the StreamPad protocol treasury</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-volt">3.</span>
              <span>The treasury funds buybacks of the $SP token</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-volt">4.</span>
              <span>Buybacks are transparent and verifiable on-chain</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-surface-3 bg-surface-1 p-6">
          <h3 className="text-lg font-bold mb-4">Token details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Name</span>
              <span className="font-mono font-bold">StreamPad</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Symbol</span>
              <span className="font-mono font-bold text-volt">$SP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Platform</span>
              <span className="font-mono">pump.fun</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Fee sharing</span>
              <span className="font-mono">75/25 (streamer/protocol)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Status</span>
              <span className="font-mono text-kick">Coming soon</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-volt/20 bg-gradient-to-br from-surface-1/80 to-surface-1/40 p-8 text-center">
        <h3 className="text-2xl font-display font-bold mb-4">Buybacks are transparency, not yield</h3>
        <p className="text-text-secondary max-w-2xl mx-auto mb-6">
          The 25% protocol fees fund buybacks of $SP. These buybacks are publicly logged and verifiable on-chain.
          They are described as transparency on fee usage, not as a promise of returns.
        </p>
        <a href="/transparency" className="inline-block px-6 py-3 rounded-xl border border-surface-3 text-sm font-bold hover:bg-surface-2 transition">
          View transparency
        </a>
      </div>

      {solPrice && (
        <div className="mt-8 text-center text-xs text-text-secondary">
          SOL ${solPrice.toFixed(2)} · Powered by Solana
        </div>
      )}
    </div>
  );
}
