/**
 * T5 — Rentabilité de la distribution (SPEC §3 T5).
 *
 * Niveau : F (fork local de mainnet, cf. scripts/start-fork.sh) — aucun fonds réel.
 * Hypothèse : le coût réel d'un appel `distribute_creator_fees_v2` (frais de
 *   transaction, base + priority fee) reste < 1 % du montant distribué, ce qui
 *   permet d'en déduire un seuil minimal d'accumulation avant distribution.
 * Réussite : coût mesuré (getTransaction → meta.fee, meta.computeUnitsConsumed)
 *   sur 2 distributions (sans puis avec priority fee explicite), ratio
 *   coût/montant < 1 % dans les deux cas, et seuil = ceil(coût_max / 1 %)
 *   documenté.
 *
 * Mécanique de seuil reprise de T4 (prouvée) : le programme ne verse que si le
 * vault dépasse son minimum (constaté 4 454 400 lamports) — seuil retenu après
 * la 1re observation, boucle sur la balance réelle du vault.
 *
 * Usage : pnpm spike:T5   (le fork doit tourner : scripts/start-fork.sh)
 */
import {
  ComputeBudgetProgram,
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
import {
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import BN from 'bn.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fund } from './helpers/fund.js';

const RPC = process.env.FORK_RPC ?? 'http://127.0.0.1:8899';
const STATE_DIR = join(dirname(fileURLToPath(import.meta.url)), '.state');
const TOKEN_2022 = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const BUY_BUDGET = new BN('2000000000'); // 2 SOL max par buy
const MAX_BUYS_PER_CYCLE = 30;
const PRIORITY_LAMPORTS_PER_CU = 1_000; // priority fee volontairement visible

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERTION ÉCHOUÉE : ${message}`);
  }
}

interface CostMeasurement {
  label: string;
  priority: boolean;
  distributed: number;
  fee: number;
  computeUnitsConsumed: number | null;
  ratioPct: number;
  signature: string;
}

/** Estimation de tokens achetables pour un budget (courbe constant-product + marge fees). */
function tokensForBudget(
  curve: { virtualQuoteReserves: BN; virtualTokenReserves: BN },
  budget: BN,
): BN {
  const vQ = curve.virtualQuoteReserves;
  const vT = curve.virtualTokenReserves;
  const b = budget.muln(98).divn(100);
  return b.mul(vT).div(vQ.add(b));
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

  // --- Setup : coin + fee sharing 75/25 (reprise T1 + T2) ---
  const launcher = Keypair.generate();
  const platform = Keypair.generate();
  const trader = Keypair.generate();
  await fund(connection, launcher.publicKey, 100 * LAMPORTS_PER_SOL);
  await fund(connection, trader.publicKey, 200 * LAMPORTS_PER_SOL);

  const mint = Keypair.generate();
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      ...(await PUMP_SDK.createV2AndBuyInstructions({
        global,
        mint: mint.publicKey,
        name: 'Spike T5',
        symbol: 'T5',
        uri: 'https://example.com/spike-t5.json',
        creator: launcher.publicKey,
        user: launcher.publicKey,
        amount: new BN('1000000000'),
        solAmount: new BN('100000000'),
        mayhemMode: false,
      })),
    ),
    [launcher, mint],
    { commitment: 'confirmed' },
  );

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
    [Buffer.from('creator-vault'), sharingConfigPda.toBuffer()],
    PUMP_PROGRAM_ID,
  )[0];

  /** Construit sweep+distribute (± priority fee). */
  async function buildTx(priority: boolean): Promise<Transaction> {
    const scInfo = await connection.getAccountInfo(sharingConfigPda);
    assert(scInfo !== null, 'sharing_config absente');
    const sharingConfig = PUMP_SDK.decodeSharingConfig(scInfo);
    const tx = new Transaction();
    if (priority) {
      // Plafond volontairement large : c'est le prix réellement payé qu'on mesure.
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
      tx.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: PRIORITY_LAMPORTS_PER_CU,
        }),
      );
    }
    tx.add(
      await PUMP_SDK.sweepCreatorFeeInstruction({
        payer: trader.publicKey,
        mint: mint.publicKey,
        creator: sharingConfigPda,
        quoteMint: NATIVE_MINT,
        quoteTokenProgram: TOKEN_PROGRAM_ID,
      }),
    );
    tx.add(
      await PUMP_SDK.distributeCreatorFeesV2({
        mint: mint.publicKey,
        sharingConfig,
        sharingConfigAddress: sharingConfigPda,
        quoteMint: NATIVE_MINT,
        payer: trader.publicKey,
        shouldInitializeAta: false,
        quoteTokenProgram: TOKEN_PROGRAM_ID,
      }),
    );
    return tx;
  }

  /** Seuil minimum du vault via simulation (0 = le programme verserait). */
  async function probeMinimum(): Promise<number> {
    const sim = await connection.simulateTransaction(await buildTx(false), [trader], true);
    const logs = sim.value.logs ?? [];
    const insufficient = logs.find((line) => line.includes('Minimum vault balance needed'));
    if (insufficient !== undefined) {
      const match = /needed: (\d+) lamports/.exec(insufficient);
      assert(match !== null, `seuil illisible : ${insufficient}`);
      return Number(match[1]);
    }
    if (sim.value.err !== null) {
      throw new Error(`simulation en erreur : ${JSON.stringify(sim.value.err)}`);
    }
    return 0;
  }

  async function doBuy(): Promise<void> {
    const curveInfo = await connection.getAccountInfo(curvePda);
    assert(curveInfo !== null, 'bonding curve absente');
    const curve = PUMP_SDK.decodeBondingCurve(curveInfo);
    const ata = getAssociatedTokenAddressSync(mint.publicKey, trader.publicKey, true, TOKEN_2022);
    const ataInfo = await connection.getAccountInfo(ata);
    const tokens = tokensForBudget(curve, BUY_BUDGET);
    assert(tokens.gt(new BN(0)), 'estimation de tokens nulle');
    const buyIxs = await PUMP_SDK.buyInstructions({
      global,
      bondingCurveAccountInfo: curveInfo,
      bondingCurve: curve,
      associatedUserAccountInfo: ataInfo,
      mint: mint.publicKey,
      user: trader.publicKey,
      amount: tokens,
      solAmount: BUY_BUDGET,
      slippage: 0.5,
      tokenProgram: TOKEN_2022,
    });
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(...buyIxs),
      [trader],
      { commitment: 'confirmed' },
    );
  }

  /** Achète jusqu'à ce que le vault dépasse le seuil, puis distribue et mesure le coût. */
  async function measureOnce(label: string, priority: boolean): Promise<CostMeasurement> {
    // Seuil retenu (mécanique T4) : le probe ne le donne que sous le plancher
    // du vault, donc on le capture AVANT (vault = 0 au démarrage).
    let buys = 0;
    while ((await connection.getBalance(vaultPda)) < retainedMinimum) {
      assert(buys < MAX_BUYS_PER_CYCLE, `${label} : ${MAX_BUYS_PER_CYCLE} buys insuffisants`);
      await doBuy();
      buys += 1;
    }

    const before75 = await connection.getBalance(launcher.publicKey);
    const before25 = await connection.getBalance(platform.publicKey);
    const sig = await sendAndConfirmTransaction(connection, await buildTx(priority), [trader], {
      commitment: 'confirmed',
    });
    const after75 = await connection.getBalance(launcher.publicKey);
    const after25 = await connection.getBalance(platform.publicKey);
    const distributed = after75 - before75 + (after25 - before25);
    assert(distributed > 0, `${label} : rien versé (total=${distributed})`);

    // Coût réel = frais de la tx (base + priority) lus dans le réceptacle.
    const tx = await connection.getTransaction(sig, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    assert(tx !== null && tx.meta !== null, `${label} : tx introuvable`);
    const fee = tx.meta.fee;
    const cu = tx.meta.computeUnitsConsumed ?? null;
    const ratioPct = (fee / distributed) * 100;

    console.log(
      `${label} : versé=${distributed} · coût=${fee} lamports` +
        (cu !== null ? ` (${cu} CU)` : '') +
        ` · ratio=${ratioPct.toFixed(4)} %`,
    );
    assert(ratioPct < 1, `${label} : ratio ${ratioPct} % ≥ 1 %`);
    return {
      label,
      priority,
      distributed,
      fee,
      computeUnitsConsumed: cu,
      ratioPct,
      signature: sig,
    };
  }

  // Deux mesures : sans priority fee, puis avec priority fee explicite.
  // Capture du seuil : vault = 0 ici → le probe donne le minimum exigé.
  const retainedMinimum = await probeMinimum();
  assert(retainedMinimum > 0, 'seuil de distribution jamais observé (vault déjà couvert ?)');
  console.log(`seuil programme : ${retainedMinimum} lamports`);

  const measurements: CostMeasurement[] = [];
  measurements.push(await measureOnce('base (frais seuls)', false));
  measurements.push(await measureOnce('priority 1000 lamports/CU', true));

  const maxFee = Math.max(...measurements.map((m) => m.fee));
  const threshold = Math.ceil(maxFee / 0.01); // coût = 1 % du montant
  const maxRatio = Math.max(...measurements.map((m) => m.ratioPct));
  const minDistributable = Math.max(threshold, 4_454_400); // plancher constaté en T4

  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(
    join(STATE_DIR, 't05.json'),
    JSON.stringify(
      {
        rpc: RPC,
        mint: mint.publicKey.toBase58(),
        measurements,
        maxFee,
        thresholdFor1Pct: threshold,
        programFloorObserved: 4_454_400,
        recommendedMinVault: minDistributable,
      },
      null,
      2,
    ),
  );

  console.log('=== T5 RÉSULTAT ===');
  console.log(`coût max       : ${maxFee} lamports (base 5 000 + priority éventuelle)`);
  console.log(`ratio max      : ${maxRatio.toFixed(4)} % (seuil 1 %)`);
  console.log(`seuil 1 %      : ${threshold} lamports accumulés avant distribution`);
  console.log(
    `seuil retenu   : ${minDistributable} lamports ` +
      `(max(seuil 1 %, plancher programme ${4_454_400}))`,
  );
  console.log('statut         : GO (fork local)');
  console.log(`état sauvegardé : ${join(STATE_DIR, 't05.json')}`);
}

main().catch((error: unknown) => {
  console.error('T5 ÉCHEC :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
