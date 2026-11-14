import type { Metadata } from 'next';
import { SolanaWalletProvider } from '../lib/wallet';
import { Header, Footer } from '../components/layout';
import './globals.css';

export const metadata: Metadata = {
  title: 'StreamPad : le launchpad des streamers',
  description: 'Le launchpad des streamers Twitch et Kick : wallet créé automatiquement, 75 % des fees pour toi, claim en un clic.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-surface-0 text-text-primary min-h-screen antialiased">
        <SolanaWalletProvider>
          <Header />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <Footer />
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
