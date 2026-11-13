/**
 * T4 — Split exact 75/25 ±1 lamport sur ≥ 5 distributions (SPEC §3 T4).
 *
 * Niveau : F (fork local de mainnet, cf. scripts/start-fork.sh) — aucun fonds réel.
 * Hypothèse : après opt-in fee sharing (7500/2500), chaque cycle
 *   « buys (génèrent des creator fees) → sweep + distributeCreatorFeesV2 »
 *   verse aux 2 bénéficiaires un montant dont l'écart au split exact 75/25
 *   reste ≤ 1 lamport.
 * Réussite : ≥ 5 distributions mesurées (delta de balance par bénéficiaire),
 *   chacune avec |reçu - part théorique| ≤ 1 lamport.
 *
 * Le programme RÉUSSIT sans rien verser si le vault est sous son minimum
 * (constaté : log « Insufficient fees for distribution. Minimum vault balance
 * needed: N lamports » + success) → chaque cycle simule d'abord le distribute,
 * parse le seuil, puis achète jusqu'à l'atteindre.
 *
 * Usage : pnpm spike:T4   (le fork doit tourner : scripts/start-fork.sh)
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
const DISTRIBUTIONS = 5;
const BUY_BUDGET = new BN('2000000000'); // 2 SOL max par buy
const MAX_BUYS_PER_CYCLE = 30;

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERTION ÉCHOUÉE : ${message}`);
  }
}

interface CycleResult {
  cycle: number;
  buys: number;
  distributed: number;
  got75: number;
  got25: number;
  expected75: number;
  expected25: number;
  drift75: number;
  drift25: number;
  signature: string;
}

/** Simule sweep+distribute ; renvoie le minimum de vault exigé (0 = prêt à verser). */
async function pendingMinimum(
  connection: Connection,
  sweepDistTx: Transaction,
  signers: Keypair[],
): Promise<number> {
  const sim = await connection.simulateTransaction(sweepDistTx, signers, true);
  const logs = sim.value.logs ?? [];
  const insufficient = logs.find((line) => line.includes('Minimum vault balance needed'));
  if (insufficient !== undefined) {
    const match = /needed: (\d+) lamports/.exec(insufficient);
    assert(match !== null, `seuil illisible : ${insufficient}`);
    return Number(match[1]);
  }
  if (sim.value.err !== null) {
    throw new Error(`simulation sweep+distribute en erreur : ${JSON.stringify(sim.value.err)}`);
  }
  return 0;
}

/** Estimation de tokens achetables pour un budget (courbe constant-product + marge fees). */
function tokensForBudget(curve: { virtualQuoteReserves: BN; virtualTokenReserves: BN }, budget: BN): BN {
  const vQ = curve.virtualQuoteReserves;
  const vT = curve.virtualTokenReserves;
  // t = B·vT/(vQ+B), avec B réduit de 2 % pour couvrir les fees (~1 %) dans le budget.
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
  const launcher = Keypair.generate(); // créateur + bénéficiaire 75 %
  const platform = Keypair.generate(); // bénéficiaire 25 %
  const trader = Keypair.generate(); // acheteur qui génère les creator fees
  await fund(connection, launcher.publicKey, 100 * LAMPORTS_PER_SOL);
  await fund(connection, trader.publicKey, 200 * LAMPORTS_PER_SOL);

  const mint = Keypair.generate();
  const createInstructions = await PUMP_SDK.createV2AndBuyInstructions({
    global,
    mint: mint.publicKey,
    name: 'Spike T4',
    symbol: 'T4',
    uri: 'https://example.com/spike-t4.json',
    creator: launcher.publicKey,
    user: launcher.publicKey,
    amount: new BN('1000000000'),
    solAmount: new BN('100000000'),
    mayhemMode: false,
  });
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(...createInstructions),
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

  /** Construit la tx sweep+distribute (shareholders inchangés après T2). */
  async function buildSweepDistTx(): Promise<Transaction> {
    const scInfo = await connection.getAccountInfo(sharingConfigPda);
    assert(scInfo !== null, 'sharing_config absente');
    const sharingConfig = PUMP_SDK.decodeSharingConfig(scInfo);
    const sweepIx = await PUMP_SDK.sweepCreatorFeeInstruction({
      payer: trader.publicKey,
      mint: mint.publicKey,
      creator: sharingConfigPda,
      quoteMint: NATIVE_MINT,
      quoteTokenProgram: TOKEN_PROGRAM_ID,
    });
    const distributeIx = await PUMP_SDK.distributeCreatorFeesV2({
      mint: mint.publicKey,
      sharingConfig,
      sharingConfigAddress: sharingConfigPda,
      quoteMint: NATIVE_MINT,
      payer: trader.publicKey,
      shouldInitializeAta: false,
      quoteTokenProgram: TOKEN_PROGRAM_ID,
    });
    return new Transaction().add(sweepIx, distributeIx);
  }

  /** Un buy d'au plus BUY_BUDGET selon l'état courant de la courbe. */
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
      slippage: 0.5, // +0,5 % de budget max (ajouté par le SDK)
      tokenProgram: TOKEN_2022,
    });
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(...buyIxs),
      [trader],
      { commitment: 'confirmed' },
    );
  }

  // --- Boucle : buys jusqu'au seuil → sweep+distribute ×5 ---
  // Piège constaté (debug2) : le programme ne donne le seuil « Minimum vault
  // balance needed » que lorsque le vault est SOUS son plancher de rent. Au
  // plancher exact (890 880), il réussit en silence avec 0 versé → on retient
  // donc le premier seuil vu et on compare à la balance RÉELLE du vault.
  const results: CycleResult[] = [];
  let totalBuys = 0;
  let minimum = 0;
  for (let cycle = 1; cycle <= DISTRIBUTIONS; cycle++) {
    // (a) simulation → met à jour le seuil si le programme se plaint
    const probed = await pendingMinimum(connection, await buildSweepDistTx(), [trader]);
    if (probed > 0) minimum = probed;
    assert(minimum > 0, `cycle ${cycle} : seuil inconnu (jamais observé)`);

    // (b) buys jusqu'à ce que le vault dépasse le seuil
    let buys = 0;
    while ((await connection.getBalance(vaultPda)) < minimum) {
      assert(buys < MAX_BUYS_PER_CYCLE, `cycle ${cycle} : ${MAX_BUYS_PER_CYCLE} buys insuffisants`);
      await doBuy();
      buys += 1;
      totalBuys += 1;
    }

    // (c) balances avant / distribute réel
    const before75 = await connection.getBalance(launcher.publicKey);
    const before25 = await connection.getBalance(platform.publicKey);
    const distributeSig = await sendAndConfirmTransaction(
      connection,
      await buildSweepDistTx(),
      [trader],
      { commitment: 'confirmed' },
    );

    // (d) delta réel versé
    const after75 = await connection.getBalance(launcher.publicKey);
    const after25 = await connection.getBalance(platform.publicKey);
    const got75 = after75 - before75;
    const got25 = after25 - before25;
    const total = got75 + got25;
    assert(total > 0, `cycle ${cycle} : aucun montant versé (total=${total})`);

    const expected75 = (total * 7500) / 10_000;
    const expected25 = (total * 2500) / 10_000;
    const drift75 = Math.abs(got75 - expected75);
    const drift25 = Math.abs(got25 - expected25);

    results.push({
      cycle,
      buys,
      distributed: total,
      got75,
      got25,
      expected75,
      expected25,
      drift75,
      drift25,
      signature: distributeSig,
    });

    console.log(
      `cycle ${cycle} : ${buys} buy(s) · total=${total} · 75%→${got75} (attendu ${expected75}, Δ${drift75}) · ` +
        `25%→${got25} (attendu ${expected25}, Δ${drift25})`,
    );
    assert(drift75 <= 1, `cycle ${cycle} : dérive 75 % = ${drift75} lamports (> 1)`);
    assert(drift25 <= 1, `cycle ${cycle} : dérive 25 % = ${drift25} lamports (> 1)`);
  }

  assert(results.length >= 5, `${results.length} distributions (< 5)`);

  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(
    join(STATE_DIR, 't04.json'),
    JSON.stringify(
      {
        rpc: RPC,
        mint: mint.publicKey.toBase58(),
        totalBuys,
        results,
      },
      null,
      2,
    ),
  );

  const maxDrift = Math.max(...results.map((r) => Math.max(r.drift75, r.drift25)));
  console.log('=== T4 RÉSULTAT ===');
  console.log(`distributions  : ${results.length} (${totalBuys} buys au total)`);
  console.log(`dérive max     : ${maxDrift} lamport(s) (seuil 1)`);
  console.log(`séries         : ${results.map((r) => r.distributed).join(' + ')} lamports`);
  console.log('statut         : GO (fork local)');
  console.log(`état sauvegardé : ${join(STATE_DIR, 't04.json')}`);
}

main().catch((error: unknown) => {
  console.error('T4 ÉCHEC :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
