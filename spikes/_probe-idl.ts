import { readFileSync } from 'node:fs';
const pkg = 'C:/Users/azane/Documents/Default Project/launchpad/node_modules/.pnpm/@pump-fun+pump-sdk@4.3.1_bu_789fc0f0116cce2249259a3f84c75a63/node_modules/@pump-fun/pump-sdk/src/idl/pump.json';
const idl = JSON.parse(readFileSync(pkg, 'utf8'));
const ix = idl.instructions.find((i: { name: string }) => i.name === 'migrate_v2');
console.log(JSON.stringify(ix.accounts, null, 2));
console.log('--- withdraw_authority pda? ---');
// find pda seeds in idl accounts
for (const a of ix.accounts) {
  if (a.name.includes('withdraw') || a.pda) console.log(a.name, JSON.stringify(a.pda));
}