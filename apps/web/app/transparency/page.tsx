export default function TransparencyPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">Transparency</h1>
      <p className="text-zinc-400 mb-8">25% received by the protocol and how it is used. Buybacks logged on-chain.</p>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-surface-3 bg-surface-1 p-5">
          <div className="text-xs text-zinc-500 mb-1">Protocol fees received</div>
          <div className="text-2xl font-mono font-bold">0.00 SOL</div>
        </div>
        <div className="rounded-xl border border-surface-3 bg-surface-1 p-5">
          <div className="text-xs text-zinc-500 mb-1">Buybacks executed</div>
          <div className="text-2xl font-mono font-bold">0</div>
        </div>
      </div>
      <div className="rounded-xl border border-surface-3 bg-surface-1 p-6">
        <h2 className="text-lg font-semibold mb-3">Buyback history</h2>
        <p className="text-sm text-zinc-400">No buybacks yet.</p>
      </div>
      <p className="mt-6 text-xs text-zinc-500">
        Buybacks are transparency on fee usage, not a yield promise.
      </p>
    </div>
  );
}
