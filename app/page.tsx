"use client";

import Image from "next/image";
import {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  address as toAddress,
  isAddress,
  type Address,
  type Instruction,
} from "@solana/kit";
import { PublicKey as Web3PublicKey } from "@solana/web3.js";
import useSWR from "swr";
import { toast } from "sonner";
import { GridBackground } from "./components/grid-background";
import { ClusterSelect } from "./components/cluster-select";
import { CaseStudiesSection } from "./components/case-studies-section";
import { HeaderCourseNav } from "./components/course-nav";
import { LandingPageSection } from "./components/landing-page-section";
import {
  SkeletonLine,
  StatusChip,
  StatusTextRow,
  compactAddress,
} from "./components/level-ui";
import { SiteFooter } from "./components/site-footer";
import { ThemeToggle } from "./components/theme-toggle";
import { WalletButton } from "./components/wallet-button";
import { useCluster } from "./components/cluster-context";
import { parseTransactionError } from "./lib/errors";
import { useBalance } from "./lib/hooks/use-balance";
import { useSendTransaction } from "./lib/hooks/use-send-transaction";
import { getClusterUrl } from "./lib/solana-client";
import { useSolanaClient } from "./lib/solana-client-context";
import { useWallet } from "./lib/wallet/context";
import {
  fetchMaybeLevelCertificate,
  fetchMaybeBankConfig,
  VAULT_PROGRAM_ADDRESS,
  fetchMaybeGuildAuthority,
  fetchMaybeLevel0State,
  fetchMaybeLevel1State,
  fetchMaybeLevel2State,
  fetchMaybeLevel3State,
  fetchMaybeUserProfile,
  fetchMaybeUserStats,
  findBankPda,
  findGuildAuthorityPda,
  findLevel1StatePda,
  findLevel2StatePda,
  findLevel3StatePda,
  findProfilePda,
  getClaimLevelCertificateInstructionAsync,
  getDelegateTaskInstructionAsync,
  getDepositTokensInstructionAsync,
  getInitBankInstructionAsync,
  getInitGuildAuthorityInstructionAsync,
  getInitGlobalProfileInstructionAsync,
  getInitLevel0InstructionAsync,
  getInitLevel1InstructionAsync,
  getInitLevel2InstructionAsync,
  getInitLevel3InstructionAsync,
  getInitUserStatsInstructionAsync,
  getUpdateProfileInstructionAsync,
  getVerifyAndCloseLevel0InstructionAsync,
  getVerifyAndCloseLevel1InstructionAsync,
  getVerifyAndCloseLevel2InstructionAsync,
  getVerifyAndCloseLevel3InstructionAsync,
} from "./generated/vault";

type LevelId = "level0" | "level1" | "level2" | "level3";
type RootSection = "levels" | "case-studies" | "profile";
type LevelsView = "landing" | LevelId;
type LevelStatus = "ready" | "live" | "cleared" | "armed" | "mint" | "locked";

type Level0Snapshot = {
  userStatsPda: Address;
  level0StatePda: Address;
  hasUserStats: boolean;
  hasLevel0State: boolean;
  completedLevels: boolean[];
  isCompleted: boolean;
};

type Level1Snapshot = {
  bankPda: Address;
  level1StatePda: Address;
  hasBank: boolean;
  expectedMint: Address | null;
  hasLevel1State: boolean;
  depositedAmount: bigint;
};

type Level2Snapshot = {
  profilePda: Address;
  level2StatePda: Address;
  hasProfile: boolean;
  commander: Address | null;
  hasLevel2State: boolean;
};

type Level3Snapshot = {
  guildAuthorityPda: Address;
  level3StatePda: Address;
  hasGuildAuthority: boolean;
  rewardMint: Address | null;
  bountyVault: Address | null;
  bountyAmount: bigint;
  hasLevel3State: boolean;
  rewardAccount: Address | null;
  rewardAmount: bigint;
};

type LevelCertificateSnapshot = {
  assetId: Address | null;
  certificatePda: Address;
  exists: boolean;
  leafIndex: number | null;
  leafNonce: bigint | null;
  level: 0 | 1 | 2 | 3;
  merkleTree: Address | null;
  minted: boolean;
};

type CertificateCollection = Record<0 | 1 | 2 | 3, LevelCertificateSnapshot>;

type StageConfig = {
  badge: string;
  title: string;
  description: string;
  actionLabel: string | null;
  actionKind: "primary" | "secondary";
  onAction?: () => Promise<void>;
};

type LevelTileConfig = {
  id: LevelId;
  index: string;
  label: string;
  title: string;
  status: LevelStatus;
  summary: string;
};

type CertificateDetails = {
  image: string;
  lockedImage?: string;
  levelLabel: string;
  title: string;
};

type LevelGuideContent = {
  cloneCommand: string;
  codeSnippet: string;
  hints: string[];
  lore: string[];
  missionTitle: string;
  subtitle: string;
  title: string;
  vulnerabilityActiveLabel?: string;
  vulnerabilityLabel?: string;
  vulnerabilityNote?: string;
  vulnerabilityTone?: "cyan" | "red";
  vulnerableLines?: number[];
  winCondition: string;
};

type MissionStatusData = {
  badge: string;
  chipLabel: string;
  mintDisabled: boolean;
  mintLabel: string;
  onMint: () => void;
  progressValue: number;
  rows: Array<{ label: string; value: string }>;
};

const LEVEL_1_TARGET = 1_000_000n;
const LEVEL_3_DEFAULT_TARGET = 1_000_000n;
const LEVEL_NUMBERS = [0, 1, 2, 3] as const;
const LEVEL_CERTIFICATE_DETAILS: Record<0 | 1 | 2 | 3, CertificateDetails> = {
  0: {
    image: "/nfts/solbreach-level-0-hello-solbreach.png",
    lockedImage: "/nfts/locked-certification.png",
    levelLabel: "Level 0",
    title: "Hello SolBreach",
  },
  1: {
    image: "/nfts/solbreach-level-1-illusionist.png",
    lockedImage: "/nfts/locked-certification.png",
    levelLabel: "Level 1",
    title: "The Illusionist",
  },
  2: {
    image: "/nfts/solbreach-level-2-identity-thief.png",
    lockedImage: "/nfts/locked-certification.png",
    levelLabel: "Level 2",
    title: "Identity Thief",
  },
  3: {
    image: "/nfts/solbreach-level-3-trojan-horse.png",
    lockedImage: "/nfts/locked-certification.png",
    levelLabel: "Level 3",
    title: "The Trojan Horse",
  },
};
const DEFAULT_LEVEL_2_COMMANDER = "11111111111111111111111111111111" as Address;
const PLAYGROUND_REPOSITORY =
  "git clone https://github.com/jpromano-swe/solbreach-playground";
const SOLBREACH_REPOSITORY_URL = "https://github.com/jpromano-swe/solbreach";
const MERCENARY_FOLLOW_ORDERS_DISCRIMINATOR = new Uint8Array([
  222, 50, 96, 140, 105, 24, 81, 44,
]);
const RUST_CODE_KEYWORDS = new Set([
  "Account",
  "AccountMeta",
  "Context",
  "CpiContext",
  "Instruction",
  "Ok",
  "Program",
  "Pubkey",
  "Result",
  "Signer",
  "System",
  "Token",
  "TokenAccount",
  "UncheckedAccount",
  "Vec",
  "bump",
  "fn",
  "let",
  "msg",
  "mut",
  "pub",
  "seeds",
  "struct",
  "token",
  "vec",
]);
const LEVEL_GUIDES: Record<LevelId, LevelGuideContent> = {
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
function findCertificatePdaForUser(
  playerAddress: string,
  level: 0 | 1 | 2 | 3
): Address {
  const [pda] = Web3PublicKey.findProgramAddressSync(
    [
      new TextEncoder().encode("certificate"),
      new Web3PublicKey(playerAddress).toBuffer(),
      Uint8Array.of(level),
    ],
    new Web3PublicKey(VAULT_PROGRAM_ADDRESS)
  );

  return toAddress(pda.toBase58());
}

export default function Home() {
  const { wallet, signer, status } = useWallet();
  const { cluster, getExplorerUrl } = useCluster();
  const client = useSolanaClient();
  const { send } = useSendTransaction();

  const address = wallet?.account.address;
  const walletBalance = useBalance(address);
  const [activeSection, setActiveSection] = useState<RootSection>("levels");
  const [activeLevelsView, setActiveLevelsView] =
    useState<LevelsView>("landing");
  const [level1ExpectedMint] = useState("");
  const [level1Vault] = useState("");
  const [level1UserTokenAccount] = useState("");
  const [level1Amount] = useState("1000000");
  const [level2InitialCommander] = useState<string>(DEFAULT_LEVEL_2_COMMANDER);
  const [level3RewardMint] = useState("");
  const [level3BountyVault] = useState("");
  const [level3UserRewardAccount] = useState("");
  const [level3ExternalProgram] = useState("");
  const [level3Amount] = useState("1000000");
  const [mintingLevel, setMintingLevel] = useState<LevelId | null>(null);

  const {
    data: level0State,
    error: level0Error,
    isLoading: isLevel0Loading,
    mutate: mutateLevel0State,
  } = useSWR(
    signer && address ? (["level0-state", cluster, address] as const) : null,
    async (): Promise<Level0Snapshot> => {
      const [initStatsIx, initLevel0Ix] = await Promise.all([
        getInitUserStatsInstructionAsync({ user: signer! }),
        getInitLevel0InstructionAsync({ user: signer! }),
      ]);

      const userStatsPda = initStatsIx.accounts[1].address;
      const level0StatePda = initLevel0Ix.accounts[2].address;

      const [userStatsAccount, level0StateAccount] = await Promise.all([
        fetchMaybeUserStats(client.rpc, userStatsPda),
        fetchMaybeLevel0State(client.rpc, level0StatePda),
      ]);

      const hasUserStats = userStatsAccount.exists;
      const hasLevel0State = level0StateAccount.exists;
      const completedLevels = hasUserStats
        ? [...userStatsAccount.data.completedLevels]
        : [false, false, false, false];
      const isCompleted = completedLevels[0] ?? false;

      return {
        userStatsPda,
        level0StatePda,
        hasUserStats,
        hasLevel0State,
        completedLevels,
        isCompleted,
      };
    },
    { revalidateOnFocus: true }
  );

  const {
    data: level1State,
    error: level1Error,
    isLoading: isLevel1Loading,
    mutate: mutateLevel1State,
  } = useSWR(
    signer && address ? (["level1-state", cluster, address] as const) : null,
    async (): Promise<Level1Snapshot> => {
      const [[bankPda], [level1StatePda]] = await Promise.all([
        findBankPda(),
        findLevel1StatePda({ user: toAddress(address!) }),
      ]);

      const [bankAccount, level1Account] = await Promise.all([
        fetchMaybeBankConfig(client.rpc, bankPda),
        fetchMaybeLevel1State(client.rpc, level1StatePda),
      ]);

      return {
        bankPda,
        level1StatePda,
        hasBank: bankAccount.exists,
        expectedMint: bankAccount.exists ? bankAccount.data.expectedMint : null,
        hasLevel1State: level1Account.exists,
        depositedAmount: level1Account.exists
          ? level1Account.data.depositedAmount
          : 0n,
      };
    },
    { revalidateOnFocus: true }
  );

  const {
    data: level2State,
    error: level2Error,
    isLoading: isLevel2Loading,
    mutate: mutateLevel2State,
  } = useSWR(
    signer && address ? (["level2-state", cluster, address] as const) : null,
    async (): Promise<Level2Snapshot> => {
      const [[profilePda], [level2StatePda]] = await Promise.all([
        findProfilePda(),
        findLevel2StatePda({ user: toAddress(address!) }),
      ]);

      const [profileAccount, level2Account] = await Promise.all([
        fetchMaybeUserProfile(client.rpc, profilePda),
        fetchMaybeLevel2State(client.rpc, level2StatePda),
      ]);

      return {
        profilePda,
        level2StatePda,
        hasProfile: profileAccount.exists,
        commander: profileAccount.exists ? profileAccount.data.commander : null,
        hasLevel2State: level2Account.exists,
      };
    },
    { revalidateOnFocus: true }
  );

  const {
    data: level3State,
    error: level3Error,
    isLoading: isLevel3Loading,
    mutate: mutateLevel3State,
  } = useSWR(
    signer && address
      ? ([
          "level3-state",
          cluster,
          address,
          level3UserRewardAccount.trim(),
        ] as const)
      : null,
    async (): Promise<Level3Snapshot> => {
      const [[guildAuthorityPda], [level3StatePda]] = await Promise.all([
        findGuildAuthorityPda(),
        findLevel3StatePda({ user: toAddress(address!) }),
      ]);

      const [guildAuthorityAccount, level3Account] = await Promise.all([
        fetchMaybeGuildAuthority(client.rpc, guildAuthorityPda),
        fetchMaybeLevel3State(client.rpc, level3StatePda),
      ]);

      const rewardAccountInput = level3UserRewardAccount.trim();
      const rewardAccount = isAddress(rewardAccountInput)
        ? toAddress(rewardAccountInput)
        : null;

      let rewardAmount = 0n;
      if (rewardAccount) {
        try {
          const { value } = await client.rpc
            .getTokenAccountBalance(rewardAccount)
            .send();
          rewardAmount = BigInt(value.amount);
        } catch {
          rewardAmount = 0n;
        }
      }

      return {
        guildAuthorityPda,
        level3StatePda,
        hasGuildAuthority: guildAuthorityAccount.exists,
        rewardMint: guildAuthorityAccount.exists
          ? guildAuthorityAccount.data.rewardMint
          : null,
        bountyVault: guildAuthorityAccount.exists
          ? guildAuthorityAccount.data.bountyVault
          : null,
        bountyAmount: guildAuthorityAccount.exists
          ? guildAuthorityAccount.data.bountyAmount
          : 0n,
        hasLevel3State: level3Account.exists,
        rewardAccount,
        rewardAmount,
      };
    },
    { revalidateOnFocus: true }
  );

  const {
    data: certificateState,
    isLoading: isCertificateLoading,
    mutate: mutateCertificateState,
  } = useSWR(
    address ? (["certificate-state", cluster, address] as const) : null,
    async (): Promise<CertificateCollection> => {
      const snapshots = await Promise.all(
        LEVEL_NUMBERS.map(async (level) => {
          const certificatePda = findCertificatePdaForUser(address!, level);
          const certificateAccount = await fetchMaybeLevelCertificate(
            client.rpc,
            certificatePda
          );

          return [
            level,
            {
              assetId: certificateAccount.exists
                ? certificateAccount.data.assetId
                : null,
              certificatePda,
              exists: certificateAccount.exists,
              leafIndex: certificateAccount.exists
                ? certificateAccount.data.leafIndex
                : null,
              leafNonce: certificateAccount.exists
                ? certificateAccount.data.leafNonce
                : null,
              level,
              merkleTree: certificateAccount.exists
                ? certificateAccount.data.merkleTree
                : null,
              minted: certificateAccount.exists
                ? certificateAccount.data.minted
                : false,
            } satisfies LevelCertificateSnapshot,
          ] as const;
        })
      );

      return Object.fromEntries(snapshots) as CertificateCollection;
    },
    { revalidateOnFocus: true }
  );

  const refreshState = useCallback(async () => {
    await Promise.all([
      mutateLevel0State(),
      mutateLevel1State(),
      mutateLevel2State(),
      mutateLevel3State(),
      mutateCertificateState(),
      walletBalance.mutate(),
    ]);
  }, [
    mutateCertificateState,
    mutateLevel0State,
    mutateLevel1State,
    mutateLevel2State,
    mutateLevel3State,
    walletBalance,
  ]);

  const parseAddressInput = useCallback((value: string, label: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error(`${label} is required.`);
    }
    if (!isAddress(trimmed)) {
      throw new Error(`${label} is not a valid Solana address.`);
    }
    return toAddress(trimmed);
  }, []);

  const parseAmountInput = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new Error(
        "Deposit amount must be a whole number of raw token units."
      );
    }
    return BigInt(trimmed);
  }, []);

  const runInstruction = useCallback(
    async (
      buildInstruction: () => Promise<Instruction>,
      successTitle: string,
      successDescription: string
    ) => {
      if (!signer) return;

      try {
        const instruction = await buildInstruction();
        const signature = await send({ instructions: [instruction] });

        await refreshState();

        toast.success(successTitle, {
          description: (
            <a
              href={getExplorerUrl(`/tx/${signature}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              {successDescription}
            </a>
          ),
        });
      } catch (err) {
        console.error("Transaction failed:", err);
        toast.error(parseTransactionError(err));
      }
    },
    [getExplorerUrl, refreshState, send, signer]
  );

  const handleInitStats = useCallback(async () => {
    await runInstruction(
      () => getInitUserStatsInstructionAsync({ user: signer! }),
      "User registry created.",
      "View init_user_stats transaction"
    );
  }, [runInstruction, signer]);

  const handleInitLevel0 = useCallback(async () => {
    await runInstruction(
      () => getInitLevel0InstructionAsync({ user: signer! }),
      "Level 0 initialized.",
      "View init_level_0 transaction"
    );
  }, [runInstruction, signer]);

  const handleVerifyLevel0 = useCallback(async () => {
    await runInstruction(
      () => getVerifyAndCloseLevel0InstructionAsync({ user: signer! }),
      "Level 0 completed.",
      "View verify_and_close_level_0 transaction"
    );
  }, [runInstruction, signer]);

  const handleInitBank = useCallback(async () => {
    await runInstruction(
      () =>
        getInitBankInstructionAsync({
          admin: signer!,
          expectedMint: parseAddressInput(level1ExpectedMint, "Expected mint"),
        }),
      "Bank initialized.",
      "View init_bank transaction"
    );
  }, [level1ExpectedMint, parseAddressInput, runInstruction, signer]);

  const handleInitLevel1 = useCallback(async () => {
    await runInstruction(
      () => getInitLevel1InstructionAsync({ user: signer! }),
      "Level 1 initialized.",
      "View init_level_1 transaction"
    );
  }, [runInstruction, signer]);

  const handleDepositLevel1 = useCallback(async () => {
    await runInstruction(
      () =>
        getDepositTokensInstructionAsync({
          user: signer!,
          vault: parseAddressInput(level1Vault, "Vault token account"),
          userTokenAccount: parseAddressInput(
            level1UserTokenAccount,
            "User token account"
          ),
          amount: parseAmountInput(level1Amount),
        }),
      "Exploit deposit submitted.",
      "View deposit_tokens transaction"
    );
  }, [
    level1Amount,
    level1UserTokenAccount,
    level1Vault,
    parseAddressInput,
    parseAmountInput,
    runInstruction,
    signer,
  ]);

  const handleVerifyLevel1 = useCallback(async () => {
    await runInstruction(
      () => getVerifyAndCloseLevel1InstructionAsync({ user: signer! }),
      "Level 1 completed.",
      "View verify_and_close_level_1 transaction"
    );
  }, [runInstruction, signer]);

  const handleInitGlobalProfile = useCallback(async () => {
    await runInstruction(
      () => {
        const initialCommander = parseAddressInput(
          level2InitialCommander,
          "Initial commander"
        );
        if (address && initialCommander === address) {
          throw new Error(
            "Initial commander must be different from the connected wallet."
          );
        }

        return getInitGlobalProfileInstructionAsync({
          admin: signer!,
          initialCommander,
        });
      },
      "Global profile bootstrapped.",
      "View init_global_profile transaction"
    );
  }, [
    address,
    level2InitialCommander,
    parseAddressInput,
    runInstruction,
    signer,
  ]);

  const handleInitLevel2 = useCallback(async () => {
    await runInstruction(
      () => getInitLevel2InstructionAsync({ user: signer! }),
      "Level 2 initialized.",
      "View init_level_2 transaction"
    );
  }, [runInstruction, signer]);

  const handleUpdateProfile = useCallback(async () => {
    await runInstruction(
      () => getUpdateProfileInstructionAsync({ user: signer! }),
      "Commander registry overwritten.",
      "View update_profile transaction"
    );
  }, [runInstruction, signer]);

  const handleVerifyLevel2 = useCallback(async () => {
    await runInstruction(
      () => getVerifyAndCloseLevel2InstructionAsync({ user: signer! }),
      "Level 2 completed.",
      "View verify_and_close_level_2 transaction"
    );
  }, [runInstruction, signer]);

  const handleInitGuildAuthority = useCallback(async () => {
    await runInstruction(
      () =>
        getInitGuildAuthorityInstructionAsync({
          admin: signer!,
          rewardMint: parseAddressInput(level3RewardMint, "Reward mint"),
          bountyVault: parseAddressInput(level3BountyVault, "Bounty vault"),
          bountyAmount: parseAmountInput(level3Amount),
        }),
      "Guild authority bootstrapped.",
      "View init_guild_authority transaction"
    );
  }, [
    level3Amount,
    level3BountyVault,
    level3RewardMint,
    parseAddressInput,
    parseAmountInput,
    runInstruction,
    signer,
  ]);

  const handleInitLevel3 = useCallback(async () => {
    await runInstruction(
      () => getInitLevel3InstructionAsync({ user: signer! }),
      "Level 3 initialized.",
      "View init_level_3 transaction"
    );
  }, [runInstruction, signer]);

  const handleDelegateTask = useCallback(async () => {
    await runInstruction(
      async () => {
        const amount =
          level3State?.bountyAmount || parseAmountInput(level3Amount);
        const taskData = new Uint8Array(16);
        taskData.set(MERCENARY_FOLLOW_ORDERS_DISCRIMINATOR, 0);
        new DataView(taskData.buffer).setBigUint64(8, amount, true);

        return getDelegateTaskInstructionAsync({
          user: signer!,
          bountyVault:
            level3State?.bountyVault ??
            parseAddressInput(level3BountyVault, "Bounty vault"),
          userRewardAccount: parseAddressInput(
            level3UserRewardAccount,
            "User reward account"
          ),
          externalProgram: parseAddressInput(
            level3ExternalProgram,
            "External program"
          ),
          taskData,
        });
      },
      "Delegated CPI submitted.",
      "View delegate_task transaction"
    );
  }, [
    level3Amount,
    level3BountyVault,
    level3ExternalProgram,
    level3State,
    level3UserRewardAccount,
    parseAddressInput,
    parseAmountInput,
    runInstruction,
    signer,
  ]);

  const handleVerifyLevel3 = useCallback(async () => {
    await runInstruction(
      () =>
        getVerifyAndCloseLevel3InstructionAsync({
          user: signer!,
          userRewardAccount: parseAddressInput(
            level3UserRewardAccount,
            "User reward account"
          ),
        }),
      "Level 3 completed.",
      "View verify_and_close_level_3 transaction"
    );
  }, [level3UserRewardAccount, parseAddressInput, runInstruction, signer]);

  const level1Completed = Boolean(level0State?.completedLevels[1]);
  const level2Completed = Boolean(level0State?.completedLevels[2]);
  const level3Completed = Boolean(level0State?.completedLevels[3]);
  const level0Certificate = certificateState?.[0];
  const level1Certificate = certificateState?.[1];
  const level2Certificate = certificateState?.[2];
  const level3Certificate = certificateState?.[3];
  const level1DepositReady =
    (level1State?.depositedAmount ?? 0n) >= LEVEL_1_TARGET;
  const level2Hijacked = Boolean(address && level2State?.commander === address);
  const level3DelegationReady =
    (level3State?.rewardAmount ?? 0n) >=
    (level3State?.bountyAmount || LEVEL_3_DEFAULT_TARGET);

  const mintLevelCertificate = useCallback(
    async ({
      level,
      levelId,
      existingCertificate,
      title,
    }: {
      level: 0 | 1 | 2 | 3;
      levelId: LevelId;
      existingCertificate?: LevelCertificateSnapshot;
      title: string;
    }) => {
      if (!signer || !address) {
        toast.error("Connect the wallet that cleared this level first.");
        return;
      }

      if (cluster === "testnet") {
        toast.error(
          "Certificate minting is only configured for devnet, localnet, or mainnet-beta."
        );
        return;
      }

      if (existingCertificate?.minted) {
        toast.success(`${title} cNFT already minted.`, {
          description: existingCertificate.assetId ? (
            <a
              href={getExplorerUrl(`/address/${existingCertificate.assetId}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              View recorded asset
            </a>
          ) : (
            "The certificate PDA already has a recorded compressed asset."
          ),
        });
        return;
      }

      setMintingLevel(levelId);

      try {
        if (!existingCertificate?.exists) {
          const claimInstruction =
            await getClaimLevelCertificateInstructionAsync({
              user: signer,
              certificate: findCertificatePdaForUser(address, level),
              level,
            });

          const claimSignature = await send({
            instructions: [claimInstruction],
          });
          toast.success(`${title} certificate claimed.`, {
            description: (
              <a
                href={getExplorerUrl(`/tx/${claimSignature}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                View claim transaction
              </a>
            ),
          });
        }

        const response = await fetch("/api/nfts/certifications/mint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cluster: cluster === "mainnet" ? "mainnet-beta" : cluster,
            level,
            player: address,
            rpcUrl: getClusterUrl(cluster),
          }),
        });

        const payload = (await response.json()) as
          | {
              error?: string;
            }
          | {
              alreadyMinted: boolean;
              assetId: string;
              certificatePda: string;
              mintSignature?: string;
              recordSignature?: string;
            };

        if (!response.ok) {
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : "Mint route failed."
          );
        }

        await refreshState();

        const assetId = "assetId" in payload ? payload.assetId : undefined;
        const mintSignature =
          "mintSignature" in payload ? payload.mintSignature : undefined;
        const alreadyMinted =
          "alreadyMinted" in payload ? payload.alreadyMinted : false;

        toast.success(
          alreadyMinted
            ? `${title} cNFT already existed.`
            : `${title} cNFT minted.`,
          {
            description: assetId ? (
              <a
                href={getExplorerUrl(`/address/${assetId}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {mintSignature
                  ? "View compressed asset record"
                  : "View recorded asset"}
              </a>
            ) : undefined,
          }
        );
      } catch (err) {
        console.error("Certificate mint failed:", err);
        toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        setMintingLevel(null);
      }
    },
    [address, cluster, getExplorerUrl, refreshState, send, signer]
  );

  const handleMintLevel0Flag = useCallback(async () => {
    await mintLevelCertificate({
      level: 0,
      levelId: "level0",
      existingCertificate: level0Certificate,
      title: "Hello SolBreach",
    });
  }, [level0Certificate, mintLevelCertificate]);

  const handleMintLevel1Flag = useCallback(async () => {
    await mintLevelCertificate({
      level: 1,
      levelId: "level1",
      existingCertificate: level1Certificate,
      title: "Level 1",
    });
  }, [level1Certificate, mintLevelCertificate]);

  const handleMintLevel2Flag = useCallback(async () => {
    await mintLevelCertificate({
      level: 2,
      levelId: "level2",
      existingCertificate: level2Certificate,
      title: "Level 2",
    });
  }, [level2Certificate, mintLevelCertificate]);

  const handleMintLevel3Flag = useCallback(async () => {
    await mintLevelCertificate({
      level: 3,
      levelId: "level3",
      existingCertificate: level3Certificate,
      title: "Level 3",
    });
  }, [level3Certificate, mintLevelCertificate]);

  const stage = useMemo<StageConfig>(() => {
    if (status !== "connected" || !address || !signer) {
      return {
        badge: "Wallet required",
        title: "Attach a wallet to enter the warmup.",
        description:
          "Level 0 only becomes actionable once the wallet can derive and sign for its PDAs.",
        actionLabel: null,
        actionKind: "secondary",
      };
    }

    if (isLevel0Loading) {
      return {
        badge: "Reading accounts",
        title: "Mapping your Level 0 state.",
        description:
          "The client is deriving PDAs and checking whether the registry and level instance already exist.",
        actionLabel: null,
        actionKind: "secondary",
      };
    }

    if (level0Error) {
      return {
        badge: "Read error",
        title: "State lookup failed on the selected cluster.",
        description:
          "Retry the account read before attempting another instruction. This is usually an RPC issue, not a program issue.",
        actionLabel: "Retry state read",
        actionKind: "secondary",
        onAction: async () => {
          await mutateLevel0State();
        },
      };
    }

    if (!level0State?.hasUserStats) {
      return {
        badge: "Step 1",
        title: "Create the player registry PDA.",
        description:
          "This wallet does not have a `UserStats` account yet. Initialize it first so later levels have a persistent completion record.",
        actionLabel: "Initialize stats",
        actionKind: "primary",
        onAction: handleInitStats,
      };
    }

    if (level0State.isCompleted) {
      return {
        badge: "Cleared",
        title: "Level 0 already cleared.",
        description:
          "The registry marks this checkpoint as complete and the temporary level PDA has already been closed.",
        actionLabel: null,
        actionKind: "secondary",
      };
    }

    if (!level0State.hasLevel0State) {
      return {
        badge: "Step 2",
        title: "Open the temporary Level 0 PDA.",
        description:
          "This creates the per-wallet level instance that will be closed and refunded after successful verification.",
        actionLabel: "Initialize Level 0",
        actionKind: "primary",
        onAction: handleInitLevel0,
      };
    }

    return {
      badge: "Step 3",
      title: "Mark completion and reclaim rent.",
      description:
        "Level 0 is ready to verify. Completing it flips `completed_levels[0]` and closes the instance account.",
      actionLabel: "Complete Level 0",
      actionKind: "primary",
      onAction: handleVerifyLevel0,
    };
  }, [
    address,
    handleInitLevel0,
    handleInitStats,
    handleVerifyLevel0,
    isLevel0Loading,
    level0Error,
    level0State,
    mutateLevel0State,
    signer,
    status,
  ]);

  const level1Stage = useMemo<StageConfig>(() => {
    if (status !== "connected" || !address || !signer) {
      return {
        badge: "Wallet required",
        title: "Attach the operator wallet first.",
        description:
          "Level 1 needs a connected signer so the board can derive the per-player PDA and submit the vulnerable deposit instruction.",
        actionLabel: null,
        actionKind: "secondary",
      };
    }

    if (!level0State?.isCompleted) {
      return {
        badge: "Locked",
        title: "Finish Level 0 before entering the exploit board.",
        description:
          "The operator levels stay viewable, but their actions remain locked until the warmup registry and closeout loop are proven on-chain.",
        actionLabel: null,
        actionKind: "secondary",
      };
    }

    if (isLevel1Loading) {
      return {
        badge: "Reading accounts",
        title: "Inspecting the bank and your Level 1 instance.",
        description:
          "The board is checking whether the global bank PDA exists and whether this wallet already opened its per-player challenge state.",
        actionLabel: null,
        actionKind: "secondary",
      };
    }

    if (level1Error) {
      return {
        badge: "Read error",
        title: "Could not load Level 1 state.",
        description:
          "Retry the account read before pushing another exploit transaction. This is usually an RPC or cluster mismatch.",
        actionLabel: "Retry state read",
        actionKind: "secondary",
        onAction: async () => {
          await mutateLevel1State();
        },
      };
    }

    if (level1Completed) {
      return {
        badge: "Cleared",
        title: "Level 1 already cleared.",
        description:
          "The vulnerable deposit path has already been exploited for this wallet and the level instance has been closed.",
        actionLabel: null,
        actionKind: "secondary",
      };
    }

    if (!level1State?.hasBank) {
      return {
        badge: "Step 1",
        title: "Configure the bank's expected mint.",
        description:
          "Bootstrap the global bank PDA with the legit mint first. The exploit only matters once that expectation exists on-chain.",
        actionLabel: "Initialize bank",
        actionKind: "primary",
        onAction: handleInitBank,
      };
    }

    if (!level1State.hasLevel1State) {
      return {
        badge: "Step 2",
        title: "Open the per-player Level 1 state.",
        description:
          "Create the wallet-specific level PDA that will accumulate the fake deposit amount and later close on verification.",
        actionLabel: "Initialize Level 1",
        actionKind: "primary",
        onAction: handleInitLevel1,
      };
    }

    if (!level1DepositReady) {
      return {
        badge: "Exploit",
        title: "Substitute the token accounts.",
        description:
          "Provide the fake mint's token accounts and push the vulnerable deposit. The program will count the amount without validating the vault mint.",
        actionLabel: "Run exploit deposit",
        actionKind: "primary",
        onAction: handleDepositLevel1,
      };
    }

    return {
      badge: "Verify",
      title: "Lock in the forged deposit amount.",
      description:
        "Verification flips `completed_levels[1]` once the internal ledger reaches the 1,000,000 unit target, then closes the Level 1 instance.",
      actionLabel: "Verify and close",
      actionKind: "primary",
      onAction: handleVerifyLevel1,
    };
  }, [
    address,
    handleDepositLevel1,
    handleInitBank,
    handleInitLevel1,
    handleVerifyLevel1,
    isLevel1Loading,
    level1Completed,
    level1DepositReady,
    level1Error,
    level1State,
    mutateLevel1State,
    signer,
    status,
    level0State,
  ]);

  const level2Stage = useMemo<StageConfig>(() => {
    if (status !== "connected" || !address || !signer) {
      return {
        badge: "Wallet required",
        title: "Attach the operator wallet first.",
        description:
          "Level 2 needs a connected signer so the board can derive the static profile PDA and verify the commander overwrite.",
        actionLabel: null,
        actionKind: "secondary",
      };
    }

    if (!level0State?.isCompleted) {
      return {
        badge: "Locked",
        title: "Finish Level 0 before entering the exploit board.",
        description:
          "The operator levels stay viewable, but their actions remain locked until the warmup registry and closeout loop are proven on-chain.",
        actionLabel: null,
        actionKind: "secondary",
      };
    }

    if (isLevel2Loading) {
      return {
        badge: "Reading accounts",
        title: "Inspecting the profile registry and your Level 2 state.",
        description:
          "The board is checking whether the global commander profile exists and whether this wallet already opened its per-player exploit state.",
        actionLabel: null,
        actionKind: "secondary",
      };
    }

    if (level2Error) {
      return {
        badge: "Read error",
        title: "Could not load Level 2 state.",
        description:
          "Retry the account read before sending another overwrite. This is usually an RPC or cluster mismatch.",
        actionLabel: "Retry state read",
        actionKind: "secondary",
        onAction: async () => {
          await mutateLevel2State();
        },
      };
    }

    if (level2Completed) {
      return {
        badge: "Cleared",
        title: "Level 2 already cleared.",
        description:
          "The static profile registry has already been hijacked and verified for this wallet. The global profile remains live; the per-player PDA is closed.",
        actionLabel: null,
        actionKind: "secondary",
      };
    }

    if (!level2State?.hasProfile) {
      return {
        badge: "Step 1",
        title: "Bootstrap the global commander profile.",
        description:
          "Initialize the static profile PDA with any non-player commander. That creates the single global registry the exploit will later overwrite.",
        actionLabel: "Initialize profile",
        actionKind: "primary",
        onAction: handleInitGlobalProfile,
      };
    }

    if (!level2State.hasLevel2State) {
      return {
        badge: "Step 2",
        title: "Open the per-player Level 2 state.",
        description:
          "Create the wallet-specific Level 2 PDA so the verifier can later tie the hijack back to the connected player.",
        actionLabel: "Initialize Level 2",
        actionKind: "primary",
        onAction: handleInitLevel2,
      };
    }

    if (!level2Hijacked) {
      return {
        badge: "Exploit",
        title: "Overwrite the commander registry.",
        description:
          "The seeds are static, so any signer can hit the single global profile PDA and replace the stored commander with themselves.",
        actionLabel: "Overwrite commander",
        actionKind: "primary",
        onAction: handleUpdateProfile,
      };
    }

    return {
      badge: "Verify",
      title: "Prove you now control the global registry.",
      description:
        "Verification checks that the static profile commander matches the connected wallet, then flips `completed_levels[2]` and closes the Level 2 instance.",
      actionLabel: "Verify and close",
      actionKind: "primary",
      onAction: handleVerifyLevel2,
    };
  }, [
    address,
    handleInitGlobalProfile,
    handleInitLevel2,
    handleUpdateProfile,
    handleVerifyLevel2,
    isLevel2Loading,
    level2Completed,
    level2Error,
    level2Hijacked,
    level2State,
    mutateLevel2State,
    signer,
    status,
    level0State,
  ]);

  const level3Stage = useMemo<StageConfig>(() => {
    if (status !== "connected" || !address || !signer) {
      return {
        badge: "Wallet required",
        title: "Attach the operator wallet first.",
        description:
          "Level 3 needs a connected signer so the board can derive the guild authority PDA, open the per-player state, and delegate into the attacker program.",
        actionLabel: null,
        actionKind: "secondary",
      };
    }

    if (!level0State?.isCompleted) {
      return {
        badge: "Locked",
        title: "Finish Level 0 before entering the exploit board.",
        description:
          "The operator levels stay viewable, but their actions remain locked until the warmup registry and closeout loop are proven on-chain.",
        actionLabel: null,
        actionKind: "secondary",
      };
    }

    if (isLevel3Loading) {
      return {
        badge: "Reading accounts",
        title: "Inspecting the guild and your Level 3 state.",
        description:
          "The board is checking the shared guild authority PDA, your per-player Level 3 state, and the reward token account you supplied.",
        actionLabel: null,
        actionKind: "secondary",
      };
    }

    if (level3Error) {
      return {
        badge: "Read error",
        title: "Could not load Level 3 state.",
        description:
          "Retry the account read before sending another delegated CPI. This is usually an RPC or cluster mismatch.",
        actionLabel: "Retry state read",
        actionKind: "secondary",
        onAction: async () => {
          await mutateLevel3State();
        },
      };
    }

    if (level3Completed) {
      return {
        badge: "Cleared",
        title: "Level 3 already cleared.",
        description:
          "The arbitrary CPI path has already been exploited and verified for this wallet. The guild authority persists; the per-player Level 3 PDA is closed.",
        actionLabel: null,
        actionKind: "secondary",
      };
    }

    if (!level3State?.hasGuildAuthority) {
      return {
        badge: "Step 1",
        title: "Bootstrap the guild authority and bounty vault.",
        description:
          "Provide the pre-created reward mint and bounty vault addresses, then initialize the shared guild authority PDA so the vulnerable delegation path has something valuable to sign for.",
        actionLabel: "Initialize guild",
        actionKind: "primary",
        onAction: handleInitGuildAuthority,
      };
    }

    if (!level3State.hasLevel3State) {
      return {
        badge: "Step 2",
        title: "Open the per-player Level 3 state.",
        description:
          "Create the wallet-specific Level 3 PDA so the verifier can later tie the delegated exploit back to the connected player.",
        actionLabel: "Initialize Level 3",
        actionKind: "primary",
        onAction: handleInitLevel3,
      };
    }

    if (!level3DelegationReady) {
      return {
        badge: "Exploit",
        title: "Delegate into the attacker program.",
        description:
          "Pass the mercenary program and your reward account. The vault will forward the guild PDA signer into arbitrary CPI and let the attacker drain the bounty vault.",
        actionLabel: "Run delegated CPI",
        actionKind: "primary",
        onAction: handleDelegateTask,
      };
    }

    return {
      badge: "Verify",
      title: "Prove the guild executed your malicious orders.",
      description:
        "Verification checks that your reward account received the bounty amount, then flips `completed_levels[3]` and closes the Level 3 instance.",
      actionLabel: "Verify and close",
      actionKind: "primary",
      onAction: handleVerifyLevel3,
    };
  }, [
    address,
    handleDelegateTask,
    handleInitGuildAuthority,
    handleInitLevel3,
    handleVerifyLevel3,
    isLevel3Loading,
    level3Completed,
    level3DelegationReady,
    level3Error,
    level3State,
    mutateLevel3State,
    signer,
    status,
    level0State,
  ]);

  const progressValue = useMemo(() => {
    if (status !== "connected" || !address) return 0;
    if (isLevel0Loading || level0Error) return 15;
    if (!level0State?.hasUserStats) return 33;
    if (!level0State.hasLevel0State && !level0State.isCompleted) return 66;
    if (level0State.isCompleted) return 100;
    return 92;
  }, [address, isLevel0Loading, level0Error, level0State, status]);

  const levelTiles = useMemo<LevelTileConfig[]>(() => {
    const level0Status: LevelStatus = level0State?.isCompleted
      ? "cleared"
      : level0State?.hasLevel0State
        ? "live"
        : "ready";

    const level1Status: LevelStatus = !level0State?.isCompleted
      ? "locked"
      : level1Completed
        ? "cleared"
        : level1DepositReady
          ? "armed"
          : level1State?.hasLevel1State
            ? "live"
            : "ready";

    const level2Status: LevelStatus = !level0State?.isCompleted
      ? "locked"
      : level2Completed
        ? "cleared"
        : level2Hijacked
          ? "armed"
          : level2State?.hasProfile || level2State?.hasLevel2State
            ? "live"
            : "ready";

    const level3Status: LevelStatus = !level0State?.isCompleted
      ? "locked"
      : level3Completed
        ? "cleared"
        : level3DelegationReady
          ? "armed"
          : level3State?.hasGuildAuthority || level3State?.hasLevel3State
            ? "live"
            : "ready";

    return [
      {
        id: "level0",
        index: "00",
        label: "Warmup",
        title: "Wallet Handshake",
        status: level0Status,
        summary: "Create registry, open PDA, close it correctly.",
      },
      {
        id: "level1",
        index: "01",
        label: "Account substitution",
        title: "Illusionist",
        status: level1Status,
        summary: "Exploit the missing mint constraint and forge the ledger.",
      },
      {
        id: "level2",
        index: "02",
        label: "PDA authority bypass",
        title: "Identity Thief",
        status: level2Status,
        summary: "Hijack the global profile PDA and become commander.",
      },
      {
        id: "level3",
        index: "03",
        label: "Arbitrary CPI",
        title: "Trojan Horse",
        status: level3Status,
        summary: "Abuse arbitrary CPI and the forwarded guild signer.",
      },
    ];
  }, [
    level0State,
    level1Completed,
    level1DepositReady,
    level1State,
    level2Completed,
    level2Hijacked,
    level2State,
    level3Completed,
    level3DelegationReady,
    level3State,
  ]);

  const activeLevel = activeLevelsView === "landing" ? null : activeLevelsView;
  const activeGuide = activeLevel ? LEVEL_GUIDES[activeLevel] : null;
  const activeTile = activeLevel
    ? (levelTiles.find((tile) => tile.id === activeLevel) ?? null)
    : null;
  const activeCertificate = activeLevel
    ? ({
        level0: level0Certificate,
        level1: level1Certificate,
        level2: level2Certificate,
        level3: level3Certificate,
      }[activeLevel] ?? null)
    : null;
  const activeLevelStatus = useMemo(() => {
    if (!activeLevel) return null;
    const mintState = activeCertificate?.minted
      ? {
          mintDisabled: true,
          mintLabel: "Certification Minted",
          onMint: () => {},
        }
      : activeLevel === "level0"
        ? {
            mintDisabled:
              !level0State?.isCompleted || mintingLevel === "level0",
            mintLabel:
              mintingLevel === "level0"
                ? "Minting..."
                : level0State?.isCompleted
                  ? "Unlock Certification"
                  : "Mint Locked",
            onMint: () => {
              void handleMintLevel0Flag();
            },
          }
        : activeLevel === "level1"
          ? {
              mintDisabled: !level1Completed || mintingLevel === "level1",
              mintLabel:
                mintingLevel === "level1"
                  ? "Minting..."
                  : level1Completed
                    ? "Unlock Certification"
                    : "Mint Locked",
              onMint: () => {
                void handleMintLevel1Flag();
              },
            }
          : activeLevel === "level2"
            ? {
                mintDisabled: !level2Completed || mintingLevel === "level2",
                mintLabel:
                  mintingLevel === "level2"
                    ? "Minting..."
                    : level2Completed
                      ? "Unlock Certification"
                      : "Mint Locked",
                onMint: () => {
                  void handleMintLevel2Flag();
                },
              }
            : {
                mintDisabled: !level3Completed || mintingLevel === "level3",
                mintLabel:
                  mintingLevel === "level3"
                    ? "Minting..."
                    : level3Completed
                      ? "Unlock Certification"
                      : "Mint Locked",
                onMint: () => {
                  void handleMintLevel3Flag();
                },
              };
    switch (activeLevel) {
      case "level0":
        return {
          badge: stage.badge,
          chipLabel: activeTile ? statusLabel(activeTile.status) : "Ready",
          ...mintState,
          progressValue,
          rows: [
            { label: "Cluster", value: cluster },
            {
              label: "Wallet",
              value:
                status === "connected"
                  ? compactAddress(address ?? "")
                  : "Detached",
            },
            {
              label: "PDA state",
              value: level0State?.hasLevel0State
                ? "Live"
                : level0State?.isCompleted
                  ? "Closed"
                  : "Pending",
            },
            {
              label: "Win condition",
              value: level0State?.isCompleted
                ? "1 / 1 cleared"
                : "0 / 1 cleared",
            },
          ],
        };
      case "level1":
        return {
          badge: level1Stage.badge,
          chipLabel: activeTile ? statusLabel(activeTile.status) : "Ready",
          ...mintState,
          progressValue: Math.min(
            Number(
              ((level1State?.depositedAmount ?? 0n) * 100n) / LEVEL_1_TARGET
            ),
            100
          ),
          rows: [
            { label: "Cluster", value: cluster },
            {
              label: "Wallet",
              value:
                status === "connected"
                  ? compactAddress(address ?? "")
                  : "Detached",
            },
            {
              label: "PDA state",
              value: level1Completed
                ? "Closed"
                : level1State?.hasLevel1State
                  ? "Live"
                  : "Pending",
            },
            {
              label: "Win condition",
              value: `${(level1State?.depositedAmount ?? 0n).toString()} / ${LEVEL_1_TARGET.toString()}`,
            },
          ],
        };
      case "level2":
        return {
          badge: level2Stage.badge,
          chipLabel: activeTile ? statusLabel(activeTile.status) : "Ready",
          ...mintState,
          progressValue: level2Completed ? 100 : level2Hijacked ? 66 : 20,
          rows: [
            { label: "Cluster", value: cluster },
            {
              label: "Wallet",
              value:
                status === "connected"
                  ? compactAddress(address ?? "")
                  : "Detached",
            },
            {
              label: "PDA state",
              value: level2Completed
                ? "Closed"
                : level2State?.hasLevel2State
                  ? "Live"
                  : "Pending",
            },
            {
              label: "Win condition",
              value: level2Hijacked
                ? "Commander overwritten"
                : "Commander unchanged",
            },
          ],
        };
      case "level3":
        return {
          badge: level3Stage.badge,
          chipLabel: activeTile ? statusLabel(activeTile.status) : "Ready",
          ...mintState,
          progressValue: Math.min(
            Number(
              ((level3State?.rewardAmount ?? 0n) * 100n) /
                (level3State?.bountyAmount || LEVEL_3_DEFAULT_TARGET)
            ),
            100
          ),
          rows: [
            { label: "Cluster", value: cluster },
            {
              label: "Wallet",
              value:
                status === "connected"
                  ? compactAddress(address ?? "")
                  : "Detached",
            },
            {
              label: "PDA state",
              value: level3Completed
                ? "Closed"
                : level3State?.hasLevel3State
                  ? "Live"
                  : "Pending",
            },
            {
              label: "Win condition",
              value: `${(level3State?.rewardAmount ?? 0n).toString()} / ${(level3State?.bountyAmount || LEVEL_3_DEFAULT_TARGET).toString()}`,
            },
          ],
        };
    }
  }, [
    activeLevel,
    activeCertificate,
    activeTile,
    address,
    cluster,
    handleMintLevel0Flag,
    handleMintLevel1Flag,
    handleMintLevel2Flag,
    handleMintLevel3Flag,
    level0State,
    level1Completed,
    level1Stage.badge,
    level1State,
    level2Completed,
    level2Hijacked,
    level2Stage.badge,
    level2State,
    level3Completed,
    level3Stage.badge,
    level3State,
    mintingLevel,
    progressValue,
    stage.badge,
    status,
  ]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <GridBackground />

      <div className="relative z-10">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/88 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr]">
            <div className="flex justify-center lg:justify-start">
              <button
                type="button"
                onClick={() => {
                  setActiveSection("levels");
                  setActiveLevelsView("landing");
                }}
                className="rounded-[18px] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Open SolBreach landing page"
              >
                <Image
                  src="/logo_crop.png"
                  alt="SolBreach"
                  width={1480}
                  height={304}
                  className="h-20 w-auto sm:h-20 lg:h-20"
                  priority
                />
              </button>
            </div>

            {activeSection !== "levels" || activeLevelsView !== "landing" ? (
              <HeaderCourseNav
                onSelectCaseStudies={() => setActiveSection("case-studies")}
                onSelectLevel={(level) => {
                  setActiveSection("levels");
                  setActiveLevelsView(level);
                }}
              />
            ) : (
              <div className="hidden lg:block" aria-hidden="true" />
            )}

            <div className="flex items-center justify-center gap-2 sm:gap-3 lg:justify-self-end">
              <ClusterSelect />
              <WalletButton />
              {status === "connected" ? (
                <button
                  type="button"
                  onClick={() => setActiveSection("profile")}
                  className={`min-h-11 rounded-full border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    activeSection === "profile"
                      ? "border-foreground/20 bg-foreground text-background"
                      : "border-border bg-card/70 text-foreground hover:bg-accent"
                  }`}
                >
                  My Profile
                </button>
              ) : null}
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10">
          {activeSection === "levels" ? (
            <div className="space-y-8">
              {activeLevelsView === "landing" ? (
                <LandingPageSection
                  repositoryUrl={SOLBREACH_REPOSITORY_URL}
                  onPlayNow={() => setActiveLevelsView("level0")}
                />
              ) : activeGuide && activeLevelStatus ? (
                <div className="space-y-8">
                  <LevelWorkspacePage
                    guide={activeGuide}
                    missionStatus={activeLevelStatus}
                  />
                </div>
              ) : null}
            </div>
          ) : activeSection === "case-studies" ? (
            <CaseStudiesSection />
          ) : (
            <section className="space-y-8">
              <div className="max-w-3xl space-y-4">
                <h1 className="text-5xl font-semibold tracking-[-0.08em] sm:text-6xl">
                  Wallet-bound certificates.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
                  Every SolBreach certificate is tied back to the wallet that
                  cleared the level.
                </p>
              </div>

              <ProfileCertificatesSection
                address={address}
                certificateState={certificateState}
                completedLevels={level0State?.completedLevels}
                getExplorerUrl={getExplorerUrl}
                isLoading={isCertificateLoading || isLevel0Loading}
                onSelectLevel={(level) => {
                  setActiveSection("levels");
                  setActiveLevelsView(level);
                }}
              />
            </section>
          )}
        </main>

        <SiteFooter repositoryUrl={SOLBREACH_REPOSITORY_URL} />
      </div>
    </div>
  );
}

function LevelWorkspacePage({
  guide,
  missionStatus,
}: {
  guide: LevelGuideContent;
  missionStatus: MissionStatusData;
}) {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.32em] text-muted">
          {guide.subtitle}
        </p>
        <h1 className="text-5xl font-semibold tracking-[-0.08em] sm:text-6xl">
          {guide.missionTitle}
        </h1>
      </div>

      <div className="h-px bg-border" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-stretch">
        <div className="space-y-6">
          <InfoCard title="Lore">
            <div className="space-y-4 text-base leading-8 text-muted">
              {guide.lore.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </InfoCard>

          <InfoCard title="Hints">
            <ul className="space-y-4 text-base leading-8 text-muted">
              {guide.hints.map((hint) => (
                <li key={hint} className="flex items-start gap-3">
                  <span
                    className="mt-3 h-1.5 w-1.5 rounded-full bg-foreground/80"
                    aria-hidden="true"
                  />
                  <span>{hint}</span>
                </li>
              ))}
            </ul>
          </InfoCard>
        </div>

        <MissionStatusCard
          badge={missionStatus.badge}
          chipLabel={missionStatus.chipLabel}
          mintDisabled={missionStatus.mintDisabled}
          mintLabel={missionStatus.mintLabel}
          onMint={missionStatus.onMint}
          progressValue={missionStatus.progressValue}
          rows={missionStatus.rows}
          winCondition={guide.winCondition}
        />
      </div>

      <CodeSnippetCard
        key={guide.title}
        code={guide.codeSnippet}
        vulnerabilityActiveLabel={guide.vulnerabilityActiveLabel}
        vulnerabilityLabel={guide.vulnerabilityLabel}
        vulnerabilityNote={guide.vulnerabilityNote}
        vulnerabilityTone={guide.vulnerabilityTone}
        vulnerableLines={guide.vulnerableLines}
      />
      <PlaygroundCommandBar command={guide.cloneCommand} />
    </section>
  );
}

function MissionStatusCard({
  badge,
  chipLabel,
  mintDisabled,
  mintLabel,
  onMint,
  progressValue,
  rows,
  winCondition,
}: {
  badge: string;
  chipLabel: string;
  mintDisabled: boolean;
  mintLabel: string;
  onMint: () => void;
  progressValue: number;
  rows: Array<{ label: string; value: string }>;
  winCondition: string;
}) {
  const mintButtonTone = mintDisabled
    ? "border-border bg-card text-muted"
    : "border-emerald-400/20 bg-emerald-400/8 text-foreground shadow-[inset_0_0_0_1px_rgba(74,222,128,0.16)]";

  return (
    <aside className="flex h-full flex-col rounded-[28px] border border-border bg-card/92 p-5 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.45)] xl:sticky xl:top-28">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
            Mission Status
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.05em]">
            {badge}
          </p>
        </div>
        <StatusChip>{chipLabel}</StatusChip>
      </div>

      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0"
          >
            <span className="text-[11px] uppercase tracking-[0.24em] text-muted">
              {row.label}
            </span>
            <span className="truncate text-right text-sm font-medium text-foreground">
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.22em] text-muted">
          <span>Win condition</span>
          <span>{Math.round(progressValue)}%</span>
        </div>
        <div className="h-2 rounded-full bg-accent">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(45,212,191,0.95),rgba(74,222,128,0.95))]"
            style={{ width: `${Math.max(0, Math.min(progressValue, 100))}%` }}
          />
        </div>
        <p className="text-sm leading-6 text-muted">{winCondition}</p>
      </div>

      <button
        type="button"
        onClick={onMint}
        disabled={mintDisabled}
        className={`mt-auto min-h-12 w-full rounded-full border px-5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed ${mintButtonTone} ${
          mintDisabled ? "" : "hover:bg-emerald-400/12"
        }`}
      >
        {mintLabel}
      </button>
    </aside>
  );
}

function InfoCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-[28px] border border-border bg-card/90 p-5 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.45)]">
      <h2 className="text-3xl font-semibold tracking-[-0.05em]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CodeSnippetCard({
  code,
  vulnerabilityActiveLabel,
  vulnerabilityLabel = "Vulnerability",
  vulnerabilityNote,
  vulnerabilityTone = "red",
  vulnerableLines = [],
}: {
  code: string;
  vulnerabilityActiveLabel?: string;
  vulnerabilityLabel?: string;
  vulnerabilityNote?: string;
  vulnerabilityTone?: "cyan" | "red";
  vulnerableLines?: number[];
}) {
  const [showVulnerableCode, setShowVulnerableCode] = useState(false);
  const vulnerableLineSet = useMemo(
    () => new Set(vulnerableLines),
    [vulnerableLines]
  );
  const lines = useMemo(() => code.split("\n"), [code]);
  const hasVulnerableLines = vulnerableLines.length > 0;
  const isRedHighlight = vulnerabilityTone === "red";
  const revealToneClass = isRedHighlight
    ? "border-amber-300/20 bg-amber-300/8 text-amber-200"
    : "border-cyan-300/20 bg-cyan-300/8 text-cyan-200";
  const revealBodyClass = isRedHighlight ? "text-amber-50/78" : "text-cyan-50/78";

  return (
    <section className="overflow-hidden rounded-[28px] border border-border bg-card/90 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
          Code Snippet (lib.rs)
        </p>
        {hasVulnerableLines ? (
          <button
            type="button"
            aria-pressed={showVulnerableCode}
            onClick={() => setShowVulnerableCode((current) => !current)}
            className={`min-h-10 rounded-full border px-4 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              showVulnerableCode
                ? "border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/14"
                : "border-border bg-background/70 text-foreground hover:bg-accent"
            }`}
          >
            {showVulnerableCode
              ? (vulnerabilityActiveLabel ?? "Hide Vulnerable Code")
              : isRedHighlight
                ? "Show Vulnerable Code"
                : "Show Review Notes"}
          </button>
        ) : null}
      </div>
      <div className="overflow-x-auto px-5 py-5">
        {vulnerabilityNote ? (
          <div
            className={`overflow-hidden motion-safe:transition-[max-height,opacity,transform,margin] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none ${
              showVulnerableCode
                ? "mb-4 max-h-40 translate-y-0 opacity-100"
                : "mb-0 max-h-0 -translate-y-1 opacity-0"
            }`}
            aria-hidden={!showVulnerableCode}
          >
            <div className={`rounded-2xl border px-4 py-3 ${revealToneClass}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em]">
                {vulnerabilityLabel}
              </p>
              <p className={`mt-1 text-sm leading-6 ${revealBodyClass}`}>
                {vulnerabilityNote}
              </p>
            </div>
          </div>
        ) : null}
        <pre className="min-w-full font-mono text-[13px] leading-7">
          <code className="block min-w-max">
            {lines.map((line, index) => {
              const lineNumber = index + 1;
              const isVulnerableLine = vulnerableLineSet.has(lineNumber);
              const shouldDimLine =
                showVulnerableCode && hasVulnerableLines && !isVulnerableLine;

              return (
                <span
                  key={`${lineNumber}-${line}`}
                  className={`grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4 rounded-lg border px-3 motion-safe:transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none ${
                    showVulnerableCode && isVulnerableLine
                      ? isRedHighlight
                        ? "border-red-400/30 bg-red-500/10 text-red-100 shadow-[0_0_34px_-22px_rgba(248,113,113,0.95)]"
                        : "border-cyan-300/25 bg-cyan-300/8 text-cyan-100 shadow-[0_0_34px_-22px_rgba(103,232,249,0.75)]"
                      : "border-transparent text-foreground"
                  } ${shouldDimLine ? "opacity-35" : "opacity-100"}`}
                >
                  <span
                    className={`select-none text-right text-[11px] ${
                      showVulnerableCode && isVulnerableLine
                        ? isRedHighlight
                          ? "text-red-200/80"
                          : "text-cyan-100/80"
                        : "text-muted/55"
                    }`}
                    aria-hidden="true"
                  >
                    {lineNumber}
                  </span>
                  <span className="whitespace-pre">
                    {renderRustLine(line, {
                      isDimmed: shouldDimLine,
                      isVulnerable: showVulnerableCode && isVulnerableLine,
                      tone: vulnerabilityTone,
                    })}
                  </span>
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </section>
  );
}

function renderRustLine(
  line: string,
  {
    isDimmed,
    isVulnerable,
    tone,
  }: {
    isDimmed: boolean;
    isVulnerable: boolean;
    tone: "cyan" | "red";
  }
) {
  if (line.trim().length === 0) {
    return "\u00A0";
  }

  if (isDimmed) {
    return <span className="text-muted">{line}</span>;
  }

  if (isVulnerable) {
    return (
      <span className={tone === "red" ? "text-red-100" : "text-cyan-100"}>
        {line}
      </span>
    );
  }

  const commentStart = line.indexOf("//");
  if (commentStart >= 0) {
    const beforeComment = line.slice(0, commentStart);
    const comment = line.slice(commentStart);

    return (
      <>
        {renderRustTokens(beforeComment)}
        <span className="text-emerald-300/70">{comment}</span>
      </>
    );
  }

  return renderRustTokens(line);
}

function renderRustTokens(line: string) {
  const parts = line
    .split(/(#\[[^\]]+\]|b?"[^"]*"|\b[A-Za-z_][A-Za-z0-9_]*\b|\d+)/g)
    .filter(Boolean);

  return parts.map((part, index) => {
    const key = `${part}-${index}`;

    if (/^#\[/.test(part)) {
      return (
        <span key={key} className="text-violet-300">
          {part}
        </span>
      );
    }

    if (/^b?"[^"]*"$/.test(part)) {
      return (
        <span key={key} className="text-emerald-300">
          {part}
        </span>
      );
    }

    if (/^\d+$/.test(part)) {
      return (
        <span key={key} className="text-cyan-200">
          {part}
        </span>
      );
    }

    if (RUST_CODE_KEYWORDS.has(part)) {
      return (
        <span key={key} className="text-[#14f195]">
          {part}
        </span>
      );
    }

    return <span key={key}>{part}</span>;
  });
}

function PlaygroundCommandBar({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-[24px] border border-border bg-card/90 p-3 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.45)] sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1 rounded-[18px] border border-border bg-background/75 px-4 py-3 font-mono text-sm text-foreground">
        <span className="block truncate">{command}</span>
      </div>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(command);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        }}
        className="min-h-12 rounded-[18px] border border-emerald-500/25 bg-emerald-500/15 px-5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {copied ? "Copied" : "Copy playground command"}
      </button>
    </div>
  );
}

function ProfileCertificatesSection({
  address,
  certificateState,
  completedLevels,
  getExplorerUrl,
  isLoading,
  onSelectLevel,
}: {
  address?: string;
  certificateState?: CertificateCollection;
  completedLevels?: boolean[];
  getExplorerUrl: (path: string) => string;
  isLoading: boolean;
  onSelectLevel: (level: LevelId) => void;
}) {
  return (
    <div className="rounded-[34px] border border-border bg-card/95 p-5 shadow-[0_32px_100px_-70px_rgba(0,0,0,0.45)] sm:p-7">
      <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
            Hacker Achievements
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            This gallery shows which level certificates are still locked, which
            ones are claimed on-chain, and which cNFTs have already been minted
            and bound back to the original hacker wallet.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
          <MiniStat
            label="Wallet"
            value={address ? "Attached" : "Detached"}
            detail={address ? compactAddress(address) : "Connect to inspect"}
          />
          <MiniStat
            label="Minted"
            value={
              certificateState
                ? `${Object.values(certificateState).filter((certificate) => certificate.minted).length}/4`
                : "0/4"
            }
            detail="Recorded cNFTs"
          />
          <MiniStat
            label="Cleared"
            value={
              completedLevels
                ? `${completedLevels.filter(Boolean).length}/4`
                : "0/4"
            }
            detail="Challenge progress"
          />
        </div>
      </div>

      {!address ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-border bg-background/60 px-6 py-10 text-center">
          <p className="text-base font-medium tracking-[-0.03em] text-foreground">
            Connect a wallet to inspect your SolBreach profile.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            The certificate gallery is derived from the same wallet-bound PDAs
            used by the exploit board and cNFT mint flow.
          </p>
        </div>
      ) : isLoading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {LEVEL_NUMBERS.map((level) => (
            <SkeletonLine key={level} className="h-[360px]" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {LEVEL_NUMBERS.map((level) => (
            <CertificateCard
              key={level}
              certificate={certificateState?.[level]}
              completed={Boolean(completedLevels?.[level])}
              detail={LEVEL_CERTIFICATE_DETAILS[level]}
              getExplorerUrl={getExplorerUrl}
              onOpenLevel={() => {
                onSelectLevel(`level${level}` as LevelId);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CertificateCard({
  certificate,
  completed,
  detail,
  getExplorerUrl,
  onOpenLevel,
}: {
  certificate?: LevelCertificateSnapshot;
  completed: boolean;
  detail: CertificateDetails;
  getExplorerUrl: (path: string) => string;
  onOpenLevel: () => void;
}) {
  const status = certificate?.minted
    ? "Minted"
    : certificate?.exists
      ? "Claimed"
      : completed
        ? "Ready to mint"
        : "Locked";

  const statusTone = certificate?.minted
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : certificate?.exists
      ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : completed
        ? "border-foreground/15 bg-foreground/5 text-foreground"
        : "border-border bg-accent text-muted";
  const imageSrc =
    completed || !detail.lockedImage ? detail.image : detail.lockedImage;

  return (
    <article className="overflow-hidden rounded-[28px] border border-border bg-background/80">
      <div className="relative aspect-[4/5] border-b border-border bg-card/70">
        <Image
          src={imageSrc}
          alt={`${detail.title} certificate art`}
          fill
          className="object-cover"
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 45vw, 92vw"
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4">
          <span className="rounded-full border border-black/10 bg-background/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted shadow-sm backdrop-blur">
            {detail.levelLabel}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] backdrop-blur ${statusTone}`}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
            Certification
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em]">
            {detail.title}
          </h3>
        </div>

        <div className="space-y-3 rounded-[22px] border border-border bg-card/75 p-4">
          <StatusTextRow
            label="Completion"
            value={completed ? "Cleared" : "Not cleared"}
          />
          <StatusTextRow
            label="Certificate"
            value={certificate?.exists ? "Claimed on-chain" : "Not claimed"}
          />
          <StatusTextRow
            label="Asset"
            value={
              certificate?.minted && certificate.assetId
                ? compactAddress(certificate.assetId, 4, 4)
                : "Not minted"
            }
          />
        </div>

        <div className="space-y-2 text-sm text-muted">
          {certificate?.minted && certificate.assetId ? (
            <a
              href={getExplorerUrl(`/address/${certificate.assetId}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate underline underline-offset-2"
            >
              View cNFT asset
            </a>
          ) : null}
          {certificate?.certificatePda ? (
            <a
              href={getExplorerUrl(`/address/${certificate.certificatePda}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate underline underline-offset-2"
            >
              View certificate PDA
            </a>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onOpenLevel}
          className="min-h-12 w-full rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {certificate?.minted
            ? "Open level details"
            : completed
              ? "Open mint flow"
              : "Open level"}
        </button>
      </div>
    </article>
  );
}

function MiniStat({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-border bg-background/70 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold tracking-[-0.03em]">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}

function statusLabel(status: LevelStatus) {
  switch (status) {
    case "ready":
      return "Ready";
    case "live":
      return "Live";
    case "cleared":
      return "Cleared";
    case "armed":
      return "Armed";
    case "mint":
      return "Mint";
    case "locked":
      return "Locked";
  }
}
