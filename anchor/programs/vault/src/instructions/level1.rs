use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::VaultError;
use crate::state::{BankConfig, Level1State, UserStats};

#[derive(Accounts)]
pub struct InitBankConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + BankConfig::INIT_SPACE,
        seeds = [b"bank"],
        bump,
    )]
    pub bank: Account<'info, BankConfig>,

    pub expected_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}

pub fn init_bank(ctx: Context<InitBankConfig>) -> Result<()> {
    let bank = &mut ctx.accounts.bank;

    bank.expected_mint = ctx.accounts.expected_mint.key();
    bank.bump = ctx.bumps.bank;

    Ok(())
}

#[derive(Accounts)]
pub struct InitLevel1<'info> {
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
        space = 8 + Level1State::INIT_SPACE,
        seeds = [b"level_1", user.key().as_ref()],
        bump,
    )]
    pub level_1_state: Account<'info, Level1State>,

    pub system_program: Program<'info, System>,
}

pub fn init_level_1(ctx: Context<InitLevel1>) -> Result<()> {
    let level_1_state = &mut ctx.accounts.level_1_state;

    level_1_state.player = ctx.accounts.user.key();
    level_1_state.deposited_amount = 0;
    level_1_state.bump = ctx.bumps.level_1_state;

    Ok(())
}

#[derive(Accounts)]
pub struct DepositTokens<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [b"bank"],
        bump = bank.bump,
    )]
    pub bank: Account<'info, BankConfig>,

    #[account(
        mut,
        seeds = [b"level_1", user.key().as_ref()],
        bump = level_1_state.bump,
    )]
    pub level_1_state: Account<'info, Level1State>,

    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn deposit_tokens(ctx: Context<DepositTokens>, amount: u64) -> Result<()> {
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    )?;

    let level_1_state = &mut ctx.accounts.level_1_state;
    level_1_state.deposited_amount = level_1_state.deposited_amount.saturating_add(amount);

    Ok(())
}

#[derive(Accounts)]
pub struct VerifyAndCloseLevel1<'info> {
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
        seeds = [b"level_1", user.key().as_ref()],
        bump = level_1_state.bump,
    )]
    pub level_1_state: Account<'info, Level1State>,
}

pub fn verify_and_close_level_1(ctx: Context<VerifyAndCloseLevel1>) -> Result<()> {
    let user_stats = &mut ctx.accounts.user_stats;
    let level_1_state = &ctx.accounts.level_1_state;
    let user_key = ctx.accounts.user.key();

    require_keys_eq!(level_1_state.player, user_key, VaultError::InvalidLevelOwner);
    require!(!user_stats.completed_levels[1], VaultError::LevelAlreadyCompleted);
    require!(
        level_1_state.deposited_amount >= 1_000_000,
        VaultError::DepositGoalNotReached
    );

    user_stats.completed_levels[1] = true;

    Ok(())
}
