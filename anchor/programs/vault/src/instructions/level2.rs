use anchor_lang::prelude::*;

use crate::errors::VaultError;
use crate::state::{Level2State, UserProfile, UserStats};

#[derive(Accounts)]
pub struct InitGlobalProfile<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + UserProfile::INIT_SPACE,
        seeds = [b"profile"],
        bump,
    )]
    pub profile: Account<'info, UserProfile>,

    pub system_program: Program<'info, System>,
}

pub fn init_global_profile(
    ctx: Context<InitGlobalProfile>,
    initial_commander: Pubkey,
) -> Result<()> {
    let profile = &mut ctx.accounts.profile;

    profile.commander = initial_commander;
    profile.bump = ctx.bumps.profile;

    Ok(())
}

#[derive(Accounts)]
pub struct InitLevel2<'info> {
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
        space = 8 + Level2State::INIT_SPACE,
        seeds = [b"level_2", user.key().as_ref()],
        bump,
    )]
    pub level_2_state: Account<'info, Level2State>,

    pub system_program: Program<'info, System>,
}

pub fn init_level_2(ctx: Context<InitLevel2>) -> Result<()> {
    let level_2_state = &mut ctx.accounts.level_2_state;

    level_2_state.player = ctx.accounts.user.key();
    level_2_state.bump = ctx.bumps.level_2_state;

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateProfile<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"profile"],
        bump = profile.bump,
    )]
    pub profile: Account<'info, UserProfile>,
}

pub fn update_profile(ctx: Context<UpdateProfile>) -> Result<()> {
    let profile = &mut ctx.accounts.profile;
    profile.commander = ctx.accounts.user.key();
    Ok(())
}

#[derive(Accounts)]
pub struct VerifyAndCloseLevel2<'info> {
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
        seeds = [b"level_2", user.key().as_ref()],
        bump = level_2_state.bump,
    )]
    pub level_2_state: Account<'info, Level2State>,

    #[account(
        seeds = [b"profile"],
        bump = profile.bump,
    )]
    pub profile: Account<'info, UserProfile>,
}

pub fn verify_and_close_level_2(ctx: Context<VerifyAndCloseLevel2>) -> Result<()> {
    let user_stats = &mut ctx.accounts.user_stats;
    let level_2_state = &ctx.accounts.level_2_state;
    let profile = &ctx.accounts.profile;
    let user_key = ctx.accounts.user.key();

    require_keys_eq!(level_2_state.player, user_key, VaultError::InvalidLevelOwner);
    require!(!user_stats.completed_levels[2], VaultError::LevelAlreadyCompleted);
    require_keys_eq!(profile.commander, user_key, VaultError::CommanderNotHijacked);

    user_stats.completed_levels[2] = true;

    Ok(())
}
