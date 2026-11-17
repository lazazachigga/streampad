use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions as instructions_sysvar;
use anchor_lang::solana_program::clock::Clock;

declare_id!("2JuuYqXM6PdBBRPmyw5vU5z1sZtDKWztDg319V71LYTL");

// Ed25519 program ID
const ED25519_PROGRAM_ID: Pubkey = solana_program::pubkey!("Ed25519SigVerify111111111111111111111111111");

#[program]
pub mod streamer_vault {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        streamer_id_hash: [u8; 32],
        attestor: Pubkey,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.streamer_id_hash = streamer_id_hash;
        vault.attestor = attestor;
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
        message: [u8; 80],
        signature: [u8; 64],
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;

        // 1. Vault not paused
        require!(!vault.paused, VaultError::Paused);

        // 2. Nonce must match
        require!(nonce == vault.nonce, VaultError::BadNonce);

        // 3. Check expiry
        let clock = Clock::get()?;
        require!(clock.unix_timestamp < expiry, VaultError::Expired);

        // 4. Destination must match vault.destination
        require!(
            ctx.accounts.destination.key() == vault.destination,
            VaultError::BadDestination
        );

        // 5. Verify message matches expected (streamer_id_hash + destination + amount + nonce)
        let mut expected_message = [0u8; 80];
        expected_message[0..32].copy_from_slice(&vault.streamer_id_hash);
        expected_message[32..64].copy_from_slice(&ctx.accounts.destination.key().to_bytes());
        expected_message[64..72].copy_from_slice(&amount.to_le_bytes());
        expected_message[72..80].copy_from_slice(&nonce.to_le_bytes());
        require!(message == expected_message, VaultError::BadMessage);

        // 6. Verify ed25519 signature via Ed25519 program (sysvar instructions)
        verify_ed25519_signature(
            &ctx.accounts.instructions,
            &vault.attestor,
            &message,
            &signature,
        )?;

        // 7. Transfer lamports
        let vault_info = vault.to_account_info();
        let dest_info = ctx.accounts.destination.to_account_info();

        **vault_info.try_borrow_mut_lamports()? = vault_info
            .lamports()
            .checked_sub(amount)
            .ok_or(VaultError::Overflow)?;
        **dest_info.try_borrow_mut_lamports()? = dest_info
            .lamports()
            .checked_add(amount)
            .ok_or(VaultError::Overflow)?;

        // 8. Update state
        vault.total_claimed = vault
            .total_claimed
            .checked_add(amount)
            .ok_or(VaultError::Overflow)?;
        vault.nonce = vault.nonce.checked_add(1).ok_or(VaultError::Overflow)?;

        Ok(())
    }

    pub fn set_paused(ctx: Context<AdminOnly>, paused: bool) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(
            ctx.accounts.authority.key() == vault.authority,
            VaultError::Unauthorized
        );
        vault.paused = paused;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(streamer_id_hash: [u8; 32], attestor: Pubkey)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
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
    /// CHECK: instructions sysvar for ed25519 verification
    #[account(address = instructions_sysvar::ID)]
    pub instructions: UncheckedAccount<'info>,
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
    #[msg("bad destination")]
    BadDestination,
    #[msg("bad message")]
    BadMessage,
    #[msg("bad signature")]
    BadSignature,
    #[msg("unauthorized")]
    Unauthorized,
    #[msg("overflow")]
    Overflow,
    #[msg("ed25519 verification not found")]
    Ed25519NotFound,
    #[msg("ed25519 verification failed")]
    Ed25519Failed,
}

// Verify that an Ed25519 program instruction exists in the same transaction
// and matches the expected pubkey/message/signature.
fn verify_ed25519_signature(
    instructions: &UncheckedAccount,
    expected_pubkey: &Pubkey,
    expected_message: &[u8; 80],
    expected_signature: &[u8; 64],
) -> Result<()> {
    let ix_sysvar = instructions.to_account_info();
    let current_ix_index = instructions_sysvar::load_current_index_checked(&ix_sysvar)
        .map_err(|_| VaultError::Ed25519NotFound)?;

    // Look through all instructions in this transaction for an Ed25519 verification
    let mut found = false;
    let mut i = 0;
    while i < current_ix_index {
        if let Ok(ix) = instructions_sysvar::load_instruction_at_checked(i as usize, &ix_sysvar) {
            if ix.program_id == ED25519_PROGRAM_ID {
                // Parse the Ed25519 instruction data
                // Format: num_sigs(1) + padding(1) + offsets...
                if ix.data.len() >= 16 {
                    let num_sigs = ix.data[0];
                    if num_sigs == 1 {
                        // Parse offsets (little-endian u16)
                        let sig_offset = u16::from_le_bytes([ix.data[2], ix.data[3]]) as usize;
                        let sig_ix_index = u16::from_le_bytes([ix.data[4], ix.data[5]]);
                        let pubkey_offset = u16::from_le_bytes([ix.data[6], ix.data[7]]) as usize;
                        let pubkey_ix_index = u16::from_le_bytes([ix.data[8], ix.data[9]]);
                        let msg_offset = u16::from_le_bytes([ix.data[10], ix.data[11]]) as usize;
                        let msg_size = u16::from_le_bytes([ix.data[12], ix.data[13]]) as usize;
                        let msg_ix_index = u16::from_le_bytes([ix.data[14], ix.data[15]]);

                        // All data must be in the same instruction (index 0xFFFF = same ix)
                        if sig_ix_index == 0xFFFF
                            && pubkey_ix_index == 0xFFFF
                            && msg_ix_index == 0xFFFF
                            && msg_size == 80
                        {
                            // Verify signature matches
                            if sig_offset + 64 <= ix.data.len()
                                && pubkey_offset + 32 <= ix.data.len()
                                && msg_offset + 80 <= ix.data.len()
                            {
                                let sig = &ix.data[sig_offset..sig_offset + 64];
                                let pubkey = &ix.data[pubkey_offset..pubkey_offset + 32];
                                let msg = &ix.data[msg_offset..msg_offset + 80];

                                if sig == expected_signature
                                    && pubkey == expected_pubkey.as_ref()
                                    && msg == expected_message
                                {
                                    found = true;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        i += 1;
    }

    require!(found, VaultError::Ed25519NotFound);
    Ok(())
}
