export default function TransparencyPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">Transparence</h1>
      <p className="text-zinc-400 mb-8">25 % reçus par le protocole et leur usage. Buybacks loggés on-chain.</p>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-surface-3 bg-surface-1 p-5">
          <div className="text-xs text-zinc-500 mb-1">Fees protocole reçues</div>
          <div className="text-2xl font-mono font-bold">0.00 SOL</div>
        </div>
        <div className="rounded-xl border border-surface-3 bg-surface-1 p-5">
          <div className="text-xs text-zinc-500 mb-1">Buybacks effectués</div>
          <div className="text-2xl font-mono font-bold">0</div>
        </div>
      </div>
      <div className="rounded-xl border border-surface-3 bg-surface-1 p-6">
        <h2 className="text-lg font-semibold mb-3">Historique des buybacks</h2>
        <p className="text-sm text-zinc-400">Aucun buyback pour l&apos;instant.</p>
      </div>
      <p className="mt-6 text-xs text-zinc-500">
        Les buybacks sont de la transparence sur l&apos;usage des fees, pas une promesse de rendement.
      </p>
    </div>
  );
}
