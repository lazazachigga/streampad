'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const MOCK_TOKENS = [
  { mint: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', name: 'Alpha Stream', symbol: 'ALPHA', streamer: 'TwitchStreamer', platform: 'twitch', marketCap: '12.4K', change: '+8.2%' },
  { mint: '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E', name: 'KickClips', symbol: 'KICK', streamer: 'KickCreator', platform: 'x', marketCap: '8.1K', change: '+3.1%' },
  { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', name: 'NightOwl', symbol: 'OWL', streamer: 'NightOwlTV', platform: 'twitch', marketCap: '24.7K', change: '-1.4%' },
];

function PlatformBadge({ platform }: { platform: string }) {
  if (platform === 'twitch') {
    return <span className="text-xs px-2 py-0.5 rounded bg-twitch/20 text-twitch-light font-medium">Twitch</span>;
  }
  return <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">X</span>;
}

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <section className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Streamer tokens</h1>
        <p className="text-zinc-400 max-w-2xl">
          pump.fun tokens launched by Twitch &amp; X streamers. Definitive 75/25 fee sharing,
          automatic wallet, on-chain claims. No yield promises.
        </p>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_TOKENS.map((t) => (
          <a
            key={t.mint}
            href={`/token/${t.mint}`}
            className="group block rounded-xl border border-surface-3 bg-surface-1 p-5 hover:border-zinc-600 transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-white">{t.name}</div>
                <div className="text-xs text-zinc-500 font-mono">{t.symbol}</div>
              </div>
              <PlatformBadge platform={t.platform} />
            </div>
            <div className="text-sm text-zinc-400 mb-3">by {t.streamer}</div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs text-zinc-500">Market cap</div>
                <div className="font-mono text-white">${t.marketCap}</div>
              </div>
              <div className={`text-sm font-mono ${t.change.startsWith('+') ? 'text-kick' : 'text-red-400'}`}>
                {t.change}
              </div>
            </div>
          </a>
        ))}
      </section>

      <section className="mt-12 rounded-xl border border-surface-3 bg-surface-1 p-6">
        <h2 className="text-lg font-semibold mb-2">How it works</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-400">
          <li>A streamer signs in with Twitch or X.</li>
          <li>A Solana wallet is created automatically (non-custodial, exportable).</li>
          <li>They launch a token: 75% streamer / 25% protocol, definitive.</li>
          <li>Accrued fees are distributed and claimable on-chain.</li>
        </ol>
      </section>
    </div>
  );
}
