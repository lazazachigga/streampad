const MOCK_TOKENS = [
  { mint: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', name: 'Alpha Stream', symbol: 'ALPHA', streamer: 'TwitchStreamer', platform: 'twitch', marketCap: '12.4K', change: '+8.2%' },
  { mint: '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E', name: 'KickClips', symbol: 'KICK', streamer: 'KickCreator', platform: 'kick', marketCap: '8.1K', change: '+3.1%' },
  { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', name: 'NightOwl', symbol: 'OWL', streamer: 'NightOwlTV', platform: 'twitch', marketCap: '24.7K', change: '-1.4%' },
];

function PlatformBadge({ platform }: { platform: string }) {
  if (platform === 'twitch') {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-twitch/20 text-twitch-light font-mono">Twitch</span>;
  }
  return <span className="text-xs px-2 py-0.5 rounded-full bg-kick/20 text-kick-light font-mono">Kick</span>;
}

export default function HomePage() {
  return (
    <div>
      {/* Ticker */}
      <div className="border-b border-surface-3 bg-surface-1 overflow-hidden h-8 flex items-center">
        <div className="animate-marquee whitespace-nowrap text-xs font-mono text-text-secondary">
          <span className="mx-4">@streamer a claim 12,4 SOL</span> /
          <span className="mx-4">$ALPHA +184% 24h</span> /
          <span className="mx-4">nouveau token : $OWL</span> /
          <span className="mx-4">@streamer a claim 12,4 SOL</span> /
          <span className="mx-4">$ALPHA +184% 24h</span> /
          <span className="mx-4">nouveau token : $OWL</span> /
        </div>
      </div>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs font-mono text-volt mb-4 tracking-widest">01 / 06 — HERO</div>
            <h1 className="text-5xl md:text-7xl font-display font-black tracking-tight leading-[0.9] mb-6">
              TON STREAM.<br />
              TON TOKEN.<br />
              <span className="text-volt">TES FEES.</span>
            </h1>
            <p className="text-text-secondary text-lg mb-8 max-w-md">
              75 % des fees pour toi, gravé on-chain. Connexion Twitch ou Kick, wallet créé tout seul, claim en un clic.
            </p>
            <div className="flex gap-3">
              <a href="/launch" className="px-6 py-3 bg-volt text-black text-sm font-bold uppercase tracking-wider hover:bg-volt-dark transition">
                Lancer mon token
              </a>
              <a href="#reels" className="px-6 py-3 border border-surface-3 text-sm font-bold uppercase tracking-wider hover:bg-surface-2 transition">
                Voir les clips
              </a>
            </div>
            <div className="mt-8 grid grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-mono font-bold tabular-nums">12.4</div>
                <div className="text-xs text-text-secondary">SOL versés</div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold tabular-nums">42</div>
                <div className="text-xs text-text-secondary">Tokens lancés</div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold tabular-nums">18</div>
                <div className="text-xs text-text-secondary">Streamers actifs</div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold tabular-nums">1.2K</div>
                <div className="text-xs text-text-secondary">Claims</div>
              </div>
            </div>
          </div>
          <div className="rounded-sm border border-surface-3 bg-surface-1 p-4 aspect-[9/16] max-h-[500px] flex items-center justify-center">
            <p className="text-text-secondary text-sm text-center">Reels placeholder<br />(vidéos à venir)</p>
          </div>
        </div>
      </section>

      {/* Reels */}
      <section id="reels" className="max-w-7xl mx-auto px-6 py-16 border-t border-surface-3">
        <div className="text-xs font-mono text-volt mb-4 tracking-widest">02 / 06 — REELS</div>
        <h2 className="text-3xl font-display font-bold mb-6">Clips de streamers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[9/16] rounded-sm border border-surface-3 bg-surface-1 flex items-center justify-center">
              <p className="text-text-secondary text-xs">Clip {i}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-surface-3">
        <div className="text-xs font-mono text-volt mb-4 tracking-widest">03 / 06 — MÉTRIQUES</div>
        <h2 className="text-3xl font-display font-bold mb-6">Métriques live</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Fees versées aux streamers', value: '12.4 SOL', demo: true },
            { label: 'Tokens lancés', value: '42', demo: true },
            { label: 'Streamers actifs', value: '18', demo: true },
            { label: 'Volume 24h', value: '$1.2K', demo: true },
            { label: 'Claims', value: '1.2K', demo: true },
            { label: 'Split définitif', value: '75 / 25', demo: false },
          ].map((m) => (
            <div key={m.label} className="rounded-sm border border-surface-3 bg-surface-1 p-5">
              <div className="text-xs text-text-secondary mb-1">{m.label}</div>
              <div className="text-2xl font-mono font-bold tabular-nums">{m.value}</div>
              {m.demo && <div className="text-[10px] text-volt mt-1 font-mono">DEMO</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Streamer wall */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-surface-3">
        <div className="text-xs font-mono text-volt mb-4 tracking-widest">04 / 06 — MUR DES STREAMERS</div>
        <h2 className="text-3xl font-display font-bold mb-6">Streamers</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_TOKENS.map((t) => (
            <a
              key={t.mint}
              href={`/token/${t.mint}`}
              className="block rounded-sm border border-surface-3 bg-surface-1 p-4 hover:border-volt transition"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-text-primary">{t.streamer}</div>
                  <div className="text-xs text-text-secondary font-mono">{t.symbol}</div>
                </div>
                <PlatformBadge platform={t.platform} />
              </div>
              <div className="flex items-end justify-between mt-3">
                <div>
                  <div className="text-xs text-text-secondary">Market cap</div>
                  <div className="font-mono text-sm">${t.marketCap}</div>
                </div>
                <div className={`text-sm font-mono ${t.change.startsWith('+') ? 'text-up' : 'text-down'}`}>
                  {t.change}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-surface-3">
        <div className="text-xs font-mono text-volt mb-4 tracking-widest">05 / 06 — COMMENT ÇA MARCHE</div>
        <h2 className="text-3xl font-display font-bold mb-6">3 étapes</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'Connexion', desc: 'Twitch ou Kick, en 1 clic.' },
            { step: '02', title: 'Wallet', desc: 'Créé automatiquement, non-custodial.' },
            { step: '03', title: 'Claim', desc: 'Tes fees, en 1 clic.' },
          ].map((s) => (
            <div key={s.step} className="rounded-sm border border-surface-3 bg-surface-1 p-6">
              <div className="text-4xl font-display font-black text-volt mb-2">{s.step}</div>
              <div className="font-semibold mb-1">{s.title}</div>
              <div className="text-sm text-text-secondary">{s.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-sm border border-surface-3 bg-surface-1 p-4 text-sm text-text-secondary">
          <span className="font-mono text-volt">Vérifiable :</span> adresse du programme, lien Solscan, split définitif on-chain.
        </div>
      </section>

      {/* Footer CTA */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-surface-3">
        <div className="rounded-sm border border-surface-3 bg-surface-1 p-8 text-center">
          <h2 className="text-3xl font-display font-bold mb-4">Lance ton token</h2>
          <p className="text-text-secondary mb-6">75 % pour toi. Pas négociable, pas modifiable.</p>
          <a href="/launch" className="inline-block px-8 py-3 bg-volt text-black text-sm font-bold uppercase tracking-wider hover:bg-volt-dark transition">
            Lancer mon token
          </a>
          <p className="text-xs text-text-secondary mt-6">
            Les tokens sont volatils. Tu peux perdre tout ce que tu investis. Ceci n&apos;est pas un conseil financier.
          </p>
        </div>
      </section>
    </div>
  );
}
