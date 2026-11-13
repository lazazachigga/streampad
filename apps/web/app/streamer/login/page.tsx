export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-2 text-center">Connexion streamer</h1>
      <p className="text-zinc-400 text-center mb-8">Connecte-toi avec ta plateforme.</p>
      <div className="space-y-3">
        <a
          href="/auth/twitch/login"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-twitch text-white font-medium hover:bg-twitch-dark transition"
        >
          Continuer avec Twitch
        </a>
        <a
          href="/auth/kick/login"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-kick text-black font-medium hover:bg-kick-dark transition"
        >
          Continuer avec Kick
        </a>
      </div>
      <p className="text-xs text-zinc-500 text-center mt-6">
        L&apos;identité est l&apos;ID numérique de la plateforme (pas le pseudo). Aucune promesse de rendement.
      </p>
    </div>
  );
}
