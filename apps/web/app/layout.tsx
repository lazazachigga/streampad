import type { Metadata } from 'next';
import { SolanaWalletProvider } from '../lib/wallet';
import { Header, Footer } from '../components/layout';
import './globals.css';

export const metadata: Metadata = {
  title: 'StreamPad — Streamer tokens on Solana',
  description: 'Launch pump.fun tokens for Twitch & X streamers. 75/25 fee sharing, automatic wallet, on-chain claims.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-surface-0 text-zinc-100 min-h-screen antialiased">
        <SolanaWalletProvider>
          <Header />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <Footer />
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
