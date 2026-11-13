import Link from 'next/link';

export function Header() {
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
          <Link href="/launch" className="hover:text-white transition">Lancer</Link>
          <Link href="/transparency" className="hover:text-white transition">Transparence</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/streamer/login"
            className="px-4 py-2 rounded-lg bg-twitch text-white text-sm font-medium hover:bg-twitch-dark transition"
          >
            Connexion
          </Link>
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
          <p>Tokens pump.fun pour streamers Twitch &amp; Kick. Fee sharing 75/25 définitif.</p>
        </div>
        <div>
          <div className="font-semibold text-white mb-2">Liens</div>
          <ul className="space-y-1">
            <li><Link href="/transparency" className="hover:text-white">Transparence</Link></li>
            <li><Link href="/launch" className="hover:text-white">Lancer un token</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-white mb-2">Conformité</div>
          <p>Aucune promesse de rendement. Buybacks = transparence sur l&apos;usage des fees. Validation juridique requise avant mise en ligne.</p>
        </div>
      </div>
      <div className="border-t border-surface-3 py-4 text-center text-xs text-zinc-500">
        © StreamPad — audit externe obligatoire avant mainnet.
      </div>
    </footer>
  );
}
