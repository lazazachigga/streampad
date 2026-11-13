// shared/wallet/TurnkeyWalletProvider.ts
// Adaptateur Turnkey (embedded wallets) — PRÊT À BRANCHER.
// Nécessite : TURNKEY_ORGANIZATION_ID, TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY.
// Implémentation réelle : SDK @turnkey/sdk-server (non installé ici).

import type { WalletHandle, WalletProvider } from './WalletProvider.js';

export interface TurnkeyConfig {
  organizationId: string;
  apiPublicKey: string;
  apiPrivateKey: string;
}

export class TurnkeyWalletProvider implements WalletProvider {
  readonly name = 'turnkey';
  constructor(private readonly config: TurnkeyConfig) {
    if (
      config.organizationId === '' ||
      config.apiPublicKey === '' ||
      config.apiPrivateKey === ''
    ) {
      throw new Error('TurnkeyWalletProvider: config incomplète (HUMAN_TODO.md)');
    }
  }

  async getOrCreateWallet(_userId: string): Promise<WalletHandle> {
    throw new Error('TurnkeyWalletProvider.getOrCreateWallet: non implémenté (voir HUMAN_TODO.md T10).');
  }

  async preGenerateWallet(_streamerId: string): Promise<WalletHandle> {
    throw new Error('TurnkeyWalletProvider.preGenerateWallet: non implémenté (voir HUMAN_TODO.md T10).');
  }

  async signTransaction(_userId: string, _tx: Uint8Array): Promise<Uint8Array> {
    throw new Error('TurnkeyWalletProvider.signTransaction: non implémenté (voir HUMAN_TODO.md T10).');
  }

  async exportPrivateKey(_userId: string): Promise<string> {
    throw new Error('TurnkeyWalletProvider.exportPrivateKey: non implémenté (voir HUMAN_TODO.md T10).');
  }
}
