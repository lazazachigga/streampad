/**
 * Génère les arguments --clone / --clone-upgradeable-program de solana-test-validator
 * pour un fork local de mainnet (cf. scripts/start-fork.sh).
 *
 * Source des adresses : constantes exportées par @pump-fun/pump-sdk (doc officielle),
 * plus les PDAs mayhem documentés dans vendor/pump-public-docs/docs/instructions/COIN_CREATION.md.
 * Aucune adresse n'est écrite de mémoire.
 *
 * Usage : node --import tsx scripts/fork-args.ts [RPC_URL]
 * Sortie : une ligne d'arguments sur stdout.
 */
import { PublicKey } from '@solana/web3.js';
import {
  PUMP_PROGRAM_ID,
  PUMP_AMM_PROGRAM_ID,
  PUMP_FEE_PROGRAM_ID,
  MAYHEM_PROGRAM_ID,
  GLOBAL_PDA,
  PUMP_FEE_CONFIG_PDA,
  PUMP_EVENT_AUTHORITY_PDA,
  PUMP_FEE_EVENT_AUTHORITY_PDA,
  GLOBAL_VOLUME_ACCUMULATOR_PDA,
  FEE_PROGRAM_GLOBAL_PDA,
} from '@pump-fun/pump-sdk';

const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const WRAPPED_SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

function pda(seeds: Buffer[], programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(seeds, programId)[0];
}

const mayhemGlobalParams = pda([Buffer.from('global-params')], MAYHEM_PROGRAM_ID);
const mayhemSolVault = pda([Buffer.from('sol-vault')], MAYHEM_PROGRAM_ID);

const upgradeablePrograms: PublicKey[] = [
  PUMP_PROGRAM_ID,
  PUMP_FEE_PROGRAM_ID,
  PUMP_AMM_PROGRAM_ID,
  MAYHEM_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
];

// Comptes obligatoires : vérifiés existants sur mainnet par getMultipleAccounts le 2026-11-12.
const accounts: PublicKey[] = [
  GLOBAL_PDA,
  PUMP_EVENT_AUTHORITY_PDA,
  GLOBAL_VOLUME_ACCUMULATOR_PDA,
  PUMP_FEE_CONFIG_PDA,
  FEE_PROGRAM_GLOBAL_PDA,
  mayhemGlobalParams,
  mayhemSolVault,
  WRAPPED_SOL_MINT,
];

// 24 fee recipients (8 normal + 8 réservés mayhem + 8 buyback) — source :
// vendor/pump-public-docs/docs/FEE_RECIPIENTS.md. buy_v2/sell_v2 en exigent un
// feeRecipient ET un buybackFeeRecipient, choisis au hasard par le SDK : sans
// eux, le compte est absent du fork et la tx échoue en InsufficientFundsForRent
// (preuve : spikes/_t01-debug3.ts, 3 échecs = 3 adresses buyback distinctes).
const feeRecipients: PublicKey[] = [
  // normal (non-mayhem)
  '62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV',
  '7VtfL8fvgNfhz17qKRMjzQEXgbdpnHHHQRh54R9jP2RJ',
  '7hTckgnGnLQR6sdH7YkqFTAA7VwTfYFaZ6EhEsU3saCX',
  '9rPYyANsfQZw3DnDmKE3YCQF5E8oD89UXoHn9JFEhJUz',
  'AVmoTthdrX6tKt4nDjco2D775W2YK3sDhxPcMmzUAmTY',
  'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM',
  'FWsW1xNtWscwNmKv6wVsU1iTzRN6wmmk3MjxRP5tT7hz',
  'G5UZAVbAf46s7cKWoyKu8kYTip9DGTpbLZ2qa9Aq69dP',
  // réservés (mayhem mode)
  'GesfTA3X2arioaHp8bbKdjG9vJtskViWACZoYvxp4twS',
  '4budycTjhs9fD6xw62VBducVTNgMgJJ5BgtKq7mAZwn6',
  '8SBKzEQU4nLSzcwF4a74F2iaUDQyTfjGndn6qUWBnrpR',
  '4UQeTP1T39KZ9Sfxzo3WR5skgsaP6NZa87BAkuazLEKH',
  '8sNeir4QsLsJdYpc9RZacohhK1Y5FLU3nC5LXgYB4aa6',
  'Fh9HmeLNUMVCvejxCtCL2DbYaRyBFVJ5xrWkLnMH6fdk',
  '463MEnMeGyJekNZFQSTUABBEbLnvMTALbT6ZmsxAbAdq',
  '6AUH3WEHucYZyC61hqpqYUWVto5qA5hjHuNQ32GNnNxA',
  // buyback (toutes pièces)
  '5YxQFdt3Tr9zJLvkFccqXVUwhdTWJQc1fFg2YPbxvxeD',
  '9M4giFFMxmFGXtc3feFzRai56WbBqehoSeRE5GK7gf7',
  'GXPFM2caqTtQYC2cJ5yJRi9VDkpsYZXzYdwYpGnLmtDL',
  '3BpXnfJaUTiwXnJNe7Ej1rcbzqTTQUvLShZaWazebsVR',
  '5cjcW9wExnJJiqgLjq7DEG75Pm6JBgE1hNv4B2vHXUW6',
  'EHAAiTxcdDwQ3U4bU6YcMsQGaekdzLS3B5SmYo46kJtL',
  '5eHhjP8JaYkz83CWwvGU2uMUXefd3AazWGx4gpcuEEYD',
  'A7hAgCzFw14fejgCp387JUJRMNyz4j89JKnhtKU8piqW',
].map((address) => new PublicKey(address));

// Compte absent de mainnet (prouvé : getMultipleAccounts renvoie null) : PDA
// ["__event_authority"] du programme fee, créé paresseusement. --maybe-clone l'ignore
// s'il n'existe toujours pas au lieu de faire échouer tout le fork.
const optionalAccounts: PublicKey[] = [PUMP_FEE_EVENT_AUTHORITY_PDA];

const rpcUrl = process.argv[2] ?? 'https://solana-rpc.publicnode.com';

const args: string[] = ['--url', rpcUrl];
for (const programId of upgradeablePrograms) {
  args.push('--clone-upgradeable-program', programId.toBase58());
}
for (const address of accounts) {
  args.push('--clone', address.toBase58());
}
for (const address of feeRecipients) {
  args.push('--clone', address.toBase58());
}
for (const address of optionalAccounts) {
  args.push('--maybe-clone', address.toBase58());
}

process.stdout.write(args.join(' '));
