/**
 * Diagnostic T1 quinquies — logs de simulation complets + soldes.
 *
 * debug3 a montré que le compte faillant est un PDA propriétaire `pfeeUxB...`
 * (Fees program), absent du fork (propore à chaque mint). Reste à savoir QUI
 * paie sa création et pourquoi les lamports manquent alors que le fee payer a
 * 100 SOL. On imprime : solde fee payer avant/après fund, logs de simulation,
 * comptes renvoyés par la simulation, et le compte faillant.
 * Lecture seule : simulation uniquement.
 */
import { Connection, Keypair, Transaction } from '@solana/web3.js';
import { PUMP_SDK, GLOBAL_PDA } from '@pump-fun/pump-sdk';
import BN from 'bn.js';
import { fund } from './helpers/fund.js';

const RPC = process.env.FORK_RPC ?? 'http://127.0.0.1:8899';

async function main(): Promise<void> {
  const connection = new Connection(RPC, 'confirmed');
  const globalInfo = await connection.getAccountInfo(GLOBAL_PDA);
  if (globalInfo === null) throw new Error('global absent');
  const global = PUMP_SDK.decodeGlobal(globalInfo);

  const launcher = Keypair.generate();
  await fund(connection, launcher.publicKey, 100_000_000_000);
  const afterFund = await connection.getBalance(launcher.publicKey);
  console.log(`fee payer ${launcher.publicKey.toBase58()} solde = ${afterFund} lamports (${afterFund / 1e9} SOL)`);

  const mint = Keypair.generate();
  const instructions = await PUMP_SDK.createV2AndBuyInstructions({
    global,
    mint: mint.publicKey,
    name: 'Spike T1',
    symbol: 'T1',
    uri: 'https://example.com/spike-t1.json',
    creator: launcher.publicKey,
    user: launcher.publicKey,
    amount: new BN('1000000000'),
    solAmount: new BN('100000000'),
    mayhemMode: false,
  });

  const tx = new Transaction().add(...instructions);
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = launcher.publicKey;

  const sim = await connection.simulateTransaction(tx, undefined, true);
  console.log(`\nsim.err = ${JSON.stringify(sim.value.err)}`);
  console.log('--- logs ---');
  for (const line of sim.value.logs ?? []) console.log(`  ${line}`);
  console.log('--- comptes renvoyés ---');
  const simErr = sim.value.err as Record<string, { account_index?: number }> | null;
  const idxErr = simErr === null ? undefined : simErr['InsufficientFundsForRent']?.account_index;
  (sim.value.accounts ?? []).forEach((acc, i) => {
    if (acc === null) {
      console.log(`  [${i}] null${idxErr === i ? '  <=== FAILLANT' : ''}`);
      return;
    }
    const lamports = 'lamports' in acc ? acc.lamports : '?';
    const marker = idxErr === i ? '  <=== FAILLANT' : '';
    console.log(`  [${i}] lamports=${lamports} owner=${String(acc.owner)}${marker}`);
  });
}

main().catch((error: unknown) => {
  console.error('DEBUG ÉCHEC :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
