use anchor_lang::prelude::*;

use crate::errors::VaultError;
use crate::state::{Level0State, UserStats};

#[derive(Accounts)]
pub struct InitLevel0<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"stats", user.key().as_ref()],
        bump = user_stats.bump,
    )]
    pub user_stats: Account<'info, UserStats>,

    #[account(
        init,
        payer = user,
        space = 8 + Level0State::INIT_SPACE,
        seeds = [b"level_0", user.key().as_ref()],
        bump,
    )]
    pub level_0_state: Account<'info, Level0State>,
    pub system_program: Program<'info, System>,
}

pub fn init_level_0(ctx: Context<InitLevel0>) -> Result<()> {
    let level_0_state = &mut ctx.accounts.level_0_state;

    level_0_state.player = ctx.accounts.user.key();
    level_0_state.bump = ctx.bumps.level_0_state;

    Ok(())
}

#[derive(Accounts)]
pub struct VerifyAndCloseLevel0<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"stats", user.key().as_ref()],
        bump = user_stats.bump,
    )]
    pub user_stats: Account<'info, UserStats>,

    #[account(
        mut,
        close = user,
        seeds = [b"level_0", user.key().as_ref()],
        bump = level_0_state.bump,
    )]
    pub level_0_state: Account<'info, Level0State>,
}

pub fn verify_and_close_level_0(ctx: Context<VerifyAndCloseLevel0>) -> Result<()> {
    let user_stats = &mut ctx.accounts.user_stats;
    let level_0_state = &ctx.accounts.level_0_state;
    let user_key = ctx.accounts.user.key();

    require_keys_eq!(level_0_state.player, user_key, VaultError::InvalidLevelOwner);
    require!(!user_stats.completed_levels[0], VaultError::LevelAlreadyCompleted);

    user_stats.completed_levels[0] = true;

    Ok(())
}