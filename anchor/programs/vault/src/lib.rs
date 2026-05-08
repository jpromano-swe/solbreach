use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

#[cfg(test)]
mod tests;

declare_id!("aVf7hEpHmn7L5ZPBhtu13apZREM7VdwFKzSJ9yNovf2");

use crate::instructions::{level0::*, level1::*, level2::*};
pub use crate::state::{
    BankConfig, Level0State, Level1State, Level2State, UserProfile, UserStats, LEVEL_COUNT,
};

#[program]
pub mod vault {
    use super::*;

    pub fn init_user_stats(ctx: Context<InitUserStats>) -> Result<()> {
        let user_stats = &mut ctx.accounts.user_stats;

        user_stats.player = ctx.accounts.user.key();
        user_stats.completed_levels = [false; LEVEL_COUNT];
        user_stats.bump = ctx.bumps.user_stats;

        Ok(())
    }
    pub fn init_level_0(ctx: Context<InitLevel0>) -> Result<()> {
        instructions::level0::init_level_0(ctx)
    }
    pub fn verify_and_close_level_0(ctx: Context<VerifyAndCloseLevel0>) -> Result<()> {
        instructions::level0::verify_and_close_level_0(ctx)
    }

    pub fn init_global_profile(
        ctx: Context<InitGlobalProfile>,
        initial_commander: Pubkey,
    ) -> Result<()> {
        instructions::level2::init_global_profile(ctx, initial_commander)
    }

    pub fn init_bank(ctx: Context<InitBankConfig>) -> Result<()> {
        instructions::level1::init_bank(ctx)
    }

    pub fn init_level_1(ctx: Context<InitLevel1>) -> Result<()> {
        instructions::level1::init_level_1(ctx)
    }

    pub fn deposit_tokens(ctx: Context<DepositTokens>, amount: u64) -> Result<()> {
        instructions::level1::deposit_tokens(ctx, amount)
    }

    pub fn verify_and_close_level_1(ctx: Context<VerifyAndCloseLevel1>) -> Result<()> {
        instructions::level1::verify_and_close_level_1(ctx)
    }

    pub fn init_level_2(ctx: Context<InitLevel2>) -> Result<()> {
        instructions::level2::init_level_2(ctx)
    }

    pub fn update_profile(ctx: Context<UpdateProfile>) -> Result<()> {
        instructions::level2::update_profile(ctx)
    }

    pub fn verify_and_close_level_2(ctx: Context<VerifyAndCloseLevel2>) -> Result<()> {
        instructions::level2::verify_and_close_level_2(ctx)
    }
}

#[derive(Accounts)]
pub struct InitUserStats<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        space = 8 + UserStats::INIT_SPACE,
        seeds = [b"stats", user.key().as_ref()],
        bump,
    )]
    pub user_stats: Account<'info, UserStats>,

    pub system_program: Program<'info, System>,
}
