// apps/backend/src/workers/reconciler.ts
// Job de réconciliation : relit la chaîne toutes les 30 s et pousse chaque
// token vers l'état suivant (SPEC §6).

import { nextState, type LaunchState } from '../lib/stateMachine.js';

export interface ReconcilerDeps {
  listTokens: () => Promise<Array<{ mint: string; state: LaunchState }>>;
  advance: (mint: string, next: LaunchState) => Promise<void>;
  log: (msg: string) => void;
}

export async function runReconciler(deps: ReconcilerDeps): Promise<void> {
  const tokens = await deps.listTokens();
  for (const t of tokens) {
    const next = nextState(t.state);
    if (next === null) continue;
    try {
      await deps.advance(t.mint, next);
      deps.log(`advanced ${t.mint}: ${t.state} -> ${next}`);
    } catch (err) {
      deps.log(`reconciler error on ${t.mint}: ${(err as Error).message}`);
    }
  }
}
