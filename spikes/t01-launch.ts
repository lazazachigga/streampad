/**
 * T1 — Lancement pump.fun par programme (SPEC §3 T1).
 *
 * Niveau : F (fork local de mainnet, cf. scripts/start-fork.sh) — aucun fonds réel.
 * Hypothèse : créer un token SOL-apparié via @pump-fun/pump-sdk (create_v2 + premier buy)
 * depuis un wallet launcher, avec nom/symbole/uri.
 * Réussite : mint créé + bonding curve initialisée + coût mesuré.
 *   (La visibilité pump.fun/Solscan n'est possible qu'en mainnet → notée en fin de script.)
 *
 * Usage : pnpm spike:T1   (le fork doit tourner : scripts/start-fork.sh)
 */
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from '@solana/web3.js';
import { PUMP_SDK, GLOBAL_PDA, PUMP_PROGRAM_ID } from '@pump-fun/pump-sdk';
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

  const launcher = Keypair.generate();
  const fundSig = await fund(connection, launcher.publicKey, 100 * LAMPORTS_PER_SOL);
  const balanceBefore = await connection.getBalance(launcher.publicKey);

  const mint = Keypair.generate();
  const name = 'Spike T1';
  const symbol = 'T1';
  const uri = 'https://example.com/spike-t1.json';

  const instructions = await PUMP_SDK.createV2AndBuyInstructions({
    global,
    mint: mint.publicKey,
    name,
    symbol,
    uri,
    creator: launcher.publicKey,
    user: launcher.publicKey,
    amount: new BN('1000000000'), // 1 000 tokens (6 décimales)
    solAmount: new BN('100000000'), // 1 SOL de faux fonds
    mayhemMode: false,
  });

  const tx = new Transaction().add(...instructions);
  const signature = await sendAndConfirmTransaction(connection, tx, [launcher, mint], {
    commitment: 'confirmed',
  });

  const balanceAfter = await connection.getBalance(launcher.publicKey);
  const costLamports = balanceBefore - balanceAfter;

  // Vérifications post-condition
  const mintInfo = await connection.getAccountInfo(mint.publicKey);
  assert(mintInfo !== null, 'compte mint absent');
  const token2022 = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
  assert(
    mintInfo.owner.equals(token2022),
    `mint owner ${mintInfo.owner.toBase58()} != Token-2022`,
  );

  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.publicKey.toBuffer()],
    PUMP_PROGRAM_ID,
  );
  const curveInfo = await connection.getAccountInfo(bondingCurve);
  assert(curveInfo !== null, 'bonding curve absente');
  const curve = PUMP_SDK.decodeBondingCurve(curveInfo);
  assert(
    curve.creator.toBase58() === launcher.publicKey.toBase58(),
    `bonding curve creator ${curve.creator.toBase58()} != launcher`,
  );

  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(
    join(STATE_DIR, 't01.json'),
    JSON.stringify(
      {
        rpc: RPC,
        signature,
        fundSignature: fundSig,
        mint: mint.publicKey.toBase58(),
        bondingCurve: bondingCurve.toBase58(),
        launcherSecret: Buffer.from(launcher.secretKey).toString('base64'),
        costLamports,
        costSol: costLamports / LAMPORTS_PER_SOL,
      },
      null,
      2,
    ),
  );

  console.log('=== T1 RÉSULTAT ===');
  console.log(`signature      : ${signature}`);
  console.log(`financement    : ${fundSig}`);
  console.log(`mint           : ${mint.publicKey.toBase58()}`);
  console.log(`bonding curve  : ${bondingCurve.toBase58()}`);
  console.log(`coût total     : ${costLamports} lamports (${(costLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL)`);
  console.log('statut         : GO (fork local) — visibilité pump.fun/Solscan : NON TESTÉ (mainnet requis)');
  console.log(`état sauvegardé : ${join(STATE_DIR, 't01.json')}`);
}

main().catch((error: unknown) => {
  console.error('T1 ÉCHEC :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
