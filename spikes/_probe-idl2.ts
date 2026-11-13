import { readFileSync } from 'node:fs';
const pkg = 'C:/Users/azane/Documents/Default Project/launchpad/node_modules/.pnpm/@pump-fun+pump-sdk@4.3.1_bu_789fc0f0116cce2249259a3f84c75a63/node_modules/@pump-fun/pump-sdk/src/idl/pump.json';
const idl = JSON.parse(readFileSync(pkg, 'utf8'));
for (const name of ['migrate', 'migrate_v2']) {
  const ix = idl.instructions.find((i: { name: string }) => i.name === name);
  console.log(`=== ${name} ===`);
  for (const a of ix.accounts) {
    console.log(`  ${a.name}${a.signer ? ' (signer)' : ''}${a.writable ? ' (w)' : ''} ${a.pda ? 'PDA' : ''}`);
  }
}