/**
 * Diagnostic T1 ter — quelle instruction crée le compte sous-financé (rent) ?
 *
 * À chaque exécution : construit la tx de t01-launch, imprime chaque instruction avec
 * les indices de message de ses comptes, décide SystemProgram.createAccount
 * (lamports vs getMinimumBalanceForRentExemption(space)), puis simule et mappe
 * `InsufficientFundsForRent.account_index` vers l'instruction qui le référence.
 * Lecture seule : simulation uniquement, rien n'est envoyé.
 */
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PUMP_SDK, GLOBAL_PDA, PUMP_PROGRAM_ID } from '@pump-fun/pump-sdk';
import BN from 'bn.js';
import { fund } from './helpers/fund.js';

const RPC = process.env.FORK_RPC ?? 'http://127.0.0.1:8899';

interface AccountMetaLike {
  pubkey: PublicKey;
  isSigner: boolean;
  isWritable: boolean;
}

/** Décode les instructions SystemProgram (createAccount / transfer). */
function describeSystemIx(data: Buffer): string {
  const tag = data.readUInt32LE(0);
  if (tag === 0) {
    const lamports = Number(data.readBigUInt64LE(4));
    const space = Number(data.readBigUInt64LE(12));
    return `createAccount lamports=${lamports} space=${space}`;
  }
  if (tag === 2) {
    const lamports = Number(data.readBigUInt64LE(4));
    return `transfer lamports=${lamports}`;
  }
  return `system tag=${tag}`;
}

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
  const indexOf = (pk: PublicKey): number => keys.findIndex((k) => k.equals(pk));

  console.log('--- instructions ---');
  for (const [i, ix] of instructions.entries()) {
    const prog = ix.programId.toBase58();
    const parts: string[] = [];
    for (const meta of ix.keys as AccountMetaLike[]) {
      parts.push(`${indexOf(meta.pubkey)}${meta.isSigner ? 's' : ''}${meta.isWritable ? 'w' : ''}`);
    }
    let detail = '';
    if (prog === SystemProgram.programId.toBase58()) {
      detail = ` :: ${describeSystemIx(Buffer.from(ix.data))}`;
    }
    console.log(`  ix[${i}] program=${prog} keys=[${parts.join(' ')}]${detail}`);
  }

  // Espace des comptes créés par createAccount → rent théorique vs fourni
  console.log('--- createAccount : lamports fournis vs rent-exempt ---');
  for (const ix of instructions) {
    if (ix.programId.equals(SystemProgram.programId) === false) continue;
    const data = Buffer.from(ix.data);
    if (data.readUInt32LE(0) !== 0) continue;
    const lamports = Number(data.readBigUInt64LE(4));
    const space = Number(data.readBigUInt64LE(12));
    const rent = await connection.getMinimumBalanceForRentExemption(space);
    const target = ix.keys[0]?.pubkey.toBase58() ?? '?';
    const verdict = lamports >= rent ? 'OK' : 'SOUS-FINANCÉ';
    console.log(
      `  ${target} space=${space} fourni=${lamports} rent=${rent} → ${verdict}`,
    );
  }

  const sim = await connection.simulateTransaction(tx, undefined, true);
  console.log(`\nsim.err = ${JSON.stringify(sim.value.err)}`);
  const err = sim.value.err as { InsufficientFundsForRent?: { account_index?: number } } | null;
  const idx = err?.InsufficientFundsForRent?.account_index;
  if (idx !== undefined) {
    const pk = keys[idx];
    console.log(`compte faillant : [${idx}] ${pk ? pk.toBase58() : '?'}`);
    console.log('référencé par :');
    for (const [i, ix] of instructions.entries()) {
      const hit = (ix.keys as AccountMetaLike[]).some((m) => indexOf(m.pubkey) === idx);
      if (hit) {
        const detail =
          ix.programId.equals(SystemProgram.programId)
            ? ` :: ${describeSystemIx(Buffer.from(ix.data))}`
            : '';
        console.log(`  ix[${i}] program=${ix.programId.toBase58()}${detail}`);
      }
    }
  }
}

main().catch((error: unknown) => {
  console.error('DEBUG ÉCHEC :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
