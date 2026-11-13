/**
 * Diagnostic T4 bis — reproduit setup + cycle 1, puis instrumente le cycle 2.
 *
 * Échec observé : cycle 1 verse 5 880 000 (Δ0), cycle 2成功 sans verser (total=0).
 * On imprime, à chaque étape du cycle 2 : balance du vault, creatorFee courbe,
 * logs COMPLETS de la simulation sweep+distribute, et le seuil parsé — pour
 * savoir si pendingMinimum rend0 à tort (logs vides ?) ou si le réel ne paie pas.
 * Un buy par cycle est réel (nécessaire pour générer des fees).
 */
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { PUMP_SDK, GLOBAL_PDA, PUMP_PROGRAM_ID, feeSharingConfigPda } from '@pump-fun/pump-sdk';
import {
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import BN from 'bn.js';
import { fund } from './helpers/fund.js';

const RPC = process.env.FORK_RPC ?? 'http://127.0.0.1:8899';
const TOKEN_2022 = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const BUY_BUDGET = new BN('2000000000');

async function main(): Promise<void> {
  const connection = new Connection(RPC, 'confirmed');
  const globalInfo = await connection.getAccountInfo(GLOBAL_PDA);
  if (globalInfo === null) throw new Error('fork non prêt');
  const global = PUMP_SDK.decodeGlobal(globalInfo);

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
        name: 'Debug T4b',
        symbol: 'D4b',
        uri: 'https://example.com/debug-t4b.json',
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

  const scPda = feeSharingConfigPda(mint.publicKey);
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      await PUMP_SDK.createFeeSharingConfig({ creator: launcher.publicKey, mint: mint.publicKey, pool: null }),
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

  async function buildTx(): Promise<Transaction> {
    const scInfo = await connection.getAccountInfo(scPda);
    if (scInfo === null) throw new Error('sc absente');
    const sharingConfig = PUMP_SDK.decodeSharingConfig(scInfo);
    return new Transaction().add(
      await PUMP_SDK.sweepCreatorFeeInstruction({
        payer: trader.publicKey,
        mint: mint.publicKey,
        creator: scPda,
        quoteMint: NATIVE_MINT,
        quoteTokenProgram: TOKEN_PROGRAM_ID,
      }),
      await PUMP_SDK.distributeCreatorFeesV2({
        mint: mint.publicKey,
        sharingConfig,
        sharingConfigAddress: scPda,
        quoteMint: NATIVE_MINT,
        payer: trader.publicKey,
        shouldInitializeAta: false,
        quoteTokenProgram: TOKEN_PROGRAM_ID,
      }),
    );
  }

  async function simLogs(label: string): Promise<number> {
    const sim = await connection.simulateTransaction(await buildTx(), [trader], true);
    const logs = sim.value.logs ?? [];
    console.log(`\n[${label}] sim.err = ${JSON.stringify(sim.value.err)} · ${logs.length} lignes de log`);
    for (const line of logs) console.log(`    ${line}`);
    const insuff = logs.find((l) => l.includes('Minimum vault balance needed'));
    if (insuff !== undefined) {
      const m = /needed: (\d+) lamports/.exec(insuff);
      const min = m !== null ? Number(m[1]) : -1;
      console.log(`    → seuil parsé = ${min}`);
      return min;
    }
    return 0;
  }

  async function buyOnce(): Promise<void> {
    const curveInfo = await connection.getAccountInfo(curvePda);
    if (curveInfo === null) throw new Error('courbe absente');
    const curve = PUMP_SDK.decodeBondingCurve(curveInfo);
    const vQ = curve.virtualQuoteReserves;
    const vT = curve.virtualTokenReserves;
    const b = BUY_BUDGET.muln(98).divn(100);
    const tokens = b.mul(vT).div(vQ.add(b));
    const ata = getAssociatedTokenAddressSync(mint.publicKey, trader.publicKey, true, TOKEN_2022);
    const ataInfo = await connection.getAccountInfo(ata);
    const ixs = await PUMP_SDK.buyInstructions({
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
    const sig = await sendAndConfirmTransaction(connection, new Transaction().add(...ixs), [trader], {
      commitment: 'confirmed',
    });
    const traderBal = await connection.getBalance(trader.publicKey);
    console.log(`    buy ${sig.slice(0, 16)}… · solde trader = ${traderBal}`);
  }

  const dump = async (label: string): Promise<void> => {
    const vault = await connection.getBalance(vaultPda);
    const curveInfo = await connection.getAccountInfo(curvePda);
    const curve = curveInfo !== null ? PUMP_SDK.decodeBondingCurve(curveInfo) : null;
    console.log(
      `[${label}] vault=${vault} · creatorFee(courbe)=${curve?.creatorFee?.toString() ?? '?'} · ` +
        `trader=${await connection.getBalance(trader.publicKey)}`,
    );
  };

  // ---- CYCLE 1 (comme t04) ----
  await dump('c1 avant');
  let min = await simLogs('c1 sim initiale');
  let buys = 0;
  while (min > 0 && buys < 5) {
    const vault = await connection.getBalance(vaultPda);
    if (vault >= min) break;
    await buyOnce();
    buys += 1;
    min = await simLogs(`c1 sim après buy ${buys}`);
  }
  await dump('c1 avant distribute');
  const b75 = await connection.getBalance(launcher.publicKey);
  const b25 = await connection.getBalance(platform.publicKey);
  await sendAndConfirmTransaction(connection, await buildTx(), [trader], { commitment: 'confirmed' });
  console.log(
    `[c1 distribute] versé 75%=${(await connection.getBalance(launcher.publicKey)) - b75} · ` +
      `25%=${(await connection.getBalance(platform.publicKey)) - b25}`,
  );
  await dump('c1 après');

  // ---- CYCLE 2 (le bugué) ----
  console.log('\n=== CYCLE 2 ===');
  await dump('c2 avant');
  min = await simLogs('c2 sim initiale');
  console.log(`[c2] seuil initial = ${min}`);
  if (min > 0) {
    const vault = await connection.getBalance(vaultPda);
    console.log(`[c2] vault=${vault} < seuil ? ${vault < min}`);
    let n = 0;
    while (min > 0 && n < 5) {
      await buyOnce();
      n += 1;
      min = await simLogs(`c2 sim après buy ${n}`);
    }
  }
  await dump('c2 avant distribute');
  const c75 = await connection.getBalance(launcher.publicKey);
  const c25 = await connection.getBalance(platform.publicKey);
  const sig2 = await sendAndConfirmTransaction(connection, await buildTx(), [trader], {
    commitment: 'confirmed',
  });
  console.log(
    `[c2 distribute] sig=${sig2.slice(0, 16)}… versé 75%=${(await connection.getBalance(launcher.publicKey)) - c75} · ` +
      `25%=${(await connection.getBalance(platform.publicKey)) - c25}`,
  );
  await dump('c2 après');
}

main().catch((error: unknown) => {
  console.error('DEBUG ÉCHEC :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
