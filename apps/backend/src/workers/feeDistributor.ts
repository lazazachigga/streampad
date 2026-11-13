// apps/backend/src/workers/feeDistributor.ts
// Worker : pour chaque token ACTIF, si le creator vault dépasse le seuil T5,
// exécute transfer_creator_fees_to_pump_v2 (si gradué) puis distribute.

export interface FeeDistributorDeps {
  listActiveTokens: () => Promise<Array<{ mint: string; graduated: boolean }>>;
  getAccruedFees: (mint: string) => Promise<bigint>;
  transferToPump: (mint: string) => Promise<string>;
  distribute: (mint: string) => Promise<{ signature: string; amount: bigint }>;
  log: (msg: string) => void;
}

const THRESHOLD_LAMPORTS = 4_454_400; // constaté T4/T5

export async function runFeeDistributor(deps: FeeDistributorDeps): Promise<void> {
  const tokens = await deps.listActiveTokens();
  for (const t of tokens) {
    try {
      const accrued = await deps.getAccruedFees(t.mint);
      if (accrued < BigInt(THRESHOLD_LAMPORTS)) continue;
      if (t.graduated) await deps.transferToPump(t.mint);
      const res = await deps.distribute(t.mint);
      deps.log(`distributed ${res.amount} lamports for ${t.mint} (${res.signature})`);
    } catch (err) {
      deps.log(`feeDistributor error on ${t.mint}: ${(err as Error).message}`);
    }
  }
}
