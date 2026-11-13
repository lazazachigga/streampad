/**
 * Probe T6a — graduation + migration d'un coin sur le fork.
 * Teste : (1) acheter jusqu'à complete, (2) migrateV2Instruction avec
 * withdraw_authority = global.authority (permissionless ?).
 */
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  PUMP_SDK,
  GLOBAL_PDA,
  PUMP_PROGRAM_ID,
  feeSharingConfigPda,
} from '@pump-fun/pump-sdk';
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';
import { fund } from './helpers/fund.js';

const RPC = process.env.FORK_RPC ?? 'http://127.0.0.1:8899';
const TOKEN_2022 = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

async function main(): Promise<void> {
  const connection = new Connection(RPC, 'confirmed');
  const globalInfo = await connection.getAccountInfo(GLOBAL_PDA);
  if (globalInfo === null) throw new Error('fork non prêt');
  const global = PUMP_SDK.decodeGlobal(globalInfo);

  const launcher = Keypair.generate();
  const trader = Keypair.generate();
  await fund(connection, launcher.publicKey, 100 * LAMPORTS_PER_SOL);
  await fund(connection, trader.publicKey, 500 * LAMPORTS_PER_SOL);

  const mint = Keypair.generate();
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      ...(await PUMP_SDK.createV2AndBuyInstructions({
        global,
        mint: mint.publicKey,
        name: 'Grad T6',
        symbol: 'GRAD',
        uri: 'https://example.com/grad.json',
        creator: launcher.publicKey,
        user: launcher.publicKey,
        amount: new BN('1000000000'),
        solAmount: new BN('100000000'),
        mayhemMode: false,
      })),
    ),
    [launcher, mint],
    { commitment: 'confirmed' },
  );

  const curvePda = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.publicKey.toBuffer()],
    PUMP_PROGRAM_ID,
  )[0];

  const readComplete = async (): Promise<boolean> => {
    const info = await connection.getAccountInfo(curvePda);
    if (info === null) return false;
    const c = PUMP_SDK.decodeBondingCurve(info);
    console.log(`  realTokenReserves=${c.realTokenReserves.toString()} complete=${c.complete}`);
    return c.complete === true;
  };

  // Buy until complete
  let complete = await readComplete();
  let buys = 0;
  while (!complete && buys < 50) {
    const curveInfo = await connection.getAccountInfo(curvePda);
    if (curveInfo === null) throw new Error('courbe absente');
    const curve = PUMP_SDK.decodeBondingCurve(curveInfo);
    const ata = (await import('@solana/spl-token')).getAssociatedTokenAddressSync(
      mint.publicKey,
      trader.publicKey,
      true,
      TOKEN_2022,
    );
    const ataInfo = await connection.getAccountInfo(ata);
    // buy a big chunk
    const buyIxs = await PUMP_SDK.buyExactQuoteInV3Instructions({
      bondingCurve: curve,
      associatedUserAccountInfo: ataInfo,
      mint: mint.publicKey,
      user: trader.publicKey,
      amount: new BN('0'), // min tokens out
      quoteAmount: new BN('100000000000'), // 100 SOL
      slippage: 0.5,
      tokenProgram: TOKEN_2022,
      quoteTokenProgram: TOKEN_PROGRAM_ID,
    });
    try {
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(...buyIxs),
        [trader],
        { commitment: 'confirmed' },
      );
      buys += 1;
    } catch (e: unknown) {
      console.log(`  buy #${buys + 1} échoué : ${(e as Error).message?.slice(0, 120)}`);
      buys += 1;
    }
    complete = await readComplete();
  }
  console.log(`graduation: complete=${complete} après ${buys} buys`);

  if (!complete) {
    console.log('PAS GRADUÉ — abandon');
    return;
  }

  // migrate (permissionless ?) — withdraw_authority = global.authority
  const withdrawAuthority = global.authority;
  console.log(`withdrawAuthority = ${withdrawAuthority.toBase58()}`);
  try {
    const migrateIx = await PUMP_SDK.migrateV2Instruction({
      withdrawAuthority,
      mint: mint.publicKey,
      user: trader.publicKey,
      quoteMint: NATIVE_MINT,
      baseTokenProgram: TOKEN_2022,
      quoteTokenProgram: TOKEN_PROGRAM_ID,
    });
    const migSig = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(migrateIx),
      [trader],
      { commitment: 'confirmed' },
    );
    console.log(`migrate OK : ${migSig}`);
  } catch (e: unknown) {
    console.log(`migrate ÉCHEC : ${(e as Error).message?.slice(0, 1000)}`);
  }
}

main().catch((e: unknown) => {
  console.error('PROBE ÉCHEC :', e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
