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
        vault.total_claimed = 0;
        vault.paused = false;
        vault.bump = ctx.bumps.vault;
        Ok(())
    }

    pub fn claim(ctx: Context<Claim>, amount: u64, nonce: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(!vault.paused, VaultError::Paused);
        require!(nonce == vault.nonce, VaultError::BadNonce);

        let vault_info = vault.to_account_info();
        let dest_info = ctx.accounts.destination.to_account_info();

        **vault_info.try_borrow_mut_lamports()? -= amount;
        **dest_info.try_borrow_mut_lamports()? += amount;

        vault.total_claimed = vault.total_claimed.checked_add(amount).unwrap();
        vault.nonce = vault.nonce.checked_add(1).unwrap();
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

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
}

#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub streamer_id_hash: [u8; 32],
    pub nonce: u64,
    pub total_claimed: u64,
    pub paused: bool,
    pub bump: u8,
}

impl Vault {
    pub const SIZE: usize = 32 + 32 + 8 + 8 + 1 + 1;
}

#[error_code]
pub enum VaultError {
    #[msg("vault is paused")]
    Paused,
    #[msg("bad nonce")]
    BadNonce,
    #[msg("overflow")]
    Overflow,
}
