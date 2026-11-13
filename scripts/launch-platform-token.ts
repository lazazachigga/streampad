// scripts/launch-platform-token.ts
// À exécuter MANUELLEMENT une seule fois (Phase 5).
// Lance le token du launchpad sur pump.fun via PumpFunVenue, avec le même
// mécanisme de fee sharing si pertinent (décision dans DECISIONS.md).
//
// Usage : npx tsx scripts/launch-platform-token.ts
// Nécessite : LAUNCHER_WALLET_SECRET, SOLANA_RPC_URL, et les params ci-dessous.

import 'dotenv/config';

const NAME = process.env.PLATFORM_TOKEN_NAME ?? 'Launchpad';
const SYMBOL = process.env.PLATFORM_TOKEN_SYMBOL ?? 'LPAD';
const URI = process.env.PLATFORM_TOKEN_URI ?? 'https://example.com/lpad.json';

async function main(): Promise<void> {
  console.log('Token du launchpad :', { NAME, SYMBOL, URI });
  console.log(
    'Ce script est un squelette : brancher PumpFunVenue avec LAUNCHER_WALLET_SECRET ' +
      'et appeler venue.launch(...) puis venue.setupFeeRecipient(...).',
  );
  console.log('Voir shared/launch/PumpFunVenue.ts.');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
