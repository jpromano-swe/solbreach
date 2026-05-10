use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("EYUQDYesXVQon3tfQavDu5gErk4oGnNmVXnQHDnCHzzv");

#[program]
pub mod mercenary {
    use super::*;

    pub fn follow_orders(ctx: Context<FollowOrders>, amount: u64) -> Result<()> {
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.bounty_vault.to_account_info(),
                    to: ctx.accounts.user_reward_account.to_account_info(),
                    authority: ctx.accounts.guild_authority.to_account_info(),
                },
            ),
            amount,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct FollowOrders<'info> {
    pub user: Signer<'info>,

    #[account(mut)]
    pub bounty_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_reward_account: Account<'info, TokenAccount>,

    pub guild_authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}
