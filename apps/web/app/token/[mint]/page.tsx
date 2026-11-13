export default function TokenPage({ params }: { params: { mint: string } }) {
  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Token {params.mint}</h1>
      <p className="text-zinc-400">Infos, streamer, split 75/25 définitif.</p>
    </main>
  );
}
