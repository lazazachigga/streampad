/**
 * Diagnostic T4 — où sont passées les creator fees ?
 *
 * Cycle observé : buy (trader) → sweepCreatorFee + distributeCreatorFeesV2.
 * Résultat : delta des bénéficiaires = 0. On instrumente à chaque étape :
 *   - BondingCurve.creatorFee (bucket v3 sur la courbe) avant/après buy
 *   - balance du vault ["creator-vault", sharing_config] avant/après sweep
 *   - logs de simulation de la tx sweep+distribute (pour voir ce que le
 *     programme dit réellement)
 * Lecture seule sauf le buy (nécessaire pour générer des fees).
 */
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from '@solana/web3.js';
import { PUMP_SDK, GLOBAL_PDA, PUMP_PROGRAM_ID, feeSharingConfigPda } from '@pump-fun/pump-sdk';
import { NATIVE_MINT, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import BN from 'bn.js';
import { fund } from './helpers/fund.js';

const RPC = process.env.FORK_RPC ?? 'http://127.0.0.1:8899';
const TOKEN_2022 = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

async function main(): Promise<void> {
  const connection = new Connection(RPC, 'confirmed');
  const globalInfo = await connection.getAccountInfo(GLOBAL_PDA);
  if (globalInfo === null) throw new Error('fork non prêt');
  const global = PUMP_SDK.decodeGlobal(globalInfo);
  console.log(`global.creatorFeeBasisPoints = ${global.creatorFeeBasisPoints}`);

  const launcher = Keypair.generate();
  const platform = Keypair.generate();
  const trader = Keypair.generate();
  await fund(connection, launcher.publicKey, 100 * LAMPORTS_PER_SOL);
  await fund(connection, trader.publicKey, 100 * LAMPORTS_PER_SOL);

  const mint = Keypair.generate();
  const createIxs = await PUMP_SDK.createV2AndBuyInstructions({
    global,
    mint: mint.publicKey,
    name: 'Debug T4',
    symbol: 'D4',
    uri: 'https://example.com/debug-t4.json',
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

  // Opt-in 75/25
  const scPda = feeSharingConfigPda(mint.publicKey);
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
        currentShareholders: [launcher.publicKey],
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

  const curvePda = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.publicKey.toBuffer()],
    PUMP_PROGRAM_ID,
  )[0];
  const vaultPda = PublicKey.findProgramAddressSync(
    [Buffer.from('creator-vault'), scPda.toBuffer()],
    PUMP_PROGRAM_ID,
  )[0];

  const readCurveFee = async (): Promise<string> => {
    const info = await connection.getAccountInfo(curvePda);
    if (info === null) return 'absente';
    const curve = PUMP_SDK.decodeBondingCurve(info);
    return `creatorFee=${curve.creatorFee?.toString() ?? '?'} creator=${curve.creator.toBase58()}`;
  };

  console.log(`curve avant buy   : ${await readCurveFee()}`);
  console.log(`vault avant buy   : ${(await connection.getBalance(vaultPda))} lamports`);

  // Buy du trader
  const curveInfo1 = await connection.getAccountInfo(curvePda);
  if (curveInfo1 === null) throw new Error('courbe absente');
  const curve1 = PUMP_SDK.decodeBondingCurve(curveInfo1);
  const buyIxs = await PUMP_SDK.buyInstructions({
    global,
    bondingCurveAccountInfo: curveInfo1,
    bondingCurve: curve1,
    associatedUserAccountInfo: null,
    mint: mint.publicKey,
    user: trader.publicKey,
    amount: new BN('1000000000'),
    solAmount: new BN('500000000'),
    slippage: 0.25,
    tokenProgram: TOKEN_2022,
  });
  const buySig = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(...buyIxs),
    [trader],
    { commitment: 'confirmed' },
  );
  console.log(`buy sig           : ${buySig}`);
  console.log(`curve après buy   : ${await readCurveFee()}`);
  console.log(`vault après buy   : ${(await connection.getBalance(vaultPda))} lamports`);

  // Sweep seul (simulé d'abord pour voir les logs, puis réel)
  const sweepIx = await PUMP_SDK.sweepCreatorFeeInstruction({
    payer: trader.publicKey,
    mint: mint.publicKey,
    creator: scPda,
    quoteMint: NATIVE_MINT,
    quoteTokenProgram: TOKEN_PROGRAM_ID,
  });
  const sweepTx = new Transaction().add(sweepIx);
  const sweepSim = await connection.simulateTransaction(sweepTx, [trader], true);
  console.log(`\nsweep sim.err = ${JSON.stringify(sweepSim.value.err)}`);
  for (const line of sweepSim.value.logs ?? []) console.log(`  ${line}`);

  // Sweep réel
  await sendAndConfirmTransaction(connection, sweepTx, [trader], { commitment: 'confirmed' });
  console.log(`curve après sweep : ${await readCurveFee()}`);
  console.log(`vault après sweep : ${(await connection.getBalance(vaultPda))} lamports`);

  // Distribute simulé puis réel
  const scInfo = await connection.getAccountInfo(scPda);
  if (scInfo === null) throw new Error('sharing_config absente');
  const sharingConfig = PUMP_SDK.decodeSharingConfig(scInfo);
  console.log(
    `shareholders      : ${sharingConfig.shareholders.map((s) => `${s.address.toBase58()}=${s.shareBps}`).join(' ')}`,
  );
  const distIx = await PUMP_SDK.distributeCreatorFeesV2({
    mint: mint.publicKey,
    sharingConfig,
    sharingConfigAddress: scPda,
    quoteMint: NATIVE_MINT,
    payer: trader.publicKey,
    shouldInitializeAta: false,
    quoteTokenProgram: TOKEN_PROGRAM_ID,
  });
  const distTx = new Transaction().add(distIx);
  const distSim = await connection.simulateTransaction(distTx, [trader], true);
  console.log(`\ndistribute sim.err = ${JSON.stringify(distSim.value.err)}`);
  for (const line of distSim.value.logs ?? []) console.log(`  ${line}`);

  const before75 = await connection.getBalance(launcher.publicKey);
  const before25 = await connection.getBalance(platform.publicKey);
  await sendAndConfirmTransaction(connection, distTx, [trader], { commitment: 'confirmed' });
  const after75 = await connection.getBalance(launcher.publicKey);
  const after25 = await connection.getBalance(platform.publicKey);
  console.log(`\nversé 75%        : ${after75 - before75}`);
  console.log(`versé 25%        : ${after25 - before25}`);
  console.log(`vault final       : ${(await connection.getBalance(vaultPda))} lamports`);
}

main().catch((error: unknown) => {
  console.error('DEBUG ÉCHEC :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
