use anchor_lang::prelude::*;

declare_id!("6o7s3X28onCeYAQF2kjqKBLE8eHT5cTCQq1suNc1KFru");

#[program]
pub mod streamer_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, streamer_id_hash: [u8; 32]) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.streamer_id_hash = streamer_id_hash;
        vault.nonce = 0;
        vault.paused = false;
        vault.bump = ctx.bumps.vault;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(streamer_id_hash: [u8; 32])]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 8 + 1 + 1,
        seeds = [b"vault", streamer_id_hash.as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub streamer_id_hash: [u8; 32],
    pub nonce: u64,
    pub paused: bool,
    pub bump: u8,
}
