/**
 * Financement des comptes du fork local.
 *
 * Pourquoi : `requestAirdrop` est cassé sur Windows avec Agave 2.3.0 — le RPC tente de joindre
 * la faucet sur `0.0.0.0:9900` et échoue (OS error 10049 AddrNotAvailable ; sur Linux
 * `connect(0.0.0.0)` est accepté). Aucun flag CLI ne corrige l'adresse : le test-validator
 * publie `faucet_addr: Some(0.0.0.0:9900)` en dur (constaté dans la sortie de `--help` et le log
 * `rpc configuration`). Voir DECISIONS.md D9.
 *
 * Contournement : solana-test-validator écrit `faucet-keypair.json` dans le ledger ; ce compte
 * reçoit `--faucet-sol` (1 000 000 SOL par défaut) à la genèse. On signe donc un simple
 * SystemProgram.transfer depuis cette clé. Clé locale de fork uniquement : jamais affichée,
 * jamais committée (`.fork-ledger/` est gitignoré).
 *
 * Usage : `await fund(connection, destination, 100 * LAMPORTS_PER_SOL);`
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Répertoire du ledger fork (même valeur que FORK_LEDGER dans scripts/start-fork.sh). */
export function forkLedgerDir(): string {
  const configured = process.env.FORK_LEDGER;
  return configured === undefined ? join(PROJECT_ROOT, '.fork-ledger') : resolve(configured);
}

/**
 * Charge la clé de la faucet du fork.
 * @throws si le ledger n'existe pas (le fork n'a pas été lancé) ou si le fichier est illisible.
 */
export function faucetKeypair(): Keypair {
  const path = join(forkLedgerDir(), 'faucet-keypair.json');
  if (!existsSync(path)) {
    throw new Error(
      `Faucet introuvable : ${path}. Lancez d'abord scripts/start-fork.sh (le fork crée le ledger).`,
    );
  }
  const raw = readFileSync(path, 'utf8');
  const secret: unknown = JSON.parse(raw);
  if (!Array.isArray(secret) || secret.length !== 64 || secret.some((b) => typeof b !== 'number')) {
    throw new Error('Format de clé faucet invalide (attendu : tableau de 64 nombres).');
  }
  return Keypair.fromSecretKey(Uint8Array.from(secret as number[]));
}

/**
 * Transfère `lamports` depuis la faucet du fork vers `destination`.
 * @returns la signature de la transaction
 */
export async function fund(
  connection: Connection,
  destination: PublicKey,
  lamports: number,
): Promise<string> {
  if (!Number.isSafeInteger(lamports) || lamports <= 0) {
    throw new Error(`Montant invalide : ${lamports}`);
  }
  const faucet = faucetKeypair();
  const balance = await connection.getBalance(faucet.publicKey);
  if (balance < lamports) {
    throw new Error(
      `Faucet insuffisant : ${balance} lamports disponibles pour ${lamports} demandés.`,
    );
  }
  const transaction = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: faucet.publicKey, toPubkey: destination, lamports }),
  );
  return sendAndConfirmTransaction(connection, transaction, [faucet], {
    commitment: 'confirmed',
  });
}

/** Solde d'un compte, en lamports. */
export async function balanceOf(connection: Connection, account: PublicKey): Promise<number> {
  return connection.getBalance(account);
}

/** Affiche un montant en SOL (journal, pas un secret). */
export function formatSol(lamports: number): string {
  return `${(lamports / LAMPORTS_PER_SOL).toFixed(6)} SOL`;
}
