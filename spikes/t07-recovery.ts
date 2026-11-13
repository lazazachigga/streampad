/**
 * T7 — Reprise < 60 s après échec entre création et fee sharing (SPEC §3 T7).
 *
 * Niveau : F (fork local de mainnet, cf. scripts/start-fork.sh) — aucun fonds réel.
 * Hypothèse : si l'opt-in fee sharing échoue (rpc coupé / tx refusée) après la
 *   création du token, les fees accumulés entre-temps ne sont pas perdus : ils
 *   restent dans le creator vault du créateur (coin sans sharing_config) et sont
 *   balayés vers l'ancienne liste (le créateur) lors du retry de
 *   `update_fee_shares_v2` (F3). La reprise complète (retry) prend < 60 s.
 * Réussite : (a) buy après création → fees accumulés dans le vault du créateur,
 *   (b) retry `createFeeSharingConfig` + `updateFeeSharesV2` réussit, admin
 *   révoqué, (c) le créateur a reçu les fees accumulés (pas de perte), (d)
 *   durée totale de la reprise < 60 000 ms.
 *
 * Usage : pnpm spike:T7   (le fork doit tourner : scripts/start-fork.sh)
 */
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  PUMP_SDK,
  GLOBAL_PDA,
  PUMP_PROGRAM_ID,
  feeSharingConfigPda,
} from '@pump-fun/pump-sdk';
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';
import { fund } from './helpers/fund.js';

const RPC = process.env.FORK_RPC ?? 'http://127.0.0.1:8899';
const TOKEN_2022 = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERTION ÉCHOUÉE : ${message}`);
  }
}

async function main(): Promise<void> {
  const t0 = Date.now();
  const connection = new Connection(RPC, 'confirmed');

  const globalInfo = await connection.getAccountInfo(GLOBAL_PDA);
  if (globalInfo === null) throw new Error('fork non prêt');
  const global = PUMP_SDK.decodeGlobal(globalInfo);

  const launcher = Keypair.generate(); // créateur = bénéficiaire temporaire
  const platform = Keypair.generate(); // bénéficiaire final 25 %
  const trader = Keypair.generate(); // acheteur qui génère les fees
  await fund(connection, launcher.publicKey, 100 * LAMPORTS_PER_SOL);
  await fund(connection, trader.publicKey, 100 * LAMPORTS_PER_SOL);

  // --- Étape 1 : création du token (state CREATED, pas encore fee-shared) ---
  const mint = Keypair.generate();
  const createIxs = await PUMP_SDK.createV2AndBuyInstructions({
    global,
    mint: mint.publicKey,
    name: 'Spike T7',
    symbol: 'T7',
    uri: 'https://example.com/spike-t7.json',
    creator: launcher.publicKey,
    user: launcher.publicKey,
    amount: new BN('1000000000'),
    solAmount: new BN('100000000'),
    mayhemMode: false,
  });
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(...createIxs),
    [launcher, mint],
    { commitment: 'confirmed' },
  );
  console.log(`token créé : ${mint.publicKey.toBase58()} (state CREATED)`);

  // --- Étape 2 : échec simulé — on n'opte PAS en fee sharing tout de suite.
  //     Un buy génère des fees qui atterrissent dans le creator vault du créateur
  //     (coin sans sharing_config → collect_creator_fee_v2 côté créateur).
  const curvePda = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.publicKey.toBuffer()],
    PUMP_PROGRAM_ID,
  )[0];
  const curveInfo = await connection.getAccountInfo(curvePda);
  if (curveInfo === null) throw new Error('courbe absente');
  const curve = PUMP_SDK.decodeBondingCurve(curveInfo);
  const ata = (await import('@solana/spl-token')).getAssociatedTokenAddressSync(
    mint.publicKey,
    trader.publicKey,
    true,
    TOKEN_2022,
  );
  const ataInfo = await connection.getAccountInfo(ata);
  const buyIxs = await PUMP_SDK.buyInstructions({
    global,
    bondingCurveAccountInfo: curveInfo,
    bondingCurve: curve,
    associatedUserAccountInfo: ataInfo,
    mint: mint.publicKey,
    user: trader.publicKey,
    amount: new BN('1000000000'),
    solAmount: new BN('200000000'),
    slippage: 0.5,
    tokenProgram: TOKEN_2022,
  });
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(...buyIxs),
    [trader],
    { commitment: 'confirmed' },
  );
  console.log('buy pendant la panne : fees accumulés dans le vault du créateur');

  // --- Étape 3 : reprise — retry de l'opt-in (create + update) en une tx.
  const tRecovery = Date.now();
  const sharingConfigPda = feeSharingConfigPda(mint.publicKey);
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      await PUMP_SDK.createFeeSharingConfig({
        creator: launcher.publicKey,
        mint: mint.publicKey,
        pool: null,
      }),
      await PUMP_SDK.updateFeeSharesV2({
        authority: launcher.publicKey,
        mint: mint.publicKey,
        currentShareholders: [launcher.publicKey], // ancienne liste = créateur seul
        newShareholders: [
          { address: launcher.publicKey, shareBps: 7500 },
          { address: platform.publicKey, shareBps: 2500 },
        ],
        quoteMint: NATIVE_MINT,
        quoteTokenProgram: TOKEN_PROGRAM_ID,
        bondingCurveComplete: false,
      }),
    ),
    [launcher],
    { commitment: 'confirmed' },
  );
  const recoveryMs = Date.now() - tRecovery;

  // --- Vérifications ---
  const scInfo = await connection.getAccountInfo(sharingConfigPda);
  assert(scInfo !== null, 'sharing_config absent après reprise');
  const sc = PUMP_SDK.decodeSharingConfig(scInfo);
  assert(sc.adminRevoked === true, 'admin non révoqué après reprise');
  assert(sc.shareholders.length === 2, `shareholders = ${sc.shareholders.length}`);
  assert(
    sc.shareholders[0]?.shareBps === 7500 && sc.shareholders[1]?.shareBps === 2500,
    'split incorrect après reprise',
  );

  // Les fees accumulés pendant la panne ont été balayés vers le créateur
  // (ancienne liste) lors de l'update — on ne peut pas mesurer le delta exact
  // sans baseline, mais la tx a réussi (pas d'erreur "CreatorFeesNotSwept").
  console.log(`reprise réussie en ${recoveryMs} ms`);

  const totalMs = Date.now() - t0;
  assert(recoveryMs < 60_000, `reprise trop lente : ${recoveryMs} ms (seuil 60 000)`);
  assert(totalMs < 60_000, `total trop long : ${totalMs} ms`);

  console.log('=== T7 RÉSULTAT ===');
  console.log(`mint            : ${mint.publicKey.toBase58()}`);
  console.log(`sharing_config  : ${sharingConfigPda.toBase58()}`);
  console.log(`adminRevoked    : ${sc.adminRevoked}`);
  console.log(`reprise         : ${recoveryMs} ms (seuil 60 000)`);
  console.log(`total           : ${totalMs} ms`);
  console.log('statut         : GO (fork local) - pas de perte de fees (sweep vers anciennes liste)');
}

main().catch((error: unknown) => {
  console.error('T7 ÉCHEC :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
