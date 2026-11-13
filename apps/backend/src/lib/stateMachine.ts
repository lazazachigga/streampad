// apps/backend/src/lib/stateMachine.ts
// Machine d'états d'un lancement (SPEC §6), idempotente et reprenable.

export type LaunchState =
  | 'PENDING_VAULT'
  | 'VAULT_READY'
  | 'TOKEN_CREATED'
  | 'SHARING_CREATED'
  | 'SHARES_FINALIZED'
  | 'ACTIVE'
  | 'FAILED_RECOVERABLE'
  | 'NEEDS_MANUAL';

const ORDER: LaunchState[] = [
  'PENDING_VAULT',
  'VAULT_READY',
  'TOKEN_CREATED',
  'SHARING_CREATED',
  'SHARES_FINALIZED',
  'ACTIVE',
];

export function nextState(current: LaunchState): LaunchState | null {
  const idx = ORDER.indexOf(current);
  if (idx < 0 || idx === ORDER.length - 1) return null;
  return ORDER[idx + 1] ?? null;
}

export function isTerminal(state: LaunchState): boolean {
  return state === 'ACTIVE' || state === 'NEEDS_MANUAL';
}

export function isRecoverable(state: LaunchState): boolean {
  return state === 'FAILED_RECOVERABLE' || (ORDER.indexOf(state) >= 0 && state !== 'ACTIVE');
}

/** Durée max entre TOKEN_CREATED et SHARES_FINALIZED avant alerte (2 min). */
export const SHARING_ALERT_MS = 2 * 60 * 1000;
