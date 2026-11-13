import { PublicKey } from '@solana/web3.js';
import * as sdk from '@pump-fun/pump-sdk';

const FEE = new PublicKey('pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ');
const PUMP = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const AMM = new PublicKey('pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA');
const seed = Buffer.from('__event_authority');

function pda(seeds: Buffer[], programId: PublicKey): string {
  return PublicKey.findProgramAddressSync(seeds, programId)[0].toBase58();
}

const want = 'D6QxXDt6hhcCpto4HiZKkN2YQ2iZRF5R7S3caCHpUsML';
const derived = {
  'fee + __event_authority': pda([seed], FEE),
  'pump + __event_authority': pda([seed], PUMP),
  'amm + __event_authority': pda([seed], AMM),
};
console.log('cible =', want);
for (const [k, v] of Object.entries(derived)) {
  console.log(`  ${k.padEnd(28)} ${v}${v === want ? '   <== MATCH' : ''}`);
}
console.log('');
console.log('exports event authority du SDK :');
for (const [k, v] of Object.entries(sdk)) {
  if (v instanceof PublicKey && /event/i.test(k)) console.log('  ' + k.padEnd(34) + v.toBase58());
}
