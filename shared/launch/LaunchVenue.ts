// shared/launch/LaunchVenue.ts
// Interface commune aux venues de lancement (T10-style : MVP = pump.fun).

export interface LaunchParams {
  name: string;
  symbol: string;
  uri: string;
  creator: string; // base58 pubkey du créateur/streamer
}

export interface LaunchResult {
  mint: string;
  signature: string;
}

export interface DistributeResult {
  signature: string;
  amount: bigint; // lamports versés au total
}

export interface LaunchVenue {
  readonly name: string;
  /** Lance un token SOL-apparié. */
  launch(params: LaunchParams): Promise<LaunchResult>;
  /** Opt-in fee sharing + liste définitive (7500/2500). */
  setupFeeRecipient(mint: string, shareholders: Array<{ address: string; shareBps: number }>): Promise<void>;
  /** Solde accumulé du creator vault (lamports). */
  getAccruedFees(mint: string): Promise<bigint>;
  /** Sweep (si gradué) + distribute. */
  distribute(mint: string): Promise<DistributeResult>;
}
