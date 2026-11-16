use anchor_lang::prelude::*;

#[program]
pub mod hello {
    use super::*;

    pub fn say_hello(_ctx: Context<Hello>) -> Result<()> {
        msg!("Hello, world!");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Hello {}