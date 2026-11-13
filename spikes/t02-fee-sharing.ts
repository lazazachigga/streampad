/**
 * T2 — `create_fee_sharing_config` + `update_fee_shares_v2` enchaînés (SPEC §3 T2).
 *
 * Niveau : F (fork local de mainnet, cf. scripts/start-fork.sh) — aucun fonds réel.
 * Hypothèse : un coin lancé peut opter pour le fee sharing puis fixer définitivement
 *   la liste [(streamer, 7500 bps), (plateforme, 2500 bps)] en 2 instructions,
 *   et l'admin est révoqué ensuite (une seule mise à jour possible).
 * Réussite : sharing_config décodé on-chain avec 2 shareholders 7500/2500 +
 *   adminRevoked = true + un 2e appel update_fee_shares_v2 échoue.
 *
 * Usage : pnpm spike:T2   (le fork doit tourner : scripts/start-fork.sh)
 */
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from '@solana/web3.js';
import {
  PUMP_SDK,
  GLOBAL_PDA,
  feeSharingConfigPda,
} from '@pump-fun/pump-sdk';
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fund } from './helpers/fund.js';

const RPC = process.env.FORK_RPC ?? 'http://127.0.0.1:8899';
const STATE_DIR = join(dirname(fileURLToPath(import.meta.url)), '.state');

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERTION ÉCHOUÉE : ${message}`);
  }
}

async function main(): Promise<void> {
  const connection = new Connection(RPC, 'confirmed');

  const globalInfo = await connection.getAccountInfo(GLOBAL_PDA);
  if (globalInfo === null) {
    throw new Error(
      `Fork non prêt : compte global absent sur ${RPC}. Lancez scripts/start-fork.sh et réessayez.`,
    );
  }
  const global = PUMP_SDK.decodeGlobal(globalInfo);

  // --- Étape 0 : lancer un coin (reprise du flow T1) ---
  const launcher = Keypair.generate(); // = créateur = admin du sharing_config
  await fund(connection, launcher.publicKey, 100 * LAMPORTS_PER_SOL);
  // Le 2e bénéficiaire (rôle « plateforme ») : wallet jetable du fork.
  const platform = Keypair.generate();

  const mint = Keypair.generate();
  const createInstructions = await PUMP_SDK.createV2AndBuyInstructions({
    global,
    mint: mint.publicKey,
    name: 'Spike T2',
    symbol: 'T2',
    uri: 'https://example.com/spike-t2.json',
    creator: launcher.publicKey,
    user: launcher.publicKey,
    amount: new BN('1000000000'),
    solAmount: new BN('100000000'),
    mayhemMode: false,
  });
  const launchTx = new Transaction().add(...createInstructions);
  const launchSig = await sendAndConfirmTransaction(connection, launchTx, [launcher, mint], {
    commitment: 'confirmed',
  });

  // --- Étape 1 : createFeeSharingConfig (opt-in, liste initiale [(creator, 10_000)]) ---
  const sharingConfigPda = feeSharingConfigPda(mint.publicKey);
  const createSharingIx = await PUMP_SDK.createFeeSharingConfig({
    creator: launcher.publicKey,
    mint: mint.publicKey,
    pool: null, // pas encore gradué
  });

  // --- Étape 2 : updateFeeSharesV2 (7500/2500 définitif, admin révoqué) ---
  const updateSharesIx = await PUMP_SDK.updateFeeSharesV2({
    authority: launcher.publicKey, // = sharing_config.admin
    mint: mint.publicKey,
    currentShareholders: [launcher.publicKey], // liste posée par l'étape 1
    newShareholders: [
      { address: launcher.publicKey, shareBps: 7500 },
      { address: platform.publicKey, shareBps: 2500 },
    ],
    quoteMint: NATIVE_MINT,
    quoteTokenProgram: TOKEN_PROGRAM_ID,
    bondingCurveComplete: false,
  });

  const shareTx = new Transaction().add(createSharingIx, updateSharesIx);
  const shareSig = await sendAndConfirmTransaction(connection, shareTx, [launcher], {
    commitment: 'confirmed',
  });

  // --- Vérifications on-chain ---
  const scInfo = await connection.getAccountInfo(sharingConfigPda);
  assert(scInfo !== null, 'sharing_config absent après createFeeSharingConfig');
  const sc = PUMP_SDK.decodeSharingConfig(scInfo);
  assert(sc.version !== 1, `sharing_config version ${sc.version} (attendu V2)`);
  assert(
    sc.admin.toBase58() === launcher.publicKey.toBase58(),
    `admin ${sc.admin.toBase58()} != launcher`,
  );
  assert(sc.adminRevoked === true, 'adminRevoked doit être true après update');
  assert(sc.shareholders.length === 2, `shareholders = ${sc.shareholders.length} (attendu 2)`);
  assert(sc.shareholders[0]?.shareBps === 7500, `share[0] = ${sc.shareholders[0]?.shareBps} (attendu 7500)`);
  assert(
    sc.shareholders[0]?.address.toBase58() === launcher.publicKey.toBase58(),
    'share[0] != launcher',
  );
  assert(sc.shareholders[1]?.shareBps === 2500, `share[1] = ${sc.shareholders[1]?.shareBps} (attendu 2500)`);
  assert(
    sc.shareholders[1]?.address.toBase58() === platform.publicKey.toBase58(),
    'share[1] != platform',
  );

  // --- Preuve de définitivité : un 2e update doit échouer (admin révoqué) ---
  let secondCallFailed = false;
  let secondCallError = '';
  try {
    const retryIx = await PUMP_SDK.updateFeeSharesV2({
      authority: launcher.publicKey,
      mint: mint.publicKey,
      currentShareholders: sc.shareholders.map((s) => s.address),
      newShareholders: [{ address: launcher.publicKey, shareBps: 10_000 }],
      quoteMint: NATIVE_MINT,
      quoteTokenProgram: TOKEN_PROGRAM_ID,
      bondingCurveComplete: false,
    });
    const retryTx = new Transaction().add(retryIx);
    await sendAndConfirmTransaction(connection, retryTx, [launcher], { commitment: 'confirmed' });
  } catch (error: unknown) {
    secondCallFailed = true;
    secondCallError = error instanceof Error ? error.message : String(error);
  }
  assert(secondCallFailed, 'le 2e updateFeeSharesV2 aurait dû échouer (admin révoqué)');

  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(
    join(STATE_DIR, 't02.json'),
    JSON.stringify(
      {
        rpc: RPC,
        launchSignature: launchSig,
        shareSignature: shareSig,
        mint: mint.publicKey.toBase58(),
        sharingConfig: sharingConfigPda.toBase58(),
        shareholders: sc.shareholders.map((s) => ({
          address: s.address.toBase58(),
          shareBps: s.shareBps,
        })),
        adminRevoked: sc.adminRevoked,
        secondCallError,
      },
      null,
      2,
    ),
  );

  console.log('=== T2 RÉSULTAT ===');
  console.log(`lancement      : ${launchSig}`);
  console.log(`fee sharing    : ${shareSig}`);
  console.log(`mint           : ${mint.publicKey.toBase58()}`);
  console.log(`sharing_config : ${sharingConfigPda.toBase58()}`);
  console.log(
    `shareholders   : ${sc.shareholders
      .map((s) => `${s.address.toBase58()}=${s.shareBps}`)
      .join(' + ')}`,
  );
  console.log(`adminRevoked   : ${sc.adminRevoked}`);
  console.log(`2e appel refusé: ${secondCallFailed} (${secondCallError.slice(0, 120)})`);
  console.log('statut         : GO (fork local)');
  console.log(`état sauvegardé : ${join(STATE_DIR, 't02.json')}`);
}

main().catch((error: unknown) => {
  console.error('T2 ÉCHEC :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
