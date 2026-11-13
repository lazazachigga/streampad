// shared/wallet/PrivyWalletProvider.ts
// Adaptateur Privy (embedded Solana wallets) — PRÊT À BRANCHER.
// Nécessite : PRIVY_APP_ID, PRIVY_APP_SECRET (voir HUMAN_TODO.md).
// Implémentation réelle : SDK @privy-io/server-auth (non installé ici pour
// garder le repo léger). Les méthodes lèvent tant que les secrets manquent.

import type { WalletHandle, WalletProvider } from './WalletProvider.js';

export interface PrivyConfig {
  appId: string;
  appSecret: string;
}

export class PrivyWalletProvider implements WalletProvider {
  readonly name = 'privy';
  constructor(private readonly config: PrivyConfig) {
    if (config.appId === '' || config.appSecret === '') {
      throw new Error('PrivyWalletProvider: appId/appSecret vides (HUMAN_TODO.md)');
    }
  }

  async getOrCreateWallet(_userId: string): Promise<WalletHandle> {
    throw new Error(
      'PrivyWalletProvider.getOrCreateWallet: implémentation réelle requise ' +
        '(SDK @privy-io/server-auth). Voir HUMAN_TODO.md T10.',
    );
  }

  async preGenerateWallet(_streamerId: string): Promise<WalletHandle> {
    throw new Error('PrivyWalletProvider.preGenerateWallet: non implémenté (voir HUMAN_TODO.md T10).');
  }

  async signTransaction(_userId: string, _tx: Uint8Array): Promise<Uint8Array> {
    throw new Error('PrivyWalletProvider.signTransaction: non implémenté (voir HUMAN_TODO.md T10).');
  }

  async exportPrivateKey(_userId: string): Promise<string> {
    throw new Error('PrivyWalletProvider.exportPrivateKey: non implémenté (voir HUMAN_TODO.md T10).');
  }
}
