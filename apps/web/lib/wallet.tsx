'use client';

import { useMemo, useState, useEffect } from 'react';

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useWallet(): WalletState {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    const solana = (window as any).solana;
    if (solana?.isPhantom) {
      solana.connect({ onlyIfTrusted: true }).then((res: any) => {
        setConnected(true);
        setPublicKey(res.publicKey.toString());
      }).catch(() => {});
    }
  }, []);

  const connect = async () => {
    const solana = (window as any).solana;
    if (solana) {
      try {
        const res = await solana.connect();
        setConnected(true);
        setPublicKey(res.publicKey.toString());
      } catch (e) {
        console.error('Wallet connect failed:', e);
      }
    } else {
      window.open('https://phantom.app/', '_blank');
    }
  };

  const disconnect = () => {
    const solana = (window as any).solana;
    if (solana) solana.disconnect();
    setConnected(false);
    setPublicKey(null);
  };

  return { connected, publicKey, connect, disconnect };
}

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
