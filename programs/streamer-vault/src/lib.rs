use anchor_lang::prelude::*;

declare_id!("6o7s3X28onCeYAQF2kjqKBLE8eHT5cTCQq1suNc1KFru");

#[program]
pub mod streamer_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, streamer_id_hash: [u8; 32]) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.streamer_id_hash = streamer_id_hash;
        vault.attestor = ctx.accounts.attestor.key();
        vault.destination = ctx.accounts.destination.key();
        vault.nonce = 0;
        vault.total_claimed = 0;
        vault.paused = false;
        vault.bump = ctx.bumps.vault;
        Ok(())
    }

    pub fn claim(
        ctx: Context<Claim>,
        amount: u64,
        nonce: u64,
        expiry: i64,
        signature: [u8; 64],
        message: Vec<u8>,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(!vault.paused, VaultError::Paused);
        require!(nonce == vault.nonce, VaultError::BadNonce);
        require!(expiry > Clock::get()?.unix_timestamp, VaultError::Expired);

        // Vérification que le message contient les bonnes données (80 bytes)
        require!(message.len() >= 80, VaultError::BadMessage);
        require!(message[..32] == vault.streamer_id_hash, VaultError::BadMessage);

        let dest_bytes = vault.destination.to_bytes();
        require!(message[32..64] == dest_bytes, VaultError::BadMessage);

        let amount_bytes = amount.to_le_bytes();
        require!(message[64..72] == amount_bytes, VaultError::BadMessage);

        let nonce_bytes = nonce.to_le_bytes();
        require!(message[72..80] == nonce_bytes, VaultError::BadMessage);

        // Vérification ed25519 via le programme Ed25519.
        // Le client doit inclure une instruction Ed25519 dans la même transaction.
        // On vérifie que la signature n'est pas nulle (placeholder pour la faisabilité).
        // En production, utiliser la sysvar instructions pour vérifier que l'instruction
        // Ed25519 précédente a bien vérifié la signature de l'attestor sur ce message.
        require!(signature != [0u8; 64], VaultError::BadSignature);

        // Transfert de lamports du vault PDA vers la destination, en conservant
        // le minimum rent-exempt du vault.
        let vault_info = vault.to_account_info();
        let dest_info = ctx.accounts.destination.to_account_info();
        let rent_min = Rent::get()?.minimum_balance(vault_info.data_len());
        let available = vault_info
            .lamports()
            .checked_sub(rent_min)
            .ok_or(VaultError::BadMessage)?;
        require!(amount <= available, VaultError::BadMessage);

        **vault_info.try_borrow_mut_lamports()? -= amount;
        **dest_info.try_borrow_mut_lamports()? += amount;

        vault.total_claimed = vault
            .total_claimed
            .checked_add(amount)
            .ok_or(VaultError::Overflow)?;
        vault.nonce = vault.nonce.checked_add(1).ok_or(VaultError::Overflow)?;
        Ok(())
    }

    pub fn set_paused(ctx: Context<AdminOnly>, paused: bool) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(ctx.accounts.authority.key() == vault.authority, VaultError::Unauthorized);
        vault.paused = paused;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(streamer_id_hash: [u8; 32])]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: attestor pubkey stored for off-chain verification reference
    pub attestor: UncheckedAccount<'info>,
    /// CHECK: destination wallet
    pub destination: UncheckedAccount<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + Vault::SIZE,
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
    /// CHECK: destination wallet must match vault.destination
    #[account(mut, address = vault.destination)]
    pub destination: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub vault: Account<'info, Vault>,
}

#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub streamer_id_hash: [u8; 32],
    pub attestor: Pubkey,
    pub destination: Pubkey,
    pub nonce: u64,
    pub total_claimed: u64,
    pub paused: bool,
    pub bump: u8,
}

impl Vault {
    pub const SIZE: usize = 32 + 32 + 32 + 32 + 8 + 8 + 1 + 1;
}

#[error_code]
pub enum VaultError {
    #[msg("vault is paused")]
    Paused,
    #[msg("bad nonce")]
    BadNonce,
    #[msg("attestation expired")]
    Expired,
    #[msg("bad message")]
    BadMessage,
    #[msg("bad signature")]
    BadSignature,
    #[msg("unauthorized")]
    Unauthorized,
    #[msg("overflow")]
    Overflow,
}
