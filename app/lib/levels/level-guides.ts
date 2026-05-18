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
      "Program Derived Addresses are deterministic. Trace the stats PDA and the per-level PDA separately.",
      "The win condition is not a trick exploit. It is understanding the account lifecycle the rest of the wargame depends on.",
      "The verifier closes the temporary level PDA, so completion is proven by both state and account cleanup.",
    ],
    lore: [
      "Before the vault can be attacked, the Guild wants proof that you understand how its world is stitched together. Level 0 is that handshake: derive the player registry, open the temporary level PDA, then close it correctly.",
      "This first checkpoint is intentionally honest. It exists so every later exploit can assume the same player-bound registry and completion flow without having to teach those mechanics again.",
      "Your objective is to prove you can operate inside SolBreach's account model and leave no temporary state behind.",
    ],
    missionTitle: "Level 0: Hello SolBreach",
    subtitle: "Wallet handshake and PDA closeout warmup",
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
};