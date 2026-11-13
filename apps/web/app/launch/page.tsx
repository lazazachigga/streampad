export default function LaunchPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">Lancer un token</h1>
      <p className="text-zinc-400 mb-8">Réservé aux streamers vérifiés (OAuth Twitch/Kick).</p>
      <form className="space-y-5 rounded-xl border border-surface-3 bg-surface-1 p-6">
        <div>
          <label className="block text-sm font-medium mb-1.5">Nom</label>
          <input className="w-full rounded-lg bg-surface-2 border border-surface-3 px-3 py-2 text-sm focus:outline-none focus:border-twitch" placeholder="Mon Token" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Symbole</label>
          <input className="w-full rounded-lg bg-surface-2 border border-surface-3 px-3 py-2 text-sm focus:outline-none focus:border-twitch" placeholder="MTK" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Description</label>
          <textarea className="w-full rounded-lg bg-surface-2 border border-surface-3 px-3 py-2 text-sm focus:outline-none focus:border-twitch" rows={3} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Image (URL)</label>
          <input className="w-full rounded-lg bg-surface-2 border border-surface-3 px-3 py-2 text-sm focus:outline-none focus:border-twitch" placeholder="https://..." />
        </div>
        <div className="rounded-lg bg-surface-2 p-4 text-sm">
          <div className="font-semibold mb-1">Split définitif</div>
          <div className="flex justify-between text-zinc-400">
            <span>Streamer</span><span className="text-kick font-mono">75%</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Protocole</span><span className="text-twitch font-mono">25%</span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">Le split est définitif côté pump.fun et ne peut plus être modifié.</p>
        </div>
        <button type="submit" className="w-full py-2.5 rounded-lg bg-twitch text-white font-medium hover:bg-twitch-dark transition">
          Lancer (nécessite connexion)
        </button>
      </form>
    </div>
  );
}
