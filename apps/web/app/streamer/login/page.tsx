export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-2 text-center">Streamer sign-in</h1>
      <p className="text-zinc-400 text-center mb-8">Sign in with your platform.</p>
      <div className="space-y-3">
        <a
          href="/auth/twitch/login"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-twitch text-white font-medium hover:bg-twitch-dark transition"
        >
          Continue with Twitch
        </a>
        <a
          href="/auth/x/login"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-white text-black font-medium hover:bg-zinc-200 transition"
        >
          Continue with X
        </a>
      </div>
      <p className="text-xs text-zinc-500 text-center mt-6">
        Identity is the platform&apos;s numeric ID (not the handle). No yield promises.
      </p>
    </div>
  );
}
