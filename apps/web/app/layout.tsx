import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Launchpad — Streamer tokens',
  description: 'Tokens pump.fun pour streamers, fee sharing 75/25.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen">{children}</body>
    </html>
  );
}
