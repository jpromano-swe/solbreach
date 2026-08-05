import type { LevelGuideContent } from "../../components/level-workspace";
import type { LevelId } from "./course-status";

const PLAYGROUND_REPOSITORY =
  "git clone https://github.com/jpromano-swe/solbreach-playground";
export const LEVEL_GUIDES: Record<LevelId, LevelGuideContent> = {
  level0: {
    cloneCommand: `${PLAYGROUND_REPOSITORY} && cd solbreach-playground/levels/00-hello-solbreach`,
    codeSnippet: `#[derive(Accounts)]
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
}

pub fn verify_and_close_level_0(ctx: Context<VerifyAndCloseLevel0>) -> Result<()> {
    let user_stats = &mut ctx.accounts.user_stats;
    user_stats.completed_levels[0] = true;
    Ok(())
}`,
    vulnerabilityActiveLabel: "Hide Review Notes",
    vulnerabilityLabel: "Review Focus",
    vulnerabilityNote:
      "Level 0 is intentionally safe. The key pattern is the wallet-bound PDA derivation and the completion write that unlocks the exploit levels.",
    vulnerabilityTone: "cyan",
    vulnerableLines: [8, 17, 25],
    hints: [
      "Program Derived Addresses (PDAs) are deterministic.",
      "Completion requires temporary account cleanup.",
      "The verifier closes the temporary Level PDA automatically.",
    ],
    lore: [
      "Learn how SolBreach tracks player progress using PDAs and temporary protocol state.",
      "Create a temporary Level PDA, then close it correctly to complete the warmup.",
    ],
    missionTitle: "Level 0: Hello SolBreach",
    subtitle: "Wallet Handshake & PDA Closeout Warmup",
    title: "Hello SolBreach",
    winCondition:
      "Set completed_levels[0] = true and close the temporary Level 0 PDA.",
  },
  level1: {
    cloneCommand: `${PLAYGROUND_REPOSITORY} && cd solbreach-playground/levels/01-illusionist`,
    codeSnippet: `#[derive(Accounts)]
pub struct DepositTokens<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

pub fn deposit(ctx: Context<DepositTokens>, amount: u64) -> Result<()> {
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    )?;

    msg!("Successfully deposited {} tokens!", amount);
    Ok(())
}`,
    vulnerabilityNote:
      "Missing mint constraint: the vault token account is never tied to the expected mint.",
    vulnerableLines: [6, 7],
    hints: [
      "Not all SPL tokens are created equal.",
      "Who determines the mint address of a TokenAccount?",
      "Anchor is smart, but it can't read your mind if you don't constrain your thoughts.",
    ],
    lore: [
      "Welcome to the Grand Sol Bank. The vault claims to be highly secure, only accepting deposits of the realm's most precious stablecoin. The guards check if you have a bag of coins, but are they checking what's inside the bag?",
      "Your objective is to trick the bank into crediting your internal ledger with 1,000,000 tokens without spending a single real dime.",
    ],
    missionTitle: "Level 1: The Illusionist",
    subtitle: "Account substitution and forged ledger credit",
    title: "The Illusionist",
    winCondition:
      "Push deposited_amount to 1,000,000 using fake token accounts, then verify and close the level.",
  },
  level2: {
    cloneCommand: `${PLAYGROUND_REPOSITORY} && cd solbreach-playground/levels/02-identity-thief`,
    codeSnippet: `#[derive(Accounts)]
pub struct UpdateProfile<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"profile"], 
        bump
    )]
    pub profile: Account<'info, UserProfile>,
}

#[account]
pub struct UserProfile {
    pub commander: Pubkey,
}

pub fn update_profile(ctx: Context<UpdateProfile>) -> Result<()> {
    let profile = &mut ctx.accounts.profile;
    profile.commander = ctx.accounts.user.key();
    Ok(())
}`,
    vulnerabilityNote:
      "Static PDA seed: every user writes to the same global profile instead of a wallet-bound PDA.",
    vulnerableLines: [8],
    hints: [
      "Program Derived Addresses are like deterministic lockers.",
      "What happens if a locker doesn't include the owner's name on it?",
      "Validating a bump doesn't mean you are validating the user.",
    ],
    lore: [
      "The Citadel issues a unique, immutable ledger to every citizen to store their personal records. Or so they thought. It seems the architect used a single blueprint for everyone's safe, and left the master key in the door.",
      'The system has currently registered a "Commander". Your objective is to overwrite the Citadel\'s registry and declare yourself the new Commander.',
    ],
    missionTitle: "Level 2: The Identity Thief",
    subtitle: "Static PDA authority bypass",
    title: "Identity Thief",
    winCondition:
      "Overwrite the global commander with your wallet, then verify and close the level instance.",
  },
  level3: {
    cloneCommand: `${PLAYGROUND_REPOSITORY} && cd solbreach-playground/levels/03-trojan-horse`,
    codeSnippet: `#[derive(Accounts)]
pub struct DelegateTask<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub external_program: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn delegate(ctx: Context<DelegateTask>, task_data: Vec<u8>) -> Result<()> {
    let ix = Instruction {
        program_id: *ctx.accounts.external_program.key,
        accounts: vec![AccountMeta::new(ctx.accounts.user.key(), true)],
        data: task_data,
    };

    solana_program::program::invoke(
        &ix,
        &[
            ctx.accounts.external_program.to_account_info(),
            ctx.accounts.user.to_account_info(),
        ],
    )?;
    
    Ok(())
}`,
    vulnerabilityNote:
      "Unchecked CPI target: the external program can be attacker-controlled because its program ID is not constrained.",
    vulnerableLines: [6],
    hints: [
      "Cross-Program Invocations (CPIs) are powerful, but who are you really calling?",
      "UncheckedAccount is exactly what it sounds like. It turns off Anchor's safety nets.",
      "Sometimes, the only way to beat a contract is to deploy your own contract to fight it.",
    ],
    lore: [
      "The Guild frequently outsources its heavy lifting to external mercenaries. They trust the uniforms of the mercenaries, but they rarely ask for identification.",
      "Your objective is to hijack the delegation process and force the Guild to execute your own malicious orders.",
    ],
    missionTitle: "Level 3: The Trojan Horse",
    subtitle: "Arbitrary CPI and delegated signer abuse",
    title: "The Trojan Horse",
    winCondition:
      "Drain the guild bounty through arbitrary CPI, then verify and close the per-player level PDA.",
  },
  level4: {
    cloneCommand: `${PLAYGROUND_REPOSITORY} && cd solbreach-playground/levels/04-data-matching`,
    codeSnippet: `#[derive(Accounts)]
pub struct RouteCollateral<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    pub market: Account<'info, Market>,

    #[account(mut)]
    pub position: Account<'info, Position>,

    #[account(mut)]
    pub collateral_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_collateral: Account<'info, TokenAccount>,
}

pub fn route_collateral(ctx: Context<RouteCollateral>, amount: u64) -> Result<()> {
    require_keys_eq!(ctx.accounts.position.owner, ctx.accounts.user.key());

    ctx.accounts.position.collateral += amount;
    ctx.accounts.collateral_vault.amount += amount;
    Ok(())
}`,
    vulnerabilityNote:
      "Data matching gap: the program validates individual accounts but never proves the market, position, vault, and collateral mint belong together.",
    vulnerableLines: [6, 9, 12, 15, 19, 20],
    hints: [
      "Matching account types is not the same as matching account relationships.",
      "A position owner check is incomplete if the market and vault identities are not also checked.",
      "Data matching failures often hide behind valid-looking accounts with incompatible stored fields.",
    ],
    lore: [
      "A collateral router accepts a market, position, vault, and user token account. Each account is valid on its own, but the protocol never proves they describe the same market.",
      "Your objective is to prove whether mismatched protocol data can be combined into a valid-looking collateral update.",
    ],
    missionTitle: "Level 4: The Mirror Trap",
    subtitle: "Cross-account data relationship validation",
    title: "The Mirror Trap",
    winCondition:
      "Map the mismatched account relationship, reproduce the unsafe collateral route, and identify the missing data checks.",
  },
  level5: {
    cloneCommand: `${PLAYGROUND_REPOSITORY} && cd solbreach-playground/levels/05-time-traveler`,
    codeSnippet: `#[derive(Accounts)]
pub struct ReopenEscrow<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + EscrowReceipt::INIT_SPACE,
        seeds = [b"receipt", order_id.as_ref()],
        bump,
    )]
    pub receipt: Account<'info, EscrowReceipt>,
}

pub fn reopen_escrow(ctx: Context<ReopenEscrow>, order_id: [u8; 8]) -> Result<()> {
    let receipt = &mut ctx.accounts.receipt;
    receipt.owner = ctx.accounts.user.key();
    receipt.order_id = order_id;
    receipt.status = ReceiptStatus::Open;
    Ok(())
}`,
    vulnerabilityNote:
      "Address reuse from PDA lifecycle: a stale or closed receipt address can be reused with the same seeds and trusted again.",
    vulnerableLines: [6, 9, 17, 19],
    hints: [
      "PDAs are deterministic across time, not just across users.",
      "`init_if_needed` is safe only when stale state and lifecycle transitions are explicitly validated.",
      "A closed account address can become dangerous if the protocol later treats that reused address as trusted.",
    ],
    lore: [
      "A settlement protocol archives expired receipts, then later reuses the same deterministic address for reopened orders.",
      "Your objective is to prove whether address reuse through PDA lifecycle can bring stale receipt identity back into an active flow.",
    ],
    missionTitle: "Level 5: The Time Traveler",
    subtitle: "Address Reuse from PDA lifecycle",
    title: "The Time Traveler",
    winCondition:
      "Map the stale receipt lifecycle, reproduce the reused-address path, and identify the missing lifecycle guard.",
  },
};
