// Utilitaire de diagnostic : mappe chaque PDA listé par fork-args.ts vers son nom d'export SDK.
// Exécution : node --import tsx scripts/_pda-map.ts
import { PublicKey } from '@solana/web3.js';
import * as sdk from '@pump-fun/pump-sdk';

const TARGET = 'D6QxXDt6hhcCpto4HiZKkN2YQ2iZRF5R7S3caCHpUsML';

const exports_ = Object.entries(sdk).filter(
  (entry): entry is [string, PublicKey] => entry[1] instanceof PublicKey,
);

const owner = exports_.filter(([, key]) => key.toBase58() === TARGET).map(([name]) => name);
console.log(`${TARGET} = ${owner.length > 0 ? owner.join(', ') : 'PAS un export PublicKey du SDK'}`);

console.log('');
console.log('PDAs utilisés par fork-args.ts :');
const names = [
  'GLOBAL_PDA',
  'PUMP_EVENT_AUTHORITY_PDA',
  'GLOBAL_VOLUME_ACCUMULATOR_PDA',
  'PUMP_FEE_CONFIG_PDA',
  'PUMP_FEE_EVENT_AUTHORITY_PDA',
  'FEE_PROGRAM_GLOBAL_PDA',
  'MAYHEM_PROGRAM_ID',
  'PUMP_PROGRAM_ID',
  'PUMP_FEE_PROGRAM_ID',
  'PUMP_AMM_PROGRAM_ID',
];
for (const name of names) {
  const value = (sdk as Record<string, unknown>)[name];
  const base58 = value instanceof PublicKey ? value.toBase58() : String(value);
  const flag = base58 === TARGET ? '   <== cible' : '';
  console.log(`  ${name.padEnd(32)} ${base58}${flag}`);
}
