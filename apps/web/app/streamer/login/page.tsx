export default function LoginPage() {
  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Connexion streamer</h1>
      <a href="/api/auth/twitch" className="mr-4 underline">Twitch</a>
      <a href="/api/auth/kick" className="underline">Kick</a>
    </main>
  );
}
