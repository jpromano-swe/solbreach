use anchor_lang::prelude::*;

#[cfg(test)]
mod tests;

declare_id!("aVf7hEpHmn7L5ZPBhtu13apZREM7VdwFKzSJ9yNovf2");

pub const LEVEL_COUNT: usize = 4;

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
