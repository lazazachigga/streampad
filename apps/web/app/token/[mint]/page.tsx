export default function TokenPage({ params }: { params: { mint: string } }) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="rounded-xl border border-surface-3 bg-surface-1 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Token</h1>
            <p className="font-mono text-xs text-zinc-500 mt-1 break-all">{params.mint}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded bg-kick/20 text-kick">Actif</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg bg-surface-2 p-4">
            <div className="text-zinc-500 text-xs mb-1">Split streamer</div>
            <div className="text-2xl font-bold text-kick">75%</div>
          </div>
          <div className="rounded-lg bg-surface-2 p-4">
            <div className="text-zinc-500 text-xs mb-1">Split protocole</div>
            <div className="text-2xl font-bold text-twitch">25%</div>
          </div>
          <div className="rounded-lg bg-surface-2 p-4">
            <div className="text-zinc-500 text-xs mb-1">Market cap</div>
            <div className="text-2xl font-bold">$12.4K</div>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-surface-3 bg-surface-1 p-6">
        <h2 className="text-lg font-semibold mb-3">Détails</h2>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <div><dt className="text-zinc-500">Streamer</dt><dd className="text-white">—</dd></div>
          <div><dt className="text-zinc-500">Plateforme</dt><dd className="text-white">Twitch</dd></div>
          <div><dt className="text-zinc-500">Quote mint</dt><dd className="font-mono text-xs text-white">SOL</dd></div>
          <div><dt className="text-zinc-500">Statut</dt><dd className="text-white">ACTIVE</dd></div>
        </dl>
        <p className="mt-4 text-xs text-zinc-500">
          Le split 75/25 est définitif côté pump.fun et ne peut plus être modifié.
        </p>
      </div>
    </div>
  );
}
