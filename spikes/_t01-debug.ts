/**
 * Diagnostic T1 bis — quel compte est « InsufficientFundsForRent » ?
 * Reproduit la tx, liste les comptes avec leur état AVANT la simulation
 * (existe ? lamports ? owner ?) et identifie mint / bonding curve / ATA / global.
 * Lecture seule : simulation uniquement, aucune transaction envoyée.
 */
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PUMP_SDK, GLOBAL_PDA, PUMP_PROGRAM_ID } from '@pump-fun/pump-sdk';
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
  const msg = tx.compileMessage();
  const keys = msg.accountKeys;

  // Adresses connues pour nommer les comptes
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.publicKey.toBuffer()],
    PUMP_PROGRAM_ID,
  );
  const [assocBonding] = PublicKey.findProgramAddressSync(
    [mint.publicKey.toBuffer(), PUMP_PROGRAM_ID.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const [userAta] = PublicKey.findProgramAddressSync(
    [launcher.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.publicKey.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const known = new Map<string, string>([
    [launcher.publicKey.toBase58(), 'launcher (feePayer)'],
    [mint.publicKey.toBase58(), 'mint (Token-2022)'],
    [GLOBAL_PDA.toBase58(), 'global PDA'],
    [bondingCurve.toBase58(), 'bonding curve PDA'],
    [assocBonding.toBase58(), 'bonding curve ATA'],
    [userAta.toBase58(), 'user ATA (SPL Token)'],
  ]);

  const infos = await connection.getMultipleAccountsInfo(keys);
  console.log('--- comptes (état AVANT) ---');
  infos.forEach((info, i) => {
    const key = keys[i];
    if (key === undefined) return;
    const name = known.get(key.toBase58()) ?? '';
    const state =
      info === null
        ? 'ABSENT (à créer dans la tx)'
        : `existe lamports=${(info.lamports / 1e9).toFixed(9)} owner=${info.owner.toBase58()}`;
    console.log(`  [${i}] ${key.toBase58()} ${name ? `← ${name}` : ''} :: ${state}`);
  });

  const sim = await connection.simulateTransaction(tx, undefined, true);
  console.log(`\nsim.err = ${JSON.stringify(sim.value.err)}`);
  if (Array.isArray(sim.value.logs)) {
    console.log('--- logs (fin) ---');
    sim.value.logs.slice(-12).forEach((l) => console.log(`  ${l}`));
  }
}

main().catch((error: unknown) => {
  console.error('DEBUG ÉCHEC :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
