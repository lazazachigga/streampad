import type { Metadata } from 'next';
import { Header, Footer } from '../components/layout';
import './globals.css';

export const metadata: Metadata = {
  title: 'StreamPad — Streamer tokens on Solana',
  description: 'Tokens pump.fun pour streamers Twitch & Kick. Fee sharing 75/25 définitif. Wallet automatique, claim on-chain.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-surface-0 text-zinc-100 min-h-screen antialiased">
        <Header />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
