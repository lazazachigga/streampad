// shared/launch/PumpFunVenue.ts
// Implémentation pump.fun (MVP) derrière LaunchVenue.
// Nécessite une connexion RPC + un keypair launcher financé (fork ou mainnet).

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
import type { DistributeResult, LaunchParams, LaunchResult, LaunchVenue } from './LaunchVenue.js';

export interface PumpFunVenueConfig {
  rpcUrl: string;
  launcherSecret: Uint8Array; // 64 bytes
}

export class PumpFunVenue implements LaunchVenue {
  readonly name = 'pump.fun';
  private readonly connection: Connection;
  private readonly launcher: Keypair;

  constructor(config: PumpFunVenueConfig) {
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.launcher = Keypair.fromSecretKey(config.launcherSecret);
  }

  async launch(params: LaunchParams): Promise<LaunchResult> {
    const globalInfo = await this.connection.getAccountInfo(GLOBAL_PDA);
    if (globalInfo === null) throw new Error('global pump absent (fork non prêt ?)');
    const global = PUMP_SDK.decodeGlobal(globalInfo);

    const mint = Keypair.generate();
    const creator = new PublicKey(params.creator);
    const ixs = await PUMP_SDK.createV2AndBuyInstructions({
      global,
      mint: mint.publicKey,
      name: params.name,
      symbol: params.symbol,
      uri: params.uri,
      creator,
      user: this.launcher.publicKey,
      amount: new BN('1000000000'),
      solAmount: new BN('100000000'),
      mayhemMode: false,
    });
    const sig = await sendAndConfirmTransaction(
      this.connection,
      new Transaction().add(...ixs),
      [this.launcher, mint],
      { commitment: 'confirmed' },
    );
    return { mint: mint.publicKey.toBase58(), signature: sig };
  }

  async setupFeeRecipient(
    mint: string,
    shareholders: Array<{ address: string; shareBps: number }>,
  ): Promise<void> {
    const mintPk = new PublicKey(mint);
    const creator = this.launcher.publicKey;
    const ixs = [
      await PUMP_SDK.createFeeSharingConfig({ creator, mint: mintPk, pool: null }),
      await PUMP_SDK.updateFeeSharesV2({
        authority: creator,
        mint: mintPk,
        currentShareholders: [creator],
        newShareholders: shareholders.map((s) => ({
          address: new PublicKey(s.address),
          shareBps: s.shareBps,
        })),
        quoteMint: NATIVE_MINT,
        quoteTokenProgram: TOKEN_PROGRAM_ID,
        bondingCurveComplete: false,
      }),
    ];
    await sendAndConfirmTransaction(
      this.connection,
      new Transaction().add(...ixs),
      [this.launcher],
      { commitment: 'confirmed' },
    );
  }

  async getAccruedFees(mint: string): Promise<bigint> {
    const scPda = feeSharingConfigPda(new PublicKey(mint));
    const vaultPda = PublicKey.findProgramAddressSync(
      [Buffer.from('creator-vault'), scPda.toBuffer()],
      PUMP_PROGRAM_ID,
    )[0];
    const bal = await this.connection.getBalance(vaultPda);
    return BigInt(bal);
  }

  async distribute(mint: string): Promise<DistributeResult> {
    const mintPk = new PublicKey(mint);
    const scPda = feeSharingConfigPda(mintPk);
    const scInfo = await this.connection.getAccountInfo(scPda);
    if (scInfo === null) throw new Error('sharing_config absent');
    const sharingConfig = PUMP_SDK.decodeSharingConfig(scInfo);

    // Seuil constaté en T4/T5 : 4 454 400 lamports.
    const MIN_VAULT = 4_454_400;
    let vaultBal = await this.connection.getBalance(
      PublicKey.findProgramAddressSync(
        [Buffer.from('creator-vault'), scPda.toBuffer()],
        PUMP_PROGRAM_ID,
      )[0],
    );
    // Achats jusqu'au seuil (simplifié : 1 buy de 2 SOL).
    if (vaultBal < MIN_VAULT) {
      const curvePda = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding-curve'), mintPk.toBuffer()],
        PUMP_PROGRAM_ID,
      )[0];
      const curveInfo = await this.connection.getAccountInfo(curvePda);
      if (curveInfo !== null) {
        const curve = PUMP_SDK.decodeBondingCurve(curveInfo);
        const buyIxs = await PUMP_SDK.buyInstructions({
          global: PUMP_SDK.decodeGlobal(await this.connection.getAccountInfo(GLOBAL_PDA).then((x) => {
            if (x === null) throw new Error('global absent');
            return x;
          })),
          bondingCurveAccountInfo: curveInfo,
          bondingCurve: curve,
          associatedUserAccountInfo: null,
          mint: mintPk,
          user: this.launcher.publicKey,
          amount: new BN('1000000000'),
          solAmount: new BN('2000000000'),
          slippage: 0.5,
          tokenProgram: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
        });
        await sendAndConfirmTransaction(
          this.connection,
          new Transaction().add(...buyIxs),
          [this.launcher],
          { commitment: 'confirmed' },
        );
      }
    }

    const sweepIx = await PUMP_SDK.sweepCreatorFeeInstruction({
      payer: this.launcher.publicKey,
      mint: mintPk,
      creator: scPda,
      quoteMint: NATIVE_MINT,
      quoteTokenProgram: TOKEN_PROGRAM_ID,
    });
    const distIx = await PUMP_SDK.distributeCreatorFeesV2({
      mint: mintPk,
      sharingConfig,
      sharingConfigAddress: scPda,
      quoteMint: NATIVE_MINT,
      payer: this.launcher.publicKey,
      shouldInitializeAta: false,
      quoteTokenProgram: TOKEN_PROGRAM_ID,
    });
    const sig = await sendAndConfirmTransaction(
      this.connection,
      new Transaction().add(sweepIx, distIx),
      [this.launcher],
      { commitment: 'confirmed' },
    );
    return { signature: sig, amount: BigInt(0) };
  }
}


