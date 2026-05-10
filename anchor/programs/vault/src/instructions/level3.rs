use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
};
use anchor_spl::token::{Token, TokenAccount, Mint};

use crate::errors::VaultError;
use crate::state::{GuildAuthority, Level3State, UserStats};

#[derive(Accounts)]
pub struct InitGuildAuthority<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + GuildAuthority::INIT_SPACE,
        seeds = [b"guild_authority"],
        bump,
    )]
    pub guild_authority: Account<'info, GuildAuthority>,

    pub reward_mint: Account<'info, Mint>,

    #[account(
        constraint = bounty_vault.owner == guild_authority.key(),
        constraint = bounty_vault.mint == reward_mint.key(),
    )]
    pub bounty_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
}

pub fn init_guild_authority(ctx: Context<InitGuildAuthority>, bounty_amount: u64) -> Result<()> {
    let guild_authority = &mut ctx.accounts.guild_authority;
    guild_authority.reward_mint = ctx.accounts.reward_mint.key();
    guild_authority.bounty_vault = ctx.accounts.bounty_vault.key();
    guild_authority.bounty_amount = bounty_amount;
    guild_authority.bump = ctx.bumps.guild_authority;
    Ok(())
}

#[derive(Accounts)]
pub struct InitLevel3<'info> {
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
        space = 8 + Level3State::INIT_SPACE,
        seeds = [b"level_3", user.key().as_ref()],
        bump,
    )]
    pub level_3_state: Account<'info, Level3State>,

    pub system_program: Program<'info, System>,
}

pub fn init_level_3(ctx: Context<InitLevel3>) -> Result<()> {
    let level_3_state = &mut ctx.accounts.level_3_state;

    level_3_state.player = ctx.accounts.user.key();
    level_3_state.bump = ctx.bumps.level_3_state;

    Ok(())
}

#[derive(Accounts)]
pub struct DelegateTask<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"level_3", user.key().as_ref()],
        bump = level_3_state.bump,
    )]
    pub level_3_state: Account<'info, Level3State>,

    #[account(
        seeds = [b"guild_authority"],
        bump = guild_authority.bump,
    )]
    pub guild_authority: Account<'info, GuildAuthority>,

    #[account(
        mut,
        address = guild_authority.bounty_vault,
    )]
    pub bounty_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_reward_account.owner == user.key(),
        constraint = user_reward_account.mint == guild_authority.reward_mint,
    )]
    pub user_reward_account: Account<'info, TokenAccount>,

    /// CHECK: This is intentionally unchecked for the challenge.
    pub external_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn delegate_task(ctx: Context<DelegateTask>, task_data: Vec<u8>) -> Result<()> {
    let ix = Instruction {
        program_id: ctx.accounts.external_program.key(),
        accounts: vec![
            AccountMeta::new(ctx.accounts.user.key(), true),
            AccountMeta::new(ctx.accounts.bounty_vault.key(), false),
            AccountMeta::new(ctx.accounts.user_reward_account.key(), false),
            AccountMeta::new_readonly(ctx.accounts.guild_authority.key(), true),
            AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
        ],
        data: task_data,
    };

    invoke_signed(
        &ix,
        &[
            ctx.accounts.external_program.to_account_info(),
            ctx.accounts.user.to_account_info(),
            ctx.accounts.bounty_vault.to_account_info(),
            ctx.accounts.user_reward_account.to_account_info(),
            ctx.accounts.guild_authority.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ],
        &[&[b"guild_authority", &[ctx.accounts.guild_authority.bump]]],
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct VerifyAndCloseLevel3<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"stats", user.key().as_ref()],
        bump = user_stats.bump,
    )]
    pub user_stats: Account<'info, UserStats>,

    #[account(
        seeds = [b"guild_authority"],
        bump = guild_authority.bump,
    )]
    pub guild_authority: Account<'info, GuildAuthority>,

    #[account(
        constraint = user_reward_account.owner == user.key(),
        constraint = user_reward_account.mint == guild_authority.reward_mint,
    )]
    pub user_reward_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        close = user,
        seeds = [b"level_3", user.key().as_ref()],
        bump = level_3_state.bump,
    )]
    pub level_3_state: Account<'info, Level3State>,
}

pub fn verify_and_close_level_3(ctx: Context<VerifyAndCloseLevel3>) -> Result<()> {
    let user_key = ctx.accounts.user.key();
    let user_stats = &mut ctx.accounts.user_stats;
    let level_3_state = &ctx.accounts.level_3_state;
    let user_reward_account = &ctx.accounts.user_reward_account;
    let guild_authority = &ctx.accounts.guild_authority;

    require_keys_eq!(level_3_state.player, user_key, VaultError::InvalidLevelOwner);
    require!(!user_stats.completed_levels[3], VaultError::LevelAlreadyCompleted);
    require!(
        user_reward_account.amount >= guild_authority.bounty_amount,
        VaultError::DelegationNotHijacked
    );

    user_stats.completed_levels[3] = true;

    Ok(())
}
