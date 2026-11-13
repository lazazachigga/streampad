/**
 * Diagnostic T1 sexies — identifier l'index 2 (compte faillant) dans la tx.
 *
 * debug4 : toutes les instructions réussissent → l'erreur est un contrôle de
 * rent-state post-exécution (compte terminant sous le seuil rent-exempt).
 * On imprime les clés ordonnées de la message avec état avant tx (owner,
 * lamports, dataLen) + le calcul du seuil rent-exempt, pour voir lequel est
 * sous le seuil. Lecture seule.
 */
import { Connection, Keypair, SYSVAR_RENT_PUBKEY, Transaction } from '@solana/web3.js';
import { PUMP_SDK, GLOBAL_PDA } from '@pump-fun/pump-sdk';
import BN from 'bn.js';
import { fund } from './helpers/fund.js';

const RPC = process.env.FORK_RPC ?? 'http://127.0.0.1:8899';

interface RentParams {
  lamportsPerByteYear: number;
  exemptionThreshold: number;
}

/** Décode le sysvar rent (u64 LE lamportsPerByteYear + double LE exemptionThreshold). */
async function getRentParams(connection: Connection): Promise<RentParams> {
  const info = await connection.getAccountInfo(SYSVAR_RENT_PUBKEY);
  if (info === null || info.data.length < 16) throw new Error('sysvar rent absent');
  const view = new DataView(info.data.buffer, info.data.byteOffset, info.data.byteLength);
  return {
    lamportsPerByteYear: Number(view.getBigUint64(0, true)),
    exemptionThreshold: view.getFloat64(8, true),
  };
}

async function main(): Promise<void> {
  const connection = new Connection(RPC, 'confirmed');
  const globalInfo = await connection.getAccountInfo(GLOBAL_PDA);
  if (globalInfo === null) throw new Error('global absent');
  const global = PUMP_SDK.decodeGlobal(globalInfo);

  const rent = await getRentParams(connection);
  console.log(`rent lamportsPerByteYear = ${rent.lamportsPerByteYear} · exemptionThreshold = ${rent.exemptionThreshold}`);

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
  const keys = tx.compileMessage().accountKeys;

  const sim = await connection.simulateTransaction(tx, undefined, true);
  const err = sim.value.err as { InsufficientFundsForRent?: { account_index?: number } } | null;
  const failIdx = err?.InsufficientFundsForRent?.account_index;
  console.log(`sim.err = ${JSON.stringify(sim.value.err)} → account_index = ${failIdx ?? '—'}`);

  // Seuil rent-exempt pour un compte de N octets (formulaire Agave).
  const rentExempt = (dataLen: number): bigint =>
    BigInt(Math.ceil((128 + dataLen) * rent.lamportsPerByteYear * rent.exemptionThreshold));

  console.log('--- clés ordonnées (état avant tx) ---');
  for (const [i, pk] of keys.entries()) {
    const info = await connection.getAccountInfo(pk);
    const role = i === 0 ? 'FEE PAYER' : '';
    if (info === null) {
      console.log(`  [${i}] ${pk.toBase58()} ABSENT (sera créé) ${role}`);
      continue;
    }
    const need = rentExempt(info.data.length);
    const under = BigInt(info.lamports) < need ? ` SOUS SEUIL(${need})` : '';
    const fail = i === failIdx ? '  <=== FAILLANT' : '';
    console.log(
      `  [${i}] ${pk.toBase58()} owner=${info.owner.toBase58()} lamports=${info.lamports} data=${info.data.length}B seuil=${need}${under} ${role}${fail}`,
    );
  }
  console.log(`  total comptes = ${keys.length}`);
}

main().catch((error: unknown) => {
  console.error('DEBUG ÉCHEC :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
