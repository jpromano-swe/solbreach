"use client";

import Image from "next/image";
import {
  useCallback,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import {
  address as toAddress,
  isAddress,
  type Address,
  type Instruction,
} from "@solana/kit";
import { PublicKey as Web3PublicKey } from "@solana/web3.js";
import {
  ArrowRight,
  ChevronDown,
  Cpu,
  FileCode2,
  LockKeyhole,
  Send,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";
import { GridBackground } from "./components/grid-background";
import { ClusterSelect } from "./components/cluster-select";
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

type StepState = "idle" | "active" | "done";

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

type CourseMenuItem = {
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  target?: LevelsView;
  title: string;
};

type CourseMenuSection = {
  items: CourseMenuItem[];
  title: string;
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
const VULNERABILITY_MENU_SECTIONS: CourseMenuSection[] = [
  {
    title: "Application Level",
    items: [
      {
        icon: FileCode2,
        target: "level1",
        title: "The Illusionist",
        description: "Unchecked account validation and forged deposits",
      },
      {
        icon: ShieldCheck,
        target: "level2",
        title: "Identity Thief",
        description: "Static PDA seeds and shared profile authority",
      },
      {
        icon: Zap,
        target: "level3",
        title: "Trojan Horse",
        description: "Arbitrary CPI and delegated signer abuse",
      },
    ],
  },
  {
    title: "Supply Chain",
    items: [
      {
        icon: Cpu,
        title: "Dependency Takeover",
        description: "Malicious packages in build and deploy paths",
      },
      {
        icon: Sparkles,
        title: "CI Secret Exposure",
        description: "Leaked keys, tokens, and release credentials",
      },
      {
        icon: ShieldCheck,
        title: "Build Integrity",
        description: "Reproducible artifacts and trusted signers",
      },
    ],
  },
  {
    title: "Client and Wallet Side",
    items: [
      {
        icon: Send,
        title: "Transaction Spoofing",
        description: "Misleading prompts and unsafe message construction",
      },
      {
        icon: LockKeyhole,
        title: "Approval Drains",
        description: "Persistent permissions and hidden token movement",
      },
      {
        icon: Cpu,
        title: "Frontend Injection",
        description: "Compromised clients that rewrite wallet intent",
      },
    ],
  },
];

const CASE_STUDY_MENU_SECTIONS: CourseMenuSection[] = [
  {
    title: "Latest Incidents",
    items: [
      {
        icon: ShieldCheck,
        title: "Drift Protocol",
        description: "Apr 2026: durable nonce and governance takeover",
      },
      {
        icon: LockKeyhole,
        title: "Step Finance",
        description: "Jan 2026: executive device and treasury compromise",
      },
      {
        icon: FileCode2,
        title: "Loopscale",
        description: "Apr 2025: pricing mechanism manipulation",
      },
    ],
  },
];

const CASE_STUDIES = [
  {
    protocol: "Drift Protocol",
    amount: "$285M",
    date: "Apr 1, 2026",
    summary:
      "Attackers used social engineering and durable nonce transactions to gain unauthorized control over Drift Security Council powers, then executed a rapid governance takeover that drained protocol funds.",
    tags: [
      "Durable nonce",
      "Governance control",
      "Multisig hygiene",
      "Privileged access",
      "Social engineering",
    ],
  },
  {
    protocol: "Step Finance",
    amount: "$40M",
    date: "Jan 31, 2026",
    summary:
      "Compromised executive devices were used to access operational systems and drain the Step Finance treasury, showing how endpoint security and treasury authorization controls are part of protocol security.",
    tags: [
      "Device compromise",
      "Treasury controls",
      "Key management",
      "Operational security",
      "Incident response",
    ],
  },
  {
    protocol: "Loopscale",
    amount: "$5.8M",
    date: "Apr 26, 2025",
    summary:
      "The attacker exploited a flaw in lending market pricing and collateral validation, taking out undercollateralized loans that siphoned USDC and SOL from Loopscale vaults shortly after launch.",
    tags: [
      "Collateral pricing",
      "Oracle validation",
      "Market risk",
      "Undercollateralized loans",
      "Vault safety",
    ],
  },
];

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
            <section className="space-y-10">
              <div className="max-w-3xl space-y-4">
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#14f195]">
                  Case Studies
                </p>
                <h1 className="text-5xl font-semibold tracking-[-0.08em] sm:text-6xl">
                  Learn from real Solana incidents.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
                  Study protocol failures as security workflows: what broke,
                  how much was at risk, and which topics map back to the
                  lectures.
                </p>
              </div>

              <div className="divide-y divide-border rounded-[28px] border border-border bg-card/70 shadow-[0_24px_90px_-70px_rgba(0,0,0,0.9)]">
                {CASE_STUDIES.map((caseStudy) => (
                  <article
                    key={caseStudy.protocol}
                    className="grid gap-6 p-6 lg:grid-cols-[0.72fr_1.28fr]"
                  >
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted">
                        {caseStudy.date}
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                        {caseStudy.protocol}
                      </h2>
                      <p className="mt-4 flex items-baseline gap-2">
                        <span className="text-5xl font-semibold tracking-[-0.07em] text-red-500 drop-shadow-[0_0_26px_rgba(239,68,68,0.24)]">
                          {caseStudy.amount}
                        </span>
                        <span className="text-2xl font-semibold tracking-[-0.04em] text-foreground">
                          affected
                        </span>
                      </p>
                    </div>

                    <div className="space-y-5">
                      <p className="text-sm leading-7 text-muted sm:text-base">
                        {caseStudy.summary}
                      </p>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex flex-wrap gap-2">
                          {caseStudy.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs font-medium text-muted"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          disabled
                          className="inline-flex min-h-11 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-border bg-muted/20 px-4 text-sm font-medium text-muted/55"
                        >
                          Start Level
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
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

        <footer className="border-t border-border/70">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6 md:flex-row">
            <p>Build for Solana by ZirconDioxide.</p>
            <div className="flex items-center gap-2">
              <a
                href="https://x.com/solbreach_app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card/70 px-4 transition hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Open SolBreach on X"
              >
                <XIcon />
                <span>Twitter</span>
              </a>
              <a
                href={SOLBREACH_REPOSITORY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card/70 px-4 transition hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Open SolBreach GitHub repository"
              >
                <GitHubIcon />
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function HeaderNavButton({
  active,
  disabled = false,
  label,
  locked = false,
  onClick,
  variant = "header",
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  locked?: boolean;
  onClick: () => void;
  variant?: "header" | "subtle";
}) {
  const isSubtle = variant === "subtle";
  const disabledClass =
    "cursor-not-allowed border border-border/60 bg-muted/20 text-muted/55";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        disabled
          ? disabledClass
          : isSubtle
            ? active
              ? "bg-emerald-400/6 text-foreground shadow-[inset_0_0_0_1px_rgba(74,222,128,0.2)]"
              : "text-muted hover:text-foreground"
            : active
              ? "bg-emerald-400/6 text-foreground shadow-[inset_0_0_0_1px_rgba(74,222,128,0.2)]"
              : "text-muted hover:bg-accent hover:text-foreground"
      }`}
    >
      {locked ? <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {label}
    </button>
  );
}

type CourseMenuKey = "vulnerabilities" | "case-studies";

const COURSE_MENU_ORDER: Record<CourseMenuKey, number> = {
  vulnerabilities: 0,
  "case-studies": 1,
};

function HeaderCourseNav({
  onSelectCaseStudies,
  onSelectLevel,
}: {
  onSelectCaseStudies: () => void;
  onSelectLevel: (level: LevelsView) => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] =
    useState<CourseMenuKey>("vulnerabilities");

  const openCourseMenu = useCallback(
    (nextMenu: CourseMenuKey) => {
      setActiveMenu(nextMenu);
      setIsMenuOpen(true);
    },
    []
  );

  return (
    <nav
      aria-label="Course sections"
      className="relative flex flex-wrap items-center justify-center gap-3 motion-safe:animate-[headerNavFade_180ms_ease-out]"
      onMouseLeave={() => setIsMenuOpen(false)}
    >
      <HeaderMenuTrigger
        label="Vulnerabilities"
        open={isMenuOpen && activeMenu === "vulnerabilities"}
        onClick={() => {
          setActiveMenu("vulnerabilities");
          setIsMenuOpen(
            !(isMenuOpen && activeMenu === "vulnerabilities")
          );
        }}
        onMouseEnter={() => openCourseMenu("vulnerabilities")}
      />
      <HeaderMenuTrigger
        label="Case Studies"
        open={isMenuOpen && activeMenu === "case-studies"}
        onClick={() => {
          setActiveMenu("case-studies");
          setIsMenuOpen(!(isMenuOpen && activeMenu === "case-studies"));
        }}
        onMouseEnter={() => openCourseMenu("case-studies")}
      />
      <HeaderNavButton
        active={false}
        disabled
        label="Review Rooms"
        locked
        onClick={() => undefined}
      />

      <div
        className={`absolute left-0 right-0 top-full h-4 ${
          isMenuOpen ? "block" : "hidden"
        }`}
        aria-hidden="true"
      />

      <div
        className={`absolute left-1/2 top-[calc(100%+0.35rem)] z-40 w-[min(calc(100vw-2rem),860px)] -translate-x-1/2 rounded-[22px] border border-border bg-card/98 p-2 shadow-[0_28px_90px_-54px_rgba(0,0,0,0.9)] backdrop-blur-xl motion-safe:transition-[opacity,transform] motion-safe:duration-150 motion-safe:ease-out motion-reduce:transition-none ${
          isMenuOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
        onMouseEnter={() => setIsMenuOpen(true)}
      >
        <div className="relative overflow-hidden">
          <div
            className="grid w-[200%] grid-cols-2 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-in-out motion-reduce:transition-none"
            style={{
              transform: `translateX(-${COURSE_MENU_ORDER[activeMenu] * 50}%)`,
            }}
          >
            <CourseMenuContent
              menu="vulnerabilities"
              onClose={() => setIsMenuOpen(false)}
              onSelectCaseStudies={onSelectCaseStudies}
              onSelectLevel={onSelectLevel}
              sections={VULNERABILITY_MENU_SECTIONS}
            />
            <CourseMenuContent
              menu="case-studies"
              onClose={() => setIsMenuOpen(false)}
              onSelectCaseStudies={onSelectCaseStudies}
              onSelectLevel={onSelectLevel}
              sections={CASE_STUDY_MENU_SECTIONS}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}

function CourseMenuContent({
  menu,
  onClose,
  onSelectCaseStudies,
  onSelectLevel,
  sections,
}: {
  menu: CourseMenuKey;
  onClose: () => void;
  onSelectCaseStudies: () => void;
  onSelectLevel: (level: LevelsView) => void;
  sections: CourseMenuSection[];
}) {
  return (
    <div
      className={`grid min-w-0 ${
        sections.length === 3 ? "lg:grid-cols-3" : "md:grid-cols-2"
      }`}
    >
      {sections.map((section, sectionIndex) => (
        <div
          key={section.title}
          className={`p-4 ${
            sectionIndex > 0
              ? "border-t border-border md:border-l md:border-t-0"
              : ""
          }`}
        >
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            {section.title}
          </p>
          <div className="space-y-2">
            {section.items.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    if (menu === "case-studies") {
                      onSelectCaseStudies();
                    } else if (item.target) {
                      onSelectLevel(item.target);
                    }

                    onClose();
                  }}
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm">
                    <Icon className="h-4 w-4" aria-hidden={true} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted">
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {menu === "case-studies" ? (
        <div className="border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={() => {
              onSelectCaseStudies();
              onClose();
            }}
            className="group inline-flex min-h-11 w-full items-center justify-between rounded-xl px-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span>Show all case studies</span>
            <ArrowRight
              className="h-4 w-4 text-muted motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:group-hover:translate-x-1"
              aria-hidden="true"
            />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function HeaderMenuTrigger({
  label,
  onClick,
  onMouseEnter,
  open,
}: {
  label: string;
  onClick: () => void;
  onMouseEnter: () => void;
  open: boolean;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        open
          ? "bg-foreground/5 text-foreground"
          : "text-muted hover:bg-foreground/5 hover:text-foreground"
      }`}
    >
      {label}
      <ChevronDown
        className={`h-3.5 w-3.5 opacity-70 transition-transform ${
          open ? "rotate-180" : ""
        }`}
        aria-hidden="true"
      />
    </button>
  );
}

function LandingPageSection({ onPlayNow }: { onPlayNow: () => void }) {
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const heroSlides = [
    {
      code: `#[derive(Accounts)]
pub struct DepositTokens<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}`,
      highlightedLines: [6, 7],
      label: "Vulnerabilities",
      panel: <HeroMissionStatusCard />,
      title: "levels/01-illusionist/lib.rs",
    },
    {
      code: `pub fn execute_security_council_action(ctx: Context<AdminAction>) -> Result<()> {
    require!(ctx.accounts.council.threshold >= 2, ErrorCode::Quorum);

    let action = ctx.accounts.pending_action.load()?;
    action.execute_without_timelock()?;

    ctx.accounts.market.update_oracle(action.oracle)?;
    ctx.accounts.market.enable_collateral(action.mint)?;

    Ok(())
}`,
      highlightedLines: [4, 6, 7],
      label: "Case Studies",
      panel: <HeroCaseStudyPanel />,
      title: "case-study/drift-governance.rs",
    },
    {
      code: `pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    require!(vault.balance >= amount, ErrorCode::InsufficientFunds);

    vault.balance -= amount;
    transfer_to_user(ctx.accounts.user.key(), amount)?;

    Ok(())
}`,
      highlightedLines: [4, 6, 7],
      label: "Reviews",
      panel: <HeroReviewRoomPanel />,
      title: "review-room/finding-target.rs",
    },
  ];

  return (
    <section className="space-y-10">
      <div className="mx-auto max-w-4xl space-y-7 text-center">
        <h1 className="mx-auto max-w-4xl text-5xl font-semibold tracking-[-0.08em] sm:text-6xl lg:text-7xl">
          Master Solana Programs{" "}
          <span className="text-[#14f195] drop-shadow-[0_0_28px_rgba(20,241,149,0.22)]">
            Security
          </span>
          .
        </h1>
        <p className="mx-auto max-w-3xl text-base leading-8 text-muted sm:text-lg">
          Hands-on solana programs security wargame. Exploit real
          vulnerabilities, learn from past hacks, participate on review training
          and earn verifiable certifications.
        </p>

        <button
          type="button"
          onClick={onPlayNow}
          className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-6 text-sm font-medium text-white shadow-[0_18px_50px_-24px_rgba(153,69,255,0.9)] transition-colors hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Play now
          <ArrowRight
            className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1"
            aria-hidden="true"
          />
        </button>
      </div>

      <HeroProductCarousel
        activeSlide={activeHeroSlide}
        onSelectSlide={setActiveHeroSlide}
        slides={heroSlides}
      />

      <div className="max-w-3xl text-left">
        <h2
          id="feature-showcase-title"
          className="text-4xl font-semibold tracking-[-0.06em] sm:text-5xl"
        >
          Exploit, analyze, and report
        </h2>
        <p className="mt-4 text-base leading-7 text-muted sm:text-lg">
          Train the fundamentals of security workflow on Solana
        </p>
      </div>

      <FeatureShowcaseSection />
      <LandingCtaSection onGetStarted={onPlayNow} />
    </section>
  );
}

function LandingCtaSection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="grid items-center gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="flex min-h-[360px] items-center justify-center">
        <Image
          src="/solana_logo_nobg.png"
          alt="Solana logo"
          width={1254}
          height={1254}
          className="h-auto w-[min(76%,360px)] drop-shadow-[0_32px_80px_rgba(20,241,149,0.18)]"
          priority={false}
        />
      </div>

      <div className="max-w-xl lg:ml-auto">
        <h2 className="text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
          Start your Solana security researcher journey today
        </h2>
        <p className="mt-5 text-base leading-7 text-muted sm:text-lg">
          Open the wargame, inspect vulnerable programs, complete on-chain
          objectives, and turn each exploit into review-ready proof.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onGetStarted}
            className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-6 text-sm font-medium text-white shadow-[0_18px_50px_-24px_rgba(153,69,255,0.9)] transition-colors hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Get Started
            <ArrowRight
              className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1"
              aria-hidden="true"
            />
          </button>
          <a
            href={SOLBREACH_REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-card/80 px-6 text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Read Docs
          </a>
        </div>
      </div>
    </section>
  );
}

function HeroProductCarousel({
  activeSlide,
  onSelectSlide,
  slides,
}: {
  activeSlide: number;
  onSelectSlide: (index: number) => void;
  slides: Array<{
    code: string;
    highlightedLines: number[];
    label: string;
    panel: React.ReactNode;
    title: string;
  }>;
}) {
  return (
    <section
      className="relative overflow-hidden bg-transparent"
      aria-label="SolBreach product preview"
    >
      <div className="relative min-h-[560px] overflow-hidden lg:min-h-[620px]">
        <div className="absolute inset-x-4 bottom-16 top-5 [mask-image:linear-gradient(to_bottom,black_0%,black_76%,transparent_100%)] sm:inset-x-7">
          {slides.map((slide, index) => (
            <div
              key={slide.label}
              className={`absolute inset-0 motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none ${
                activeSlide === index
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-3 opacity-0"
              }`}
              aria-hidden={activeSlide !== index}
            >
              <HeroComposedSlide
                code={slide.code}
                highlightedLines={slide.highlightedLines}
                panel={slide.panel}
                title={slide.title}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-5 z-10 flex justify-center">
        <div className="flex items-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.label}
              type="button"
              aria-label={`Show ${slide.label} preview`}
              aria-pressed={activeSlide === index}
              onClick={() => onSelectSlide(index)}
              className={`h-2.5 rounded-full motion-safe:transition-[width,background-color,opacity] motion-safe:duration-150 motion-safe:ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                activeSlide === index
                  ? "w-8 bg-[#14f195]"
                  : "w-2.5 bg-muted/45 hover:bg-muted/70"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroComposedSlide({
  code,
  highlightedLines,
  panel,
  title,
}: {
  code: string;
  highlightedLines: number[];
  panel: React.ReactNode;
  title: string;
}) {
  return (
    <div className="relative h-full min-h-[500px] pt-4 sm:pt-8">
      <HeroCodeWindow
        className="h-[430px] w-full lg:h-[500px]"
        code={code}
        highlightedLines={highlightedLines}
        title={title}
      />
      <div className="relative z-10 mx-auto -mt-24 w-[min(96%,500px)] sm:-mt-36 lg:absolute lg:right-0 lg:top-0 lg:mx-0 lg:mt-0 lg:w-[500px]">
        {panel}
      </div>
    </div>
  );
}

function HeroCaseStudyPanel() {
  return (
    <div className="space-y-3">
      <div className="rounded-[24px] border border-border bg-card/95 p-5 shadow-[0_30px_90px_-48px_rgba(0,0,0,0.9)]">
        <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
              Case study review
            </p>
            <h3 className="mt-3 text-xl font-semibold tracking-[-0.05em]">
              Drift durable nonce takeover
            </h3>
          </div>
          <span className="w-fit rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-100">
            Critical
          </span>
        </div>

        <div className="mt-5 space-y-3 text-sm leading-6 text-muted">
          <p>
            Public reports describe a durable-nonce and social-engineering
            attack that led to a rapid Security Council administrative takeover.
          </p>
          <p>
            Review focus: signer policy, transaction freshness, admin scope, and
            missing timelock controls.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 lg:flex-nowrap">
          <HeroMetric label="Date" value="Apr 1, 2026" />
          <HeroMetric label="Loss" value="$285M" />
          <HeroMetric label="Class" value="Governance" />
        </div>

        <div className="mt-5 rounded-[18px] border border-border bg-background/80 p-4">
          <p className="text-[11px] uppercase tracking-[0.26em] text-muted">
            Reviewer checklist
          </p>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <ChecklistItem text="Can stale pre-signed governance transactions execute after context changes?" />
            <ChecklistItem text="Can two signers authorize critical admin powers without delay?" />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroReviewRoomPanel() {
  return (
    <div className="space-y-3">
      <div className="rounded-[24px] border border-border bg-card/95 p-5 shadow-[0_30px_90px_-48px_rgba(0,0,0,0.9)]">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
          Review room
        </p>
        <div className="mt-5 space-y-4">
          <HeroReviewField label="Title" value="Unchecked CPI target" />
          <HeroReviewField
            label="Summary"
            value="The program lets users choose the CPI target, allowing malicious instructions to run with delegated authority."
          />
          <div className="flex flex-wrap gap-2 lg:flex-nowrap">
            <HeroMetric label="Severity" value="High" tone="red" />
            <HeroMetric label="Impact" value="Medium" tone="amber" />
            <HeroMetric label="Likelihood" value="Low" tone="cyan" />
          </div>
          <HeroReviewField
            label="Recommendation"
            value="Allowlist trusted program IDs and validate CPI accounts before forwarding signer privileges."
          />

          <button
            type="button"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-5 text-sm font-medium text-white transition hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Send review
          </button>
        </div>
      </div>
    </div>
  );
}

function HeroMissionStatusCard() {
  return (
    <div className="rounded-[24px] border border-border bg-card/95 p-5 shadow-[0_30px_90px_-48px_rgba(0,0,0,0.9)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
            Mission Status
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.05em]">
            Level 1
          </p>
        </div>
        <StatusChip>Armed</StatusChip>
      </div>

      <div className="mt-5 space-y-3">
        <HeroStatusRow label="Cluster" value="devnet" />
        <HeroStatusRow label="Wallet" value="9xQe...1b2C" />
        <HeroStatusRow label="PDA state" value="Live" />
        <HeroStatusRow label="Win condition" value="Ledger forged" />
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.22em] text-muted">
          <span>Completion</span>
          <span>100%</span>
        </div>
        <div className="h-2 rounded-full bg-accent">
          <div className="h-full w-full rounded-full bg-[linear-gradient(90deg,rgba(153,69,255,0.95),rgba(20,241,149,0.95))]" />
        </div>
        <p className="text-sm leading-6 text-muted">
          Exploit objective verified. Wallet-bound certification is ready.
        </p>
      </div>

      <button
        type="button"
        className="mt-6 min-h-12 w-full rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-5 text-sm font-medium text-white transition hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Mint certification
      </button>
    </div>
  );
}

function HeroCodeWindow({
  className = "",
  code,
  highlightedLines,
  title,
}: {
  className?: string;
  code: string;
  highlightedLines?: number[];
  title: string;
}) {
  const highlightedLineSet = new Set(highlightedLines ?? []);
  const lines = code.split("\n");

  return (
    <div
      className={`overflow-hidden rounded-[24px] border border-border bg-card/92 shadow-[0_32px_90px_-58px_rgba(0,0,0,0.88)] ${className}`}
    >
      <div className="flex min-h-12 items-center gap-3 border-b border-border bg-accent/70 px-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full border border-border bg-background" />
          <span className="h-2.5 w-2.5 rounded-full border border-border bg-background" />
          <span className="h-2.5 w-2.5 rounded-full border border-border bg-background" />
        </div>
        <span className="min-w-0 truncate text-xs text-muted">{title}</span>
      </div>
      <pre className="overflow-x-auto px-4 py-4 font-mono text-[12px] leading-6 [mask-image:linear-gradient(to_right,black_0%,black_48%,transparent_68%)]">
        <code className="block min-w-max">
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            const isHighlighted = highlightedLineSet.has(lineNumber);

            return (
              <span
                key={`${title}-${lineNumber}-${line}`}
                className={`grid grid-cols-[2rem_minmax(0,1fr)] gap-4 rounded-md px-2 ${
                  isHighlighted
                    ? "border border-red-400/25 bg-red-500/10 text-red-100"
                    : "border border-transparent text-foreground"
                }`}
              >
                <span className="select-none text-right text-[11px] text-muted/55">
                  {lineNumber}
                </span>
                <span className="whitespace-pre">
                  {renderRustLine(line, {
                    isDimmed: false,
                    isVulnerable: false,
                    tone: "red",
                  })}
                </span>
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}

function HeroMetric({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "amber" | "cyan" | "default" | "red";
  value: string;
}) {
  const toneClass =
    tone === "red"
      ? "border-red-400/20 bg-red-500/12 text-red-100"
      : tone === "amber"
        ? "border-amber-300/20 bg-amber-300/12 text-amber-100"
        : tone === "cyan"
          ? "border-cyan-300/20 bg-cyan-300/12 text-cyan-100"
          : "border-border bg-background/80 text-foreground";

  return (
    <div className="flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted">
      <span className="whitespace-nowrap">{label}</span>
      <span
        className={`whitespace-nowrap rounded-full border px-2.5 py-1.5 text-xs font-semibold normal-case tracking-normal ${toneClass}`}
      >
        {value}
      </span>
    </div>
  );
}

function HeroReviewField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.26em] text-muted">
        {label}
      </span>
      <span className="mt-2 block rounded-[16px] border border-border bg-background/80 px-4 py-3 text-sm text-foreground">
        {value}
      </span>
    </label>
  );
}

function HeroStatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <span className="text-[11px] uppercase tracking-[0.24em] text-muted">
        {label}
      </span>
      <span className="truncate text-right text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

function FeatureShowcaseSection() {
  return (
    <section
      className="relative overflow-hidden bg-background/80 shadow-[0_36px_120px_-90px_rgba(20,241,149,0.45),0_28px_100px_-90px_rgba(153,69,255,0.55)]"
      aria-labelledby="feature-showcase-title"
      style={{
        backgroundImage: [
          "radial-gradient(ellipse 42% 42% at 12% 12%, rgba(153,69,255,0.10), transparent 72%)",
          "radial-gradient(ellipse 42% 42% at 88% 18%, rgba(20,241,149,0.08), transparent 72%)",
        ].join(", "),
      }}
    >
      <div className="grid divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <FeaturePreview
          tint="purple"
          title="Exploit Foundations"
          description="Interact with vulnerable devnet programs, complete exploit objectives, and unlock wallet-bound certifications."
        >
          <ExploitFoundationsPreview />
        </FeaturePreview>
        <FeaturePreview
          tint="green"
          title="Security Case Studies"
          description="Study vulnerable and secure implementations side-by-side while tracing real-world Solana bug patterns."
        >
          <SecurityCaseStudyPreview />
        </FeaturePreview>
        <FeaturePreview
          tint="mixed"
          title="Arena & Reviewer Training"
          description="Practice professional findings and team review rooms built for onboarding, assessment, and readiness."
        >
          <ArenaTrainingPreview />
        </FeaturePreview>
      </div>

      <div className="grid divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-6">
        <FeatureMiniItem
          icon={<Zap className="h-4 w-4" aria-hidden="true" />}
          tint="purple"
          title="Real Vulnerable Programs"
          body="Intentionally vulnerable Solana programs deployed on devnet."
        />
        <FeatureMiniItem
          icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          tint="green"
          title="Exploit Verification"
          body="On-chain objectives with wallet-bound certifications."
        />
        <FeatureMiniItem
          icon={<FileCode2 className="h-4 w-4" aria-hidden="true" />}
          tint="purple"
          title="Secure Comparisons"
          body="Insecure implementations beside patched versions."
        />
        <FeatureMiniItem
          icon={<LockKeyhole className="h-4 w-4" aria-hidden="true" />}
          tint="green"
          title="Bug Patterns"
          body="Arbitrary CPI, PDA misuse, signer confusion, and authority bugs."
        />
        <FeatureMiniItem
          icon={<Cpu className="h-4 w-4" aria-hidden="true" />}
          tint="purple"
          title="Security Writeups"
          body="Severity, exploit reasoning, impact, and remediation practice."
        />
        <FeatureMiniItem
          icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
          tint="green"
          title="Review Rooms"
          body="Challenge environments for first-flights, and review writeup training."
        />
      </div>
    </section>
  );
}

function FeaturePreview({
  children,
  description,
  tint,
  title,
}: {
  children: React.ReactNode;
  description: string;
  tint: "green" | "mixed" | "purple";
  title: string;
}) {
  const tintClass =
    tint === "purple"
      ? "bg-[radial-gradient(ellipse_70%_42%_at_50%_0%,rgba(153,69,255,0.10),transparent_72%)]"
      : tint === "green"
        ? "bg-[radial-gradient(ellipse_70%_42%_at_50%_0%,rgba(20,241,149,0.08),transparent_72%)]"
        : "bg-[radial-gradient(ellipse_70%_42%_at_30%_0%,rgba(153,69,255,0.08),transparent_70%),radial-gradient(ellipse_70%_42%_at_70%_0%,rgba(20,241,149,0.07),transparent_70%)]";

  return (
    <article
      className={`flex min-h-[520px] flex-col items-center justify-between px-6 py-12 text-center sm:px-8 ${tintClass}`}
    >
      <div className="flex min-h-[300px] w-full items-start justify-center">
        {children}
      </div>
      <div className="mt-10 max-w-sm">
        <h3 className="text-base font-semibold tracking-[-0.02em] text-foreground">
          {title}
        </h3>
        <p className="mt-4 text-sm leading-6 text-muted sm:text-base sm:leading-7">
          {description}
        </p>
      </div>
    </article>
  );
}

function FeatureMiniItem({
  body,
  icon,
  tint,
  title,
}: {
  body: string;
  icon: React.ReactNode;
  tint: "green" | "purple";
  title: string;
}) {
  const tintClass =
    tint === "purple"
      ? "text-[#b184ff] bg-[linear-gradient(180deg,rgba(153,69,255,0.045),transparent)]"
      : "text-[#14f195] bg-[linear-gradient(180deg,rgba(20,241,149,0.04),transparent)]";

  return (
    <article className={`px-5 py-7 text-left ${tintClass}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        <h3>{title}</h3>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">{body}</p>
    </article>
  );
}

function ExploitFoundationsPreview() {
  return (
    <div className="relative h-[300px] w-full max-w-[340px]">
      <div className="absolute inset-x-0 top-0 overflow-hidden rounded-[24px] border border-border bg-card p-7 text-left shadow-[0_18px_60px_-45px_rgba(0,0,0,0.5)] [mask-image:linear-gradient(to_bottom,black_0%,black_54%,transparent_100%)]">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background">
              <Zap className="h-4 w-4 text-foreground" aria-hidden="true" />
            </div>
            <p className="mt-7 text-xs font-medium text-muted">CERTIFICATIONS</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              4 exploits
            </p>
            <p className="mt-1 text-xs text-muted">2 certified</p>
          </div>
          <div className="rounded-md border border-border bg-background p-3 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
              <span className="h-1.5 w-14 rounded-full bg-muted/20" />
            </div>
            <div className="space-y-2">
              <span className="block h-1.5 w-14 rounded-full bg-muted/20" />
              <span className="block h-1.5 w-10 rounded-full bg-muted/20" />
              <span className="block h-1.5 w-12 rounded-full bg-muted/20" />
            </div>
            <ShieldCheck
              className="ml-auto mt-4 h-3.5 w-3.5 text-foreground"
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="mt-7 grid grid-cols-[72px_1fr] gap-y-3 text-sm text-muted">
          <span>Setup</span>
          <span className="mt-1 h-2 w-20 rounded-full bg-muted/15" />
          <span>Verify</span>
          <span className="mt-1 h-2 w-28 rounded-full bg-muted/15" />
          <span>Mint</span>
          <span className="mt-1 h-2 w-16 rounded-full bg-muted/15" />
        </div>
      </div>
    </div>
  );
}

function SecurityCaseStudyPreview() {
  return (
    <div className="flex h-[275px] w-full max-w-[360px] flex-col overflow-hidden rounded-[18px] border border-border bg-card shadow-[0_24px_70px_-48px_rgba(0,0,0,0.55)]">
      <div className="flex items-center gap-2 bg-accent px-6 py-4 text-left text-sm font-medium text-foreground">
        <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
        Drift Protocol Hack April 2026
      </div>
      <div className="grid flex-1 gap-3 p-6 sm:grid-cols-2">
        <CodeComparisonPanel
          title="Vulnerable"
          lines={["unchecked CPI", "static PDA", "missing signer"]}
        />
        <CodeComparisonPanel
          title="Patched"
          lines={["program guard", "user seeds", "authority check"]}
        />
      </div>
    </div>
  );
}

function CodeComparisonPanel({
  lines,
  title,
}: {
  lines: string[];
  title: string;
}) {
  return (
    <div className="flex min-h-[170px] flex-col justify-center rounded-lg border border-border bg-background p-5 text-left">
      <p className="text-xs font-medium text-foreground">{title}</p>
      <div className="mt-5 space-y-2.5 font-mono text-[11px] leading-5 text-muted">
        {lines.map((line) => (
          <div key={line} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-muted/30" />
            <span>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArenaTrainingPreview() {
  return (
    <div className="flex h-[275px] w-full max-w-[360px] flex-col overflow-hidden rounded-[18px] border border-border bg-card text-left shadow-[0_24px_70px_-48px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between border-b border-border bg-accent px-6 py-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Breach Room
        </div>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground">
          Live
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-4 p-6">
        <div className="min-h-[128px] rounded-lg border border-border bg-background p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
            <Send className="h-4 w-4" aria-hidden="true" />
            Sending review
          </div>
          <div className="space-y-2">
            <span className="block h-1.5 w-40 rounded-full bg-muted/20" />
            <span className="block h-1.5 w-28 rounded-full bg-muted/20" />
            <span className="block h-1.5 w-36 rounded-full bg-muted/20" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-medium text-muted">
          <span className="rounded-md border border-border bg-background px-2 py-2">
            Severity
          </span>
          <span className="rounded-md border border-border bg-background px-2 py-2">
            Impact
          </span>
          <span className="rounded-md border border-border bg-background px-2 py-2">
            Likelihood
          </span>
        </div>
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

export function Level0Panel({
  address,
  certificate,
  copied,
  getExplorerUrl,
  handleAirdrop,
  isLevel0Loading,
  isMinting,
  isSending,
  level0Error,
  level0State,
  onCopy,
  onMint,
  progressValue,
  stage,
  stepStates,
  status,
}: {
  address?: string;
  certificate?: LevelCertificateSnapshot;
  copied: string | null;
  getExplorerUrl: (path: string) => string;
  handleAirdrop: () => Promise<void>;
  isLevel0Loading: boolean;
  isMinting: boolean;
  isSending: boolean;
  level0Error: unknown;
  level0State?: Level0Snapshot;
  onCopy: (label: string, value: string) => Promise<void>;
  onMint: () => Promise<void>;
  progressValue: number;
  stage: StageConfig;
  stepStates: [StepState, StepState, StepState];
  status: string;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_360px]">
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          <MiniBlock
            label="Registry"
            value={level0State?.hasUserStats ? "Live" : "Missing"}
            detail="Persistent player PDA"
          />
          <MiniBlock
            label="Instance"
            value={
              level0State?.hasLevel0State
                ? "Open"
                : level0State?.isCompleted
                  ? "Closed"
                  : "Pending"
            }
            detail="Temporary Level 0 PDA"
          />
          <MiniBlock
            label="Completion"
            value={level0State?.isCompleted ? "Cleared" : `${progressValue}%`}
            detail="Warmup progress"
          />
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
                Sequence
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Level 0 is the same account pattern every later level depends
                on: registry first, temporary instance second, closeout third.
              </p>
            </div>
            <Pill>{stage.badge}</Pill>
          </div>

          <div className="mt-5 h-1.5 rounded-full bg-accent">
            <div
              className="h-full rounded-full bg-foreground transition-[width] duration-300"
              style={{ width: `${progressValue}%` }}
            />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <SequenceCard
              index="01"
              title="Registry"
              body="Create `UserStats`."
              state={stepStates[0]}
            />
            <SequenceCard
              index="02"
              title="Instance"
              body="Open the temporary level PDA."
              state={stepStates[1]}
            />
            <SequenceCard
              index="03"
              title="Closeout"
              body="Verify completion and reclaim rent."
              state={stepStates[2]}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <BriefCard
            eyebrow="Why it exists"
            title="Warm the contract path before the exploits."
            body="The first level is not trying to trick the player. It exists to guarantee the registry, per-level PDA, and closeout loop behave correctly before later levels get adversarial."
          />
          <BriefCard
            eyebrow="What comes next"
            title="Levels 1-3 are workstation levels."
            body="The browser becomes a board and a verifier surface. The real actor should be the local operator keypair running against localhost or a devnet test environment."
          />
        </div>
      </div>

      <aside className="rounded-[28px] border border-border bg-background/75 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
              Mission console
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">
              {stage.title}
            </h3>
          </div>
          {address ? (
            <button
              onClick={() => {
                void onCopy("wallet", address);
              }}
              className="min-h-10 rounded-full border border-border px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted transition hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {copied === "wallet" ? "Done" : "Copy wallet"}
            </button>
          ) : null}
        </div>

        <p className="mt-3 text-sm leading-6 text-muted">{stage.description}</p>

        <div className="mt-5 space-y-3">
          <InlineStep
            index="01"
            label="Create registry"
            state={stepStates[0]}
          />
          <InlineStep
            index="02"
            label="Initialize level"
            state={stepStates[1]}
          />
          <InlineStep
            index="03"
            label="Verify and close"
            state={stepStates[2]}
          />
        </div>

        <div className="mt-5 rounded-[22px] border border-border bg-card/80 p-4">
          <div className="space-y-4">
            <AddressRow
              label="Wallet"
              value={address}
              copied={copied === "wallet-address"}
              explorerUrl={
                address ? getExplorerUrl(`/address/${address}`) : null
              }
              onCopy={
                address
                  ? () => {
                      void onCopy("wallet-address", address);
                    }
                  : undefined
              }
            />
            <AddressRow
              label="UserStats"
              value={level0State?.userStatsPda}
              copied={copied === "user-stats"}
              explorerUrl={
                level0State?.userStatsPda
                  ? getExplorerUrl(`/address/${level0State.userStatsPda}`)
                  : null
              }
              onCopy={
                level0State?.userStatsPda
                  ? () => {
                      void onCopy("user-stats", level0State.userStatsPda);
                    }
                  : undefined
              }
            />
            <AddressRow
              label="Level0"
              value={level0State?.level0StatePda}
              copied={copied === "level0"}
              explorerUrl={
                level0State?.level0StatePda
                  ? getExplorerUrl(`/address/${level0State.level0StatePda}`)
                  : null
              }
              onCopy={
                level0State?.level0StatePda
                  ? () => {
                      void onCopy("level0", level0State.level0StatePda);
                    }
                  : undefined
              }
            />
            <StatusTextRow
              label="Completion"
              value={
                level0State?.isCompleted
                  ? "completed_levels[0] = true"
                  : "Awaiting verification"
              }
            />
            <AddressRow
              label="Certificate"
              value={certificate?.certificatePda}
              copied={copied === "level0-certificate"}
              explorerUrl={
                certificate?.certificatePda
                  ? getExplorerUrl(`/address/${certificate.certificatePda}`)
                  : null
              }
              onCopy={
                certificate?.certificatePda
                  ? () => {
                      void onCopy(
                        "level0-certificate",
                        certificate.certificatePda
                      );
                    }
                  : undefined
              }
            />
            <AddressRow
              label="Asset"
              value={certificate?.minted ? certificate.assetId : null}
              copied={copied === "level0-asset"}
              explorerUrl={
                certificate?.minted && certificate.assetId
                  ? getExplorerUrl(`/address/${certificate.assetId}`)
                  : null
              }
              onCopy={
                certificate?.minted && certificate.assetId
                  ? () => {
                      void onCopy("level0-asset", certificate.assetId!);
                    }
                  : undefined
              }
            />
          </div>
        </div>

        {status === "connected" && isLevel0Loading ? (
          <div className="mt-5 space-y-3">
            <SkeletonLine className="h-12" />
            <SkeletonLine className="h-28" />
          </div>
        ) : null}

        {status === "connected" && level0Error ? (
          <div className="mt-5 rounded-[22px] border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-foreground">
              Could not read Level 0 state
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              {level0Error instanceof Error
                ? level0Error.message
                : "The selected cluster returned an unexpected account response."}
            </p>
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {stage.actionLabel && stage.onAction ? (
            <button
              onClick={() => {
                void stage.onAction?.();
              }}
              disabled={isSending}
              className={`min-h-13 w-full rounded-full px-5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55 ${
                stage.actionKind === "primary"
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "border border-border bg-card text-foreground hover:bg-accent"
              }`}
            >
              {isSending ? "Submitting..." : stage.actionLabel}
            </button>
          ) : (
            <div className="rounded-full border border-border bg-card px-4 py-3 text-center text-sm text-muted">
              {status === "connected"
                ? "Checkpoint state is already settled."
                : "Connect a wallet to unlock the checkpoint actions."}
            </div>
          )}

          {address ? (
            <button
              onClick={() => {
                void handleAirdrop();
              }}
              disabled={isSending}
              className="min-h-13 w-full rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Fund wallet with 1 SOL
            </button>
          ) : null}

          <button
            onClick={() => {
              void onMint();
            }}
            disabled={
              !level0State?.isCompleted || certificate?.minted || isMinting
            }
            className="min-h-13 w-full rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-accent disabled:text-muted"
          >
            {certificate?.minted
              ? "Hello SolBreach cNFT minted"
              : isMinting
                ? "Minting cNFT..."
                : level0State?.isCompleted
                  ? "Mint Hello SolBreach cNFT"
                  : "Mint locked"}
          </button>
        </div>
      </aside>
    </div>
  );
}

export function Level1Panel({
  address,
  certificate,
  copied,
  getExplorerUrl,
  isLoading,
  isMinting,
  isSending,
  level1Amount,
  level1Completed,
  level1Error,
  level1ExpectedMint,
  level1State,
  level1UserTokenAccount,
  level1Vault,
  onChangeAmount,
  onChangeExpectedMint,
  onChangeUserTokenAccount,
  onChangeVault,
  onCopy,
  onDeposit,
  onInitBank,
  onInitLevel1,
  onMint,
  onVerify,
  stage,
  status,
}: {
  address?: string;
  certificate?: LevelCertificateSnapshot;
  copied: string | null;
  getExplorerUrl: (path: string) => string;
  isLoading: boolean;
  isMinting: boolean;
  isSending: boolean;
  level1Amount: string;
  level1Completed: boolean;
  level1Error: unknown;
  level1ExpectedMint: string;
  level1State?: Level1Snapshot;
  level1UserTokenAccount: string;
  level1Vault: string;
  onChangeAmount: (value: string) => void;
  onChangeExpectedMint: (value: string) => void;
  onChangeUserTokenAccount: (value: string) => void;
  onChangeVault: (value: string) => void;
  onCopy: (label: string, value: string) => Promise<void>;
  onDeposit: () => Promise<void>;
  onInitBank: () => Promise<void>;
  onInitLevel1: () => Promise<void>;
  onMint: () => void;
  onVerify: () => Promise<void>;
  stage: StageConfig;
  status: string;
}) {
  const depositState = level1Completed
    ? "done"
    : level1State?.depositedAmount
      ? "active"
      : "idle";
  const verifyState: StepState = level1Completed
    ? "done"
    : (level1State?.depositedAmount ?? 0n) >= LEVEL_1_TARGET
      ? "active"
      : "idle";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2">
          <BriefCard
            eyebrow="Operator level"
            title="The vault trusts the account wrapper, not the mint inside it."
            body="This bank only checks that both token accounts are valid SPL accounts. It never constrains the vault's mint, so a fake mint can satisfy the transfer and still inflate the internal ledger."
          />
          <BriefCard
            eyebrow="Local operator flow"
            title="Provision the fake mint off-screen, then use the board to submit it."
            body="Create the fake mint, fake vault, and user token account with your operator keypair. The page should only coordinate the vulnerable instruction and the verify step, not hide the exploit mechanics."
          />
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
                Exploit pipeline
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Configure the bank, open your per-player Level 1 state, then
                point the vulnerable deposit at a fake mint. The mint control
                stays dead until the on-chain verifier closes the level.
              </p>
            </div>
            <Pill>{stage.badge}</Pill>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SequenceCard
              index="01"
              title="Bank"
              body="Set the expected stable mint once."
              state={
                level1Completed || level1State?.hasBank ? "done" : "active"
              }
            />
            <SequenceCard
              index="02"
              title="Instance"
              body="Open your Level 1 PDA."
              state={
                level1Completed
                  ? "done"
                  : level1State?.hasLevel1State
                    ? "done"
                    : level1State?.hasBank
                      ? "active"
                      : "idle"
              }
            />
            <SequenceCard
              index="03"
              title="Deposit"
              body="Route fake tokens into the bank."
              state={depositState}
            />
            <SequenceCard
              index="04"
              title="Verify"
              body="Close the level and unlock mint."
              state={verifyState}
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <TestingField
              label="Expected mint"
              value={level1ExpectedMint}
              onChange={onChangeExpectedMint}
              placeholder="Legit mint stored in the bank config"
            />
            <TestingField
              label="Vault token account"
              value={level1Vault}
              onChange={onChangeVault}
              placeholder="Fake vault token account address"
            />
            <TestingField
              label="User token account"
              value={level1UserTokenAccount}
              onChange={onChangeUserTokenAccount}
              placeholder="Fake user token account owned by the signer"
            />
            <TestingField
              label="Raw amount"
              value={level1Amount}
              onChange={onChangeAmount}
              placeholder="1000000"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:flex-wrap">
            <button
              onClick={() => {
                void onInitBank();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Initialize bank
            </button>
            <button
              onClick={() => {
                void onInitLevel1();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Initialize level
            </button>
            <button
              onClick={() => {
                void onDeposit();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Submit exploit deposit
            </button>
            <button
              onClick={() => {
                void onVerify();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Verify and close
            </button>
          </div>

          <div className="mt-5 rounded-[22px] border border-border bg-card/80 p-4">
            <StatusTextRow
              label="Target"
              value={`${(level1State?.depositedAmount ?? 0n).toString()} / ${LEVEL_1_TARGET.toString()}`}
            />
            <div className="mt-3 h-1.5 rounded-full bg-accent">
              <div
                className="h-full rounded-full bg-foreground transition-[width] duration-300"
                style={{
                  width: `${Math.min(
                    Number(
                      ((level1State?.depositedAmount ?? 0n) * 100n) /
                        LEVEL_1_TARGET
                    ),
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
                Mission console
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">
                {stage.title}
              </h3>
            </div>
            {address ? (
              <button
                onClick={() => {
                  void onCopy("level1-wallet", address);
                }}
                className="min-h-10 rounded-full border border-border px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted transition hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {copied === "level1-wallet" ? "Done" : "Copy wallet"}
              </button>
            ) : null}
          </div>

          <p className="mt-3 text-sm leading-6 text-muted">
            {stage.description}
          </p>

          <div className="mt-5 rounded-[22px] border border-border bg-card/80 p-4">
            <div className="space-y-4">
              <AddressRow
                label="Wallet"
                value={address}
                copied={copied === "level1-wallet-address"}
                explorerUrl={
                  address ? getExplorerUrl(`/address/${address}`) : null
                }
                onCopy={
                  address
                    ? () => {
                        void onCopy("level1-wallet-address", address);
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Bank"
                value={level1State?.bankPda}
                copied={copied === "level1-bank"}
                explorerUrl={
                  level1State?.bankPda
                    ? getExplorerUrl(`/address/${level1State.bankPda}`)
                    : null
                }
                onCopy={
                  level1State?.bankPda
                    ? () => {
                        void onCopy("level1-bank", level1State.bankPda);
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Level1"
                value={level1State?.level1StatePda}
                copied={copied === "level1-pda"}
                explorerUrl={
                  level1State?.level1StatePda
                    ? getExplorerUrl(`/address/${level1State.level1StatePda}`)
                    : null
                }
                onCopy={
                  level1State?.level1StatePda
                    ? () => {
                        void onCopy("level1-pda", level1State.level1StatePda);
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Certificate"
                value={certificate?.certificatePda}
                copied={copied === "level1-certificate"}
                explorerUrl={
                  certificate?.certificatePda
                    ? getExplorerUrl(`/address/${certificate.certificatePda}`)
                    : null
                }
                onCopy={
                  certificate?.certificatePda
                    ? () => {
                        void onCopy(
                          "level1-certificate",
                          certificate.certificatePda
                        );
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Mint"
                value={
                  level1State?.expectedMint ??
                  (level1ExpectedMint.trim() ? level1ExpectedMint.trim() : null)
                }
                copied={copied === "level1-mint"}
                explorerUrl={
                  level1State?.expectedMint
                    ? getExplorerUrl(`/address/${level1State.expectedMint}`)
                    : isAddress(level1ExpectedMint.trim())
                      ? getExplorerUrl(`/address/${level1ExpectedMint.trim()}`)
                      : null
                }
                onCopy={
                  level1State?.expectedMint || level1ExpectedMint.trim()
                    ? () => {
                        void onCopy(
                          "level1-mint",
                          level1State?.expectedMint ?? level1ExpectedMint.trim()
                        );
                      }
                    : undefined
                }
              />
              <StatusTextRow
                label="Ledger"
                value={`${(level1State?.depositedAmount ?? 0n).toString()} credited`}
              />
              <AddressRow
                label="Asset"
                value={certificate?.minted ? certificate.assetId : null}
                copied={copied === "level1-asset"}
                explorerUrl={
                  certificate?.minted && certificate.assetId
                    ? getExplorerUrl(`/address/${certificate.assetId}`)
                    : null
                }
                onCopy={
                  certificate?.minted && certificate.assetId
                    ? () => {
                        void onCopy("level1-asset", certificate.assetId!);
                      }
                    : undefined
                }
              />
            </div>
          </div>

          {status === "connected" && isLoading ? (
            <div className="mt-5 space-y-3">
              <SkeletonLine className="h-12" />
              <SkeletonLine className="h-28" />
            </div>
          ) : null}

          {status === "connected" && level1Error ? (
            <div className="mt-5 rounded-[22px] border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-foreground">
                Could not read Level 1 state
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                {level1Error instanceof Error
                  ? level1Error.message
                  : "The selected cluster returned an unexpected Level 1 account response."}
              </p>
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {stage.actionLabel && stage.onAction ? (
              <button
                onClick={() => {
                  void stage.onAction?.();
                }}
                disabled={isSending}
                className="min-h-13 w-full rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSending ? "Submitting..." : stage.actionLabel}
              </button>
            ) : (
              <div className="rounded-full border border-border bg-card px-4 py-3 text-center text-sm text-muted">
                {level1Completed
                  ? "The exploit is verified. Mint can unlock from here."
                  : "Connect a wallet to unlock the exploit actions."}
              </div>
            )}

            <button
              onClick={onMint}
              disabled={!level1Completed || certificate?.minted || isMinting}
              className="min-h-13 w-full rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-accent disabled:text-muted"
            >
              {certificate?.minted
                ? "Level 1 cNFT minted"
                : isMinting
                  ? "Minting cNFT..."
                  : level1Completed
                    ? "Mint Level 1 cNFT"
                    : "Mint locked"}
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
            Exploit note
          </p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
            <ChecklistItem text="The fake vault account can point to a completely different mint than the bank expects." />
            <ChecklistItem text="The user token account still has to belong to the connected signer or the Anchor owner constraint will stop the transfer." />
            <ChecklistItem text="Verification only cares that the internal ledger hit 1,000,000, not whether the bank received the right asset." />
          </div>
        </div>
      </aside>
    </div>
  );
}

export function Level2Panel({
  address,
  certificate,
  copied,
  getExplorerUrl,
  isLoading,
  isMinting,
  isSending,
  level2Completed,
  level2Error,
  level2InitialCommander,
  level2State,
  onChangeInitialCommander,
  onCopy,
  onInitGlobalProfile,
  onInitLevel2,
  onMint,
  onUpdateProfile,
  onVerify,
  stage,
  status,
}: {
  address?: string;
  certificate?: LevelCertificateSnapshot;
  copied: string | null;
  getExplorerUrl: (path: string) => string;
  isLoading: boolean;
  isMinting: boolean;
  isSending: boolean;
  level2Completed: boolean;
  level2Error: unknown;
  level2InitialCommander: string;
  level2State?: Level2Snapshot;
  onChangeInitialCommander: (value: string) => void;
  onCopy: (label: string, value: string) => Promise<void>;
  onInitGlobalProfile: () => Promise<void>;
  onInitLevel2: () => Promise<void>;
  onMint: () => void;
  onUpdateProfile: () => Promise<void>;
  onVerify: () => Promise<void>;
  stage: StageConfig;
  status: string;
}) {
  const commanderCaptured = Boolean(
    address && level2State?.commander === address
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2">
          <BriefCard
            eyebrow="Static PDA"
            title="The profile locker is global, not personal."
            body="The architect forgot to include the user's pubkey in the seeds, so everyone points at the same registry PDA. Once the profile exists, any signer can overwrite the commander field."
          />
          <BriefCard
            eyebrow="Local operator flow"
            title="Bootstrap the commander, then replace it with your own wallet."
            body="Use the board to initialize the shared profile once, open your per-player state, then submit the overwrite. Verification should only pass once the global commander equals the connected wallet."
          />
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
                Exploit pipeline
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Bootstrap the shared commander profile, open your player state,
                overwrite the single global record, then verify the hijack and
                close your instance.
              </p>
            </div>
            <Pill>{stage.badge}</Pill>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SequenceCard
              index="01"
              title="Profile"
              body="Initialize the global commander registry."
              state={
                level2Completed || level2State?.hasProfile ? "done" : "active"
              }
            />
            <SequenceCard
              index="02"
              title="Instance"
              body="Open your Level 2 PDA."
              state={
                level2Completed
                  ? "done"
                  : level2State?.hasLevel2State
                    ? "done"
                    : level2State?.hasProfile
                      ? "active"
                      : "idle"
              }
            />
            <SequenceCard
              index="03"
              title="Overwrite"
              body="Replace the global commander with yourself."
              state={
                level2Completed
                  ? "done"
                  : commanderCaptured
                    ? "done"
                    : level2State?.hasLevel2State
                      ? "active"
                      : "idle"
              }
            />
            <SequenceCard
              index="04"
              title="Verify"
              body="Close the instance and unlock mint."
              state={
                level2Completed ? "done" : commanderCaptured ? "active" : "idle"
              }
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <TestingField
            label="Initial commander"
            value={level2InitialCommander}
            onChange={onChangeInitialCommander}
            placeholder="Any non-player pubkey used to bootstrap the profile"
          />

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:flex-wrap">
            <button
              onClick={() => {
                void onInitGlobalProfile();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Initialize profile
            </button>
            <button
              onClick={() => {
                void onInitLevel2();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Initialize level
            </button>
            <button
              onClick={() => {
                void onUpdateProfile();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Overwrite commander
            </button>
            <button
              onClick={() => {
                void onVerify();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Verify and close
            </button>
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
                Mission console
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">
                {stage.title}
              </h3>
            </div>
            {address ? (
              <button
                onClick={() => {
                  void onCopy("level2-wallet", address);
                }}
                className="min-h-10 rounded-full border border-border px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted transition hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {copied === "level2-wallet" ? "Done" : "Copy wallet"}
              </button>
            ) : null}
          </div>

          <p className="mt-3 text-sm leading-6 text-muted">
            {stage.description}
          </p>

          <div className="mt-5 rounded-[22px] border border-border bg-card/80 p-4">
            <div className="space-y-4">
              <AddressRow
                label="Wallet"
                value={address}
                copied={copied === "level2-wallet-address"}
                explorerUrl={
                  address ? getExplorerUrl(`/address/${address}`) : null
                }
                onCopy={
                  address
                    ? () => {
                        void onCopy("level2-wallet-address", address);
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Profile"
                value={level2State?.profilePda}
                copied={copied === "level2-profile"}
                explorerUrl={
                  level2State?.profilePda
                    ? getExplorerUrl(`/address/${level2State.profilePda}`)
                    : null
                }
                onCopy={
                  level2State?.profilePda
                    ? () => {
                        void onCopy("level2-profile", level2State.profilePda);
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Level2"
                value={level2State?.level2StatePda}
                copied={copied === "level2-pda"}
                explorerUrl={
                  level2State?.level2StatePda
                    ? getExplorerUrl(`/address/${level2State.level2StatePda}`)
                    : null
                }
                onCopy={
                  level2State?.level2StatePda
                    ? () => {
                        void onCopy("level2-pda", level2State.level2StatePda);
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Certificate"
                value={certificate?.certificatePda}
                copied={copied === "level2-certificate"}
                explorerUrl={
                  certificate?.certificatePda
                    ? getExplorerUrl(`/address/${certificate.certificatePda}`)
                    : null
                }
                onCopy={
                  certificate?.certificatePda
                    ? () => {
                        void onCopy(
                          "level2-certificate",
                          certificate.certificatePda
                        );
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Commander"
                value={
                  level2State?.commander ??
                  (level2InitialCommander.trim()
                    ? level2InitialCommander.trim()
                    : null)
                }
                copied={copied === "level2-commander"}
                explorerUrl={
                  level2State?.commander
                    ? getExplorerUrl(`/address/${level2State.commander}`)
                    : isAddress(level2InitialCommander.trim())
                      ? getExplorerUrl(
                          `/address/${level2InitialCommander.trim()}`
                        )
                      : null
                }
                onCopy={
                  level2State?.commander || level2InitialCommander.trim()
                    ? () => {
                        void onCopy(
                          "level2-commander",
                          level2State?.commander ??
                            level2InitialCommander.trim()
                        );
                      }
                    : undefined
                }
              />
              <StatusTextRow
                label="Status"
                value={
                  commanderCaptured
                    ? "Commander hijacked"
                    : "Awaiting overwrite"
                }
              />
              <AddressRow
                label="Asset"
                value={certificate?.minted ? certificate.assetId : null}
                copied={copied === "level2-asset"}
                explorerUrl={
                  certificate?.minted && certificate.assetId
                    ? getExplorerUrl(`/address/${certificate.assetId}`)
                    : null
                }
                onCopy={
                  certificate?.minted && certificate.assetId
                    ? () => {
                        void onCopy("level2-asset", certificate.assetId!);
                      }
                    : undefined
                }
              />
            </div>
          </div>

          {status === "connected" && isLoading ? (
            <div className="mt-5 space-y-3">
              <SkeletonLine className="h-12" />
              <SkeletonLine className="h-28" />
            </div>
          ) : null}

          {status === "connected" && level2Error ? (
            <div className="mt-5 rounded-[22px] border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-foreground">
                Could not read Level 2 state
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                {level2Error instanceof Error
                  ? level2Error.message
                  : "The selected cluster returned an unexpected Level 2 account response."}
              </p>
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {stage.actionLabel && stage.onAction ? (
              <button
                onClick={() => {
                  void stage.onAction?.();
                }}
                disabled={isSending}
                className="min-h-13 w-full rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSending ? "Submitting..." : stage.actionLabel}
              </button>
            ) : (
              <div className="rounded-full border border-border bg-card px-4 py-3 text-center text-sm text-muted">
                {level2Completed
                  ? "The exploit is verified. Mint can unlock from here."
                  : "Connect a wallet to unlock the exploit actions."}
              </div>
            )}

            <button
              onClick={onMint}
              disabled={!level2Completed || certificate?.minted || isMinting}
              className="min-h-13 w-full rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-accent disabled:text-muted"
            >
              {certificate?.minted
                ? "Level 2 cNFT minted"
                : isMinting
                  ? "Minting cNFT..."
                  : level2Completed
                    ? "Mint Level 2 cNFT"
                    : "Mint locked"}
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
            Exploit note
          </p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
            <ChecklistItem text="The profile PDA is static, so every user points to the same account." />
            <ChecklistItem text="Validating the bump only proves the PDA is derived correctly, not that it belongs to this player." />
            <ChecklistItem text="Verification succeeds only once the global commander equals the connected wallet and the per-player state exists." />
          </div>
        </div>
      </aside>
    </div>
  );
}

export function Level3Panel({
  address,
  certificate,
  copied,
  getExplorerUrl,
  isLoading,
  isMinting,
  isSending,
  level3Amount,
  level3BountyVault,
  level3Completed,
  level3Error,
  level3ExternalProgram,
  level3RewardMint,
  level3State,
  level3UserRewardAccount,
  onChangeAmount,
  onChangeBountyVault,
  onChangeExternalProgram,
  onChangeRewardMint,
  onChangeUserRewardAccount,
  onCopy,
  onDelegateTask,
  onInitGuildAuthority,
  onInitLevel3,
  onMint,
  onVerify,
  stage,
  status,
}: {
  address?: string;
  certificate?: LevelCertificateSnapshot;
  copied: string | null;
  getExplorerUrl: (path: string) => string;
  isLoading: boolean;
  isMinting: boolean;
  isSending: boolean;
  level3Amount: string;
  level3BountyVault: string;
  level3Completed: boolean;
  level3Error: unknown;
  level3ExternalProgram: string;
  level3RewardMint: string;
  level3State?: Level3Snapshot;
  level3UserRewardAccount: string;
  onChangeAmount: (value: string) => void;
  onChangeBountyVault: (value: string) => void;
  onChangeExternalProgram: (value: string) => void;
  onChangeRewardMint: (value: string) => void;
  onChangeUserRewardAccount: (value: string) => void;
  onCopy: (label: string, value: string) => Promise<void>;
  onDelegateTask: () => Promise<void>;
  onInitGuildAuthority: () => Promise<void>;
  onInitLevel3: () => Promise<void>;
  onMint: () => void;
  onVerify: () => Promise<void>;
  stage: StageConfig;
  status: string;
}) {
  const delegated =
    (level3State?.rewardAmount ?? 0n) >= (level3State?.bountyAmount ?? 0n);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2">
          <BriefCard
            eyebrow="Arbitrary CPI"
            title="The guild checks the uniform, not the mercenary's identity."
            body="Level 3 forwards the guild authority signer into any external program the player supplies. Once the caller controls that CPI target, the bounty vault becomes theirs to drain."
          />
          <BriefCard
            eyebrow="Attacker program"
            title="This one needs a deployed contract, not just a crafted client account set."
            body="Use the mercenary sample or your own program off-screen, then bring the external program id and reward token account back into the board for the delegated execution and verify steps."
          />
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
                Exploit pipeline
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Bootstrap the shared guild authority, open your Level 3 state,
                then delegate into an attacker program that uses the forwarded
                signer to drain the bounty vault. Only the verifier can unlock
                the mint gate.
              </p>
            </div>
            <Pill>{stage.badge}</Pill>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SequenceCard
              index="01"
              title="Guild"
              body="Register the reward mint and bounty vault."
              state={
                level3Completed || level3State?.hasGuildAuthority
                  ? "done"
                  : "active"
              }
            />
            <SequenceCard
              index="02"
              title="Instance"
              body="Open your Level 3 PDA."
              state={
                level3Completed
                  ? "done"
                  : level3State?.hasLevel3State
                    ? "done"
                    : level3State?.hasGuildAuthority
                      ? "active"
                      : "idle"
              }
            />
            <SequenceCard
              index="03"
              title="Delegate"
              body="Forward the signer into your attacker program."
              state={
                level3Completed
                  ? "done"
                  : delegated
                    ? "done"
                    : level3State?.hasLevel3State
                      ? "active"
                      : "idle"
              }
            />
            <SequenceCard
              index="04"
              title="Verify"
              body="Close the instance and unlock mint."
              state={level3Completed ? "done" : delegated ? "active" : "idle"}
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <TestingField
              label="Reward mint"
              value={level3RewardMint}
              onChange={onChangeRewardMint}
              placeholder="Pre-created SPL mint used for the bounty"
            />
            <TestingField
              label="Bounty vault"
              value={level3BountyVault}
              onChange={onChangeBountyVault}
              placeholder="Token account owned by the guild PDA"
            />
            <TestingField
              label="User reward account"
              value={level3UserRewardAccount}
              onChange={onChangeUserRewardAccount}
              placeholder="Your token account for the drained bounty"
            />
            <TestingField
              label="External program"
              value={level3ExternalProgram}
              onChange={onChangeExternalProgram}
              placeholder="Mercenary or custom attacker program id"
            />
            <TestingField
              label="Raw amount"
              value={level3Amount}
              onChange={onChangeAmount}
              placeholder="1000000"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:flex-wrap">
            <button
              onClick={() => {
                void onInitGuildAuthority();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Initialize guild
            </button>
            <button
              onClick={() => {
                void onInitLevel3();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Initialize level
            </button>
            <button
              onClick={() => {
                void onDelegateTask();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Run delegated CPI
            </button>
            <button
              onClick={() => {
                void onVerify();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Verify and close
            </button>
          </div>

          <div className="mt-5 rounded-[22px] border border-border bg-card/80 p-4">
            <StatusTextRow
              label="Reward balance"
              value={`${(level3State?.rewardAmount ?? 0n).toString()} / ${(level3State?.bountyAmount ?? 0n).toString()}`}
            />
            <div className="mt-3 h-1.5 rounded-full bg-accent">
              <div
                className="h-full rounded-full bg-foreground transition-[width] duration-300"
                style={{
                  width: `${
                    level3State?.bountyAmount
                      ? Math.min(
                          Number(
                            ((level3State.rewardAmount ?? 0n) * 100n) /
                              level3State.bountyAmount
                          ),
                          100
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
                Mission console
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">
                {stage.title}
              </h3>
            </div>
            {address ? (
              <button
                onClick={() => {
                  void onCopy("level3-wallet", address);
                }}
                className="min-h-10 rounded-full border border-border px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted transition hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {copied === "level3-wallet" ? "Done" : "Copy wallet"}
              </button>
            ) : null}
          </div>

          <p className="mt-3 text-sm leading-6 text-muted">
            {stage.description}
          </p>

          <div className="mt-5 rounded-[22px] border border-border bg-card/80 p-4">
            <div className="space-y-4">
              <AddressRow
                label="Wallet"
                value={address}
                copied={copied === "level3-wallet-address"}
                explorerUrl={
                  address ? getExplorerUrl(`/address/${address}`) : null
                }
                onCopy={
                  address
                    ? () => {
                        void onCopy("level3-wallet-address", address);
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Guild"
                value={level3State?.guildAuthorityPda}
                copied={copied === "level3-guild"}
                explorerUrl={
                  level3State?.guildAuthorityPda
                    ? getExplorerUrl(
                        `/address/${level3State.guildAuthorityPda}`
                      )
                    : null
                }
                onCopy={
                  level3State?.guildAuthorityPda
                    ? () => {
                        void onCopy(
                          "level3-guild",
                          level3State.guildAuthorityPda
                        );
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Level3"
                value={level3State?.level3StatePda}
                copied={copied === "level3-pda"}
                explorerUrl={
                  level3State?.level3StatePda
                    ? getExplorerUrl(`/address/${level3State.level3StatePda}`)
                    : null
                }
                onCopy={
                  level3State?.level3StatePda
                    ? () => {
                        void onCopy("level3-pda", level3State.level3StatePda);
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Certificate"
                value={certificate?.certificatePda}
                copied={copied === "level3-certificate"}
                explorerUrl={
                  certificate?.certificatePda
                    ? getExplorerUrl(`/address/${certificate.certificatePda}`)
                    : null
                }
                onCopy={
                  certificate?.certificatePda
                    ? () => {
                        void onCopy(
                          "level3-certificate",
                          certificate.certificatePda
                        );
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Reward mint"
                value={
                  level3State?.rewardMint ??
                  (level3RewardMint.trim() ? level3RewardMint.trim() : null)
                }
                copied={copied === "level3-mint"}
                explorerUrl={
                  level3State?.rewardMint
                    ? getExplorerUrl(`/address/${level3State.rewardMint}`)
                    : isAddress(level3RewardMint.trim())
                      ? getExplorerUrl(`/address/${level3RewardMint.trim()}`)
                      : null
                }
                onCopy={
                  level3State?.rewardMint || level3RewardMint.trim()
                    ? () => {
                        void onCopy(
                          "level3-mint",
                          level3State?.rewardMint ?? level3RewardMint.trim()
                        );
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Bounty vault"
                value={
                  level3State?.bountyVault ??
                  (level3BountyVault.trim() ? level3BountyVault.trim() : null)
                }
                copied={copied === "level3-bounty"}
                explorerUrl={
                  level3State?.bountyVault
                    ? getExplorerUrl(`/address/${level3State.bountyVault}`)
                    : isAddress(level3BountyVault.trim())
                      ? getExplorerUrl(`/address/${level3BountyVault.trim()}`)
                      : null
                }
                onCopy={
                  level3State?.bountyVault || level3BountyVault.trim()
                    ? () => {
                        void onCopy(
                          "level3-bounty",
                          level3State?.bountyVault ?? level3BountyVault.trim()
                        );
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Reward acct"
                value={
                  level3UserRewardAccount.trim() || level3State?.rewardAccount
                }
                copied={copied === "level3-reward"}
                explorerUrl={
                  isAddress(level3UserRewardAccount.trim())
                    ? getExplorerUrl(
                        `/address/${level3UserRewardAccount.trim()}`
                      )
                    : null
                }
                onCopy={
                  level3UserRewardAccount.trim()
                    ? () => {
                        void onCopy(
                          "level3-reward",
                          level3UserRewardAccount.trim()
                        );
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Mercenary"
                value={level3ExternalProgram.trim() || null}
                copied={copied === "level3-external"}
                explorerUrl={
                  isAddress(level3ExternalProgram.trim())
                    ? getExplorerUrl(`/address/${level3ExternalProgram.trim()}`)
                    : null
                }
                onCopy={
                  level3ExternalProgram.trim()
                    ? () => {
                        void onCopy(
                          "level3-external",
                          level3ExternalProgram.trim()
                        );
                      }
                    : undefined
                }
              />
              <StatusTextRow
                label="Status"
                value={
                  delegated
                    ? "Guild bounty drained"
                    : "Awaiting delegated exploit"
                }
              />
              <AddressRow
                label="Asset"
                value={certificate?.minted ? certificate.assetId : null}
                copied={copied === "level3-asset"}
                explorerUrl={
                  certificate?.minted && certificate.assetId
                    ? getExplorerUrl(`/address/${certificate.assetId}`)
                    : null
                }
                onCopy={
                  certificate?.minted && certificate.assetId
                    ? () => {
                        void onCopy("level3-asset", certificate.assetId!);
                      }
                    : undefined
                }
              />
            </div>
          </div>

          {status === "connected" && isLoading ? (
            <div className="mt-5 space-y-3">
              <SkeletonLine className="h-12" />
              <SkeletonLine className="h-28" />
            </div>
          ) : null}

          {status === "connected" && level3Error ? (
            <div className="mt-5 rounded-[22px] border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-foreground">
                Could not read Level 3 state
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                {level3Error instanceof Error
                  ? level3Error.message
                  : "The selected cluster returned an unexpected Level 3 account response."}
              </p>
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {stage.actionLabel && stage.onAction ? (
              <button
                onClick={() => {
                  void stage.onAction?.();
                }}
                disabled={isSending}
                className="min-h-13 w-full rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSending ? "Submitting..." : stage.actionLabel}
              </button>
            ) : (
              <div className="rounded-full border border-border bg-card px-4 py-3 text-center text-sm text-muted">
                {level3Completed
                  ? "The exploit is verified. Mint can unlock from here."
                  : "Connect a wallet to unlock the exploit actions."}
              </div>
            )}

            <button
              onClick={onMint}
              disabled={!level3Completed || certificate?.minted || isMinting}
              className="min-h-13 w-full rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-accent disabled:text-muted"
            >
              {certificate?.minted
                ? "Level 3 cNFT minted"
                : isMinting
                  ? "Minting cNFT..."
                  : level3Completed
                    ? "Mint Level 3 cNFT"
                    : "Mint locked"}
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
            Exploit note
          </p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
            <ChecklistItem text="Unchecked external programs are arbitrary code execution in disguise once valuable signer privileges are forwarded." />
            <ChecklistItem text="This exploit needs an attacker program because the malicious behavior happens inside the delegated CPI target, not in the original client transaction alone." />
            <ChecklistItem text="Verification only cares that your reward account received the bounty amount and that the per-player Level 3 state exists to close." />
          </div>
        </div>
      </aside>
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

function MiniBlock({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-border bg-background/75 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.05em]">{value}</p>
      <p className="mt-2 text-sm text-muted">{detail}</p>
    </div>
  );
}

function SequenceCard({
  index,
  title,
  body,
  state,
}: {
  index: string;
  title: string;
  body: string;
  state: StepState;
}) {
  const wrapperTone =
    state === "done"
      ? "border-foreground bg-foreground text-background"
      : state === "active"
        ? "border-foreground/25 bg-card text-foreground"
        : "border-border bg-background/75 text-foreground";

  const badgeTone =
    state === "done"
      ? "bg-background/15 text-background"
      : state === "active"
        ? "bg-foreground text-background"
        : "bg-accent text-muted";

  return (
    <article className={`rounded-[22px] border p-4 ${wrapperTone}`}>
      <div className="flex items-center justify-between gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone}`}
        >
          {index}
        </span>
        <span className="text-[11px] uppercase tracking-[0.28em] opacity-70">
          {state === "done" ? "Done" : state === "active" ? "Live" : "Queued"}
        </span>
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em]">{title}</h3>
      <p className="mt-2 text-sm leading-6 opacity-78">{body}</p>
    </article>
  );
}

function BriefCard({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-[24px] border border-border bg-background/75 p-5">
      <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
        {eyebrow}
      </p>
      <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
    </article>
  );
}

function TestingField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const inputId = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="text-[11px] uppercase tracking-[0.28em] text-muted"
      >
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-12 w-full rounded-[18px] border border-border bg-card/80 px-4 text-sm text-foreground outline-none transition placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-2 h-1.5 w-1.5 rounded-full bg-foreground/80"
        aria-hidden="true"
      />
      <p>{text}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-10 items-center rounded-full border border-border bg-background px-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
      {children}
    </span>
  );
}

function StatusChip({ children }: { children: React.ReactNode }) {
  const isLocked = children === "Locked";
  const toneClass = isLocked
    ? "border-violet-400/22 bg-violet-500/8 text-violet-100 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.14)]"
    : "border-emerald-400/20 bg-emerald-400/8 text-foreground shadow-[inset_0_0_0_1px_rgba(74,222,128,0.16)]";

  return (
    <span
      className={`inline-flex min-h-10 items-center rounded-full border px-4 text-[11px] font-semibold uppercase tracking-[0.28em] ${toneClass}`}
    >
      {children}
    </span>
  );
}

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 fill-current"
    >
      <path d="M12 2C6.477 2 2 6.59 2 12.252c0 4.53 2.865 8.37 6.839 9.727.5.096.682-.222.682-.494 0-.244-.009-.891-.014-1.75-2.782.617-3.369-1.37-3.369-1.37-.455-1.183-1.11-1.497-1.11-1.497-.908-.637.069-.624.069-.624 1.004.072 1.532 1.055 1.532 1.055.893 1.566 2.341 1.114 2.91.852.091-.664.35-1.115.636-1.371-2.221-.258-4.555-1.137-4.555-5.062 0-1.118.389-2.032 1.029-2.749-.103-.259-.446-1.301.098-2.713 0 0 .84-.276 2.75 1.05A9.327 9.327 0 0 1 12 6.863c.85.004 1.706.118 2.504.346 1.909-1.326 2.748-1.05 2.748-1.05.546 1.412.203 2.454.1 2.713.64.717 1.028 1.631 1.028 2.749 0 3.934-2.337 4.801-4.566 5.054.359.319.678.948.678 1.911 0 1.379-.012 2.49-.012 2.829 0 .274.18.594.688.493C19.138 20.619 22 16.78 22 12.252 22 6.59 17.523 2 12 2Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 fill-current"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.966 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

function InlineStep({
  index,
  label,
  state,
}: {
  index: string;
  label: string;
  state: StepState;
}) {
  const dotTone =
    state === "done"
      ? "bg-foreground"
      : state === "active"
        ? "bg-foreground/80"
        : "bg-accent";

  return (
    <div className="flex items-center justify-between rounded-full border border-border bg-card/80 px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={`h-2.5 w-2.5 rounded-full ${dotTone}`}
          aria-hidden="true"
        />
        <span className="font-mono text-xs text-muted">{index}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-[11px] uppercase tracking-[0.26em] text-muted">
        {state === "done" ? "Done" : state === "active" ? "Active" : "Idle"}
      </span>
    </div>
  );
}

function AddressRow({
  label,
  value,
  copied,
  explorerUrl,
  onCopy,
}: {
  label: string;
  value?: string | null;
  copied: boolean;
  explorerUrl: string | null;
  onCopy?: () => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center">
      <span className="text-[11px] uppercase tracking-[0.26em] text-muted">
        {label}
      </span>
      <div className="min-w-0">
        {value && explorerUrl ? (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate font-mono text-xs text-foreground underline underline-offset-2"
            title={value}
          >
            {compactAddress(value)}
          </a>
        ) : (
          <span className="text-sm text-muted">Pending</span>
        )}
      </div>
      <div>
        {value && onCopy ? (
          <button
            onClick={onCopy}
            className="min-h-10 rounded-full border border-border px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted transition hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {copied ? "Done" : "Copy"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function StatusTextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-center">
      <span className="text-[11px] uppercase tracking-[0.26em] text-muted">
        {label}
      </span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function SkeletonLine({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-[20px] bg-accent ${className}`} />
  );
}

function compactAddress(address: string, start = 8, end = 8) {
  const minLength = start + end + 3;
  if (address.length <= minLength) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
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
