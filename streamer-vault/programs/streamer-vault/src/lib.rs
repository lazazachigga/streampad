use anchor_lang::prelude::*;

declare_id!("5tBsP8pAGQ1f3bvWpPVSV1paZnYpoLuVJt56UjrfTgYc");

#[program]
pub mod streamer_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
