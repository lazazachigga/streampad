// apps/backend/src/workers/treasuryManager.ts
// Worker : buybacks du token du launchpad depuis le treasury, avec slippage max
// et plafond par tx. Chaque buyback est loggé (signature, montant, prix moyen).

export interface BuybackConfig {
  minSolThreshold: bigint; // SOL minimum avant de déclencher un buyback
  maxSlippageBps: number;  // slippage max (ex. 300 = 3 %)
  maxPerTxLamports: bigint; // plafond par transaction
}

export interface TreasuryManagerDeps {
  getTreasuryBalance: () => Promise<bigint>;
  executeBuyback: (amountLamports: bigint) => Promise<{ signature: string; avgPrice: string }>;
  logBuyback: (entry: { signature: string; amountSol: bigint; avgPrice: string }) => Promise<void>;
  log: (msg: string) => void;
}

export async function runTreasuryManager(
  config: BuybackConfig,
  deps: TreasuryManagerDeps,
): Promise<void> {
  try {
    const balance = await deps.getTreasuryBalance();
    if (balance < config.minSolThreshold) {
      deps.log(`treasury: ${balance} lamports < seuil ${config.minSolThreshold}, skip`);
      return;
    }
    const amount = balance > config.maxPerTxLamports ? config.maxPerTxLamports : balance;
    const res = await deps.executeBuyback(amount);
    await deps.logBuyback({
      signature: res.signature,
      amountSol: amount,
      avgPrice: res.avgPrice,
    });
    deps.log(`buyback OK: ${amount} lamports, sig ${res.signature}`);
  } catch (err) {
    deps.log(`treasuryManager error: ${(err as Error).message}`);
  }
}
