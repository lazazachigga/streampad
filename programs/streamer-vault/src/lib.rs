use anchor_lang::prelude::*;

declare_id!("6o7s3X28onCeYAQF2kjqKBLE8eHT5cTCQq1suNc1KFru");

#[program]
pub mod streamer_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Vault {
    pub authority: Pubkey,
}