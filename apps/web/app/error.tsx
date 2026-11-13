'use client';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Erreur</h1>
      <button onClick={reset} className="underline">Réessayer</button>
    </main>
  );
}
