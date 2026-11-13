/**
 * Diagnostic T1 quater — nommer le compte faillant avec l'IDL embarqué DU SDK.
 *
 * Pourquoi : l'IDL vendor/pump-public-docs est plus ancien que l'IDL embarqué dans
 * @pump-fun/pump-sdk → le mapping des positions ne colle pas (ex. create_v2 position 8).
 * Ce script charge `src/idl/pump.json` du paquet SDK, apparie chaque instruction construite
 * à sa définition IDL (programme + nombre de comptes + flags signer/writable), puis
 * nomme chaque compte du message. Simule ensuite et répète 3 fois (clés neuves) pour
 * vérifier que c'est TOUJOURS le même rôle qui échoue.
 * Lecture seule : simulation uniquement, rien n'est envoyé.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { PUMP_SDK, GLOBAL_PDA, PUMP_PROGRAM_ID } from '@pump-fun/pump-sdk';
import BN from 'bn.js';
import { fund } from './helpers/fund.js';

const RPC = process.env.FORK_RPC ?? 'http://127.0.0.1:8899';
const MAINNET_RPC = 'https://solana-rpc.publicnode.com';
const RUNS = 3;

interface IxAccountDef {
  name: string;
  writable?: boolean;
  signer?: boolean;
}

interface IxDef {
  name: string;
  accounts: IxAccountDef[];
}

interface Idl {
  instructions: IxDef[];
}

interface AccountMetaLike {
  pubkey: PublicKey;
  isSigner: boolean;
  isWritable: boolean;
}

function loadSdkIdl(): Idl {
  const require = createRequire(import.meta.url);
  const sdkDir = dirname(require.resolve('@pump-fun/pump-sdk'));
  const idlPath = join(sdkDir, '..', 'src', 'idl', 'pump.json');
  return JSON.parse(readFileSync(idlPath, 'utf8')) as Idl;
}

/** Apparie une instruction construite à sa définition IDL (mêmes flags, même taille). */
function matchIxDef(idl: Idl, programId: PublicKey, keys: AccountMetaLike[]): IxDef | null {
  if (!programId.equals(PUMP_PROGRAM_ID)) return null;
  const candidates = idl.instructions.filter((def) => def.accounts.length === keys.length);
  const hit = candidates.find((def) =>
    def.accounts.every(
      (acc, i) =>
        (acc.writable ?? false) === (keys[i]?.isWritable ?? false) &&
        (acc.signer ?? false) === (keys[i]?.isSigner ?? false),
    ),
  );
  return hit ?? null;
}

async function oneRun(idl: Idl, mainnet: Connection): Promise<string> {
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

  // Noms des comptes : premier nom gagne ; conflit signalé
  const names = new Map<number, string>();
  const conflicts: string[] = [];
  console.log('--- instructions (IDL SDK) ---');
  for (const [i, ix] of instructions.entries()) {
    const metas = ix.keys as AccountMetaLike[];
    const def = matchIxDef(idl, ix.programId, metas);
    const label = def?.name ?? `INCONNU (${metas.length} comptes)`;
    console.log(`  ix[${i}] ${label}`);
    if (def === null) continue;
    metas.forEach((m, j) => {
      const idx = keys.findIndex((k) => k.equals(m.pubkey));
      const existing = names.get(idx);
      const nm = `${label}.${def.accounts[j]?.name ?? '?'}`;
      if (existing !== undefined && existing !== nm) conflicts.push(`[${idx}] ${existing} vs ${nm}`);
      else names.set(idx, nm);
    });
  }
  if (conflicts.length > 0) console.log(`  CONFLITS DE NOMS : ${conflicts.join(' | ')}`);

  const sim = await connection.simulateTransaction(tx, undefined, true);
  const err = sim.value.err as { InsufficientFundsForRent?: { account_index?: number } } | null;
  const idx = err?.InsufficientFundsForRent?.account_index;
  if (idx === undefined) {
    console.log(`  sim.err = ${JSON.stringify(sim.value.err)} (pas d'erreur rent)`);
    return 'PAS_ERREUR_RENT';
  }
  const pk = keys[idx];
  if (pk === undefined) return 'INDEX_HORS_LIMITES';
  const name = names.get(idx) ?? 'NON NOMMÉ';

  // État local + existence mainnet du compte faillant
  const local = await connection.getAccountInfo(pk);
  const onMainnet = await mainnet.getAccountInfo(pk);
  const state =
    local === null
      ? 'ABSENT local'
      : `présent local lamports=${local.lamports} data=${local.data.length}`;
  const mainnetState =
    onMainnet === null
      ? 'ABSENT mainnet'
    : `présent mainnet lamports=${onMainnet.lamports} data=${onMainnet.data.length} owner=${onMainnet.owner.toBase58()}`;
  console.log(`  ÉCHEC rent : [${idx}] ${name} ${pk.toBase58()}`);
  console.log(`    ${state} · ${mainnetState}`);
  return name;
}

async function main(): Promise<void> {
  const idl = loadSdkIdl();
  const mainnet = new Connection(MAINNET_RPC, 'confirmed');
  const results: string[] = [];
  for (let run = 1; run <= RUNS; run++) {
    console.log(`=== run ${run}/${RUNS} ===`);
    results.push(await oneRun(idl, mainnet));
  }
  console.log(`\n=== SYNTHÈSE ===\n  ${results.join('\n  ')}`);
}

main().catch((error: unknown) => {
  console.error('DEBUG ÉCHEC :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
