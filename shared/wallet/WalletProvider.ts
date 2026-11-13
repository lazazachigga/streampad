// shared/wallet/WalletProvider.ts
// Interface commune aux providers de wallet automatique (T10).
// Les adaptateurs réels (Privy, Turnkey) et le mock implémentent cette interface.

export interface WalletHandle {
  readonly userId: string;
  readonly publicKey: string; // base58
  readonly createdAt: number; // epoch ms
}

export interface WalletProvider {
  readonly name: string;
  /** Crée ou récupère le wallet d'un utilisateur identifié par userId opaque. */
  getOrCreateWallet(userId: string): Promise<WalletHandle>;
  /** Pré-génère un wallet pour un streamer pas encore connecté (option A2). */
  preGenerateWallet(streamerId: string): Promise<WalletHandle>;
  /** Signe une transaction sérialisée (bytes) avec la clé du wallet. */
  signTransaction(userId: string, tx: Uint8Array): Promise<Uint8Array>;
  /** Exporte la clé privée (base58) — sortie non-custodiale. */
  exportPrivateKey(userId: string): Promise<string>;
}
