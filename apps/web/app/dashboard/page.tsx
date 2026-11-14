export default function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-surface-3 bg-surface-1 p-5">
          <div className="text-xs text-zinc-500 mb-1">Wallet balance</div>
          <div className="text-2xl font-mono font-bold">0.00 SOL</div>
        </div>
        <div className="rounded-xl border border-surface-3 bg-surface-1 p-5">
          <div className="text-xs text-zinc-500 mb-1">Claimable fees</div>
          <div className="text-2xl font-mono font-bold text-kick">0.00 SOL</div>
        </div>
        <div className="rounded-xl border border-surface-3 bg-surface-1 p-5">
          <div className="text-xs text-zinc-500 mb-1">Tokens launched</div>
          <div className="text-2xl font-mono font-bold">0</div>
        </div>
      </div>
      <div className="rounded-xl border border-surface-3 bg-surface-1 p-6">
        <h2 className="text-lg font-semibold mb-3">Fees by token</h2>
        <p className="text-sm text-zinc-400">No tokens yet. Sign in to launch one.</p>
      </div>
      <div className="mt-6 flex gap-3">
        <button className="px-4 py-2 rounded-lg bg-kick text-black text-sm font-medium hover:bg-kick-dark transition">
          Claim
        </button>
        <button className="px-4 py-2 rounded-lg border border-surface-3 text-sm hover:bg-surface-2 transition">
          Link wallet
        </button>
        <button className="px-4 py-2 rounded-lg border border-surface-3 text-sm hover:bg-surface-2 transition">
          Export key
        </button>
      </div>
    </div>
  );
}
