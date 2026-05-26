"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { address as toAddress, isAddress, type Address } from "@solana/kit";
import { GridBackground } from "./components/grid-background";
import { ClusterSelect } from "./components/cluster-select";
import { HeaderCourseNav } from "./components/course-nav";
import { LandingPageSection } from "./components/landing-page-section";
import { Level1Panel } from "./components/level-1-panel";
import { Level2Panel } from "./components/level-2-panel";
import { Level3Panel } from "./components/level-3-panel";
import { LevelWorkspacePage } from "./components/level-workspace";
import { ProfileCertificatesSection } from "./components/profile-certificates-section";
import { ResearchLabsSection } from "./components/research-labs-section";
import { SiteFooter } from "./components/site-footer";
import { ThemeToggle } from "./components/theme-toggle";
import { WalletButton } from "./components/wallet-button";
import { useCluster } from "./components/cluster-context";
import { type CertificateCollection } from "./lib/certificates/certificate-state";
import { LEVEL_GUIDES } from "./lib/levels/level-guides";
import { useActiveLevelStatus } from "./lib/hooks/use-active-level-status";
import { useBalance } from "./lib/hooks/use-balance";
import { useCertificateMinting } from "./lib/hooks/use-certificate-minting";
import { useLevelChainActions } from "./lib/hooks/use-level-chain-actions";
import { useLevel1BackendCertificate } from "./lib/hooks/use-level1-backend-certificate";
import { useLevel1BackendExecution } from "./lib/hooks/use-level1-backend-execution";
import { useLevel2BackendExecution } from "./lib/hooks/use-level2-backend-execution";
import { useLevel3BackendExecution } from "./lib/hooks/use-level3-backend-execution";
import { useLevelRoute } from "./lib/hooks/use-level-route";
import { useLevelSnapshots } from "./lib/hooks/use-level-snapshots";
import { useSendTransaction } from "./lib/hooks/use-send-transaction";
import { buildLevelTiles } from "./lib/levels/course-status";
import { type Level1Snapshot } from "./lib/levels/level-state";
import { useSolanaClient } from "./lib/solana-client-context";
import { useWallet } from "./lib/wallet/context";

type StageConfig = {
  badge: string;
  title: string;
  description: string;
  actionLabel: string | null;
  actionKind: "primary" | "secondary";
  level1Mode?: "prepare" | "sequence" | "execute" | "complete";
  onAction?: () => Promise<void>;
};

const LEVEL_1_TARGET = 1_000_000n;
const LEVEL_3_DEFAULT_TARGET = 1_000_000n;
const DEFAULT_LEVEL_2_COMMANDER = "11111111111111111111111111111111" as Address;
const SOLBREACH_REPOSITORY_URL = "https://github.com/jpromano-swe/solbreach";
function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export default function Home() {
  const { wallet, signer, status } = useWallet();
  const { cluster, getExplorerUrl } = useCluster();
  const client = useSolanaClient();
  const { send, isSending } = useSendTransaction();

  const address = wallet?.account.address;
  const walletBalance = useBalance(address);
  const {
    activeLevelsView,
    activeSection,
    setActiveLevelsView,
    setActiveSection,
  } = useLevelRoute();
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
  const [copied, setCopied] = useState<string | null>(null);
  const {
    backendAuth: level1BackendAuth,
    backendCompleted: level1BackendCompleted,
    backendError: level1BackendError,
    backendStatus: level1BackendStatus,
    challenge: level1Challenge,
    ensureBackendSession: ensureLevel1BackendSession,
    isBackendLoading: isLevel1BackendLoading,
    isBusy: isLevel1BackendBusy,
    mutateBackendStatus: mutateLevel1BackendStatus,
    prepare: handleSetupLevel1Backend,
    run: handleRunLevel1BackendExploit,
    runtimeError: level1RuntimeError,
    txSignature: level1TxSignature,
  } = useLevel1BackendExecution({ address, status, wallet });
  const {
    backendCompleted: level2BackendCompleted,
    backendError: level2BackendError,
    challenge: level2Challenge,
    isBackendLoading: isLevel2BackendLoading,
    isBusy: isLevel2BackendBusy,
    mutateBackendStatus: mutateLevel2BackendStatus,
    prepare: handleSetupLevel2Backend,
    run: handleRunLevel2BackendExploit,
    runtimeError: level2RuntimeError,
    txSignature: level2TxSignature,
  } = useLevel2BackendExecution({ address, status, wallet });
  const {
    backendCompleted: level3BackendCompleted,
    backendError: level3BackendError,
    backendStatus: level3BackendStatus,
    challenge: level3Challenge,
    isBackendLoading: isLevel3BackendLoading,
    isBusy: isLevel3BackendBusy,
    mutateBackendStatus: mutateLevel3BackendStatus,
    prepare: handleSetupLevel3Backend,
    run: handleRunLevel3BackendExploit,
    runtimeError: level3RuntimeError,
    txSignature: level3TxSignature,
  } = useLevel3BackendExecution({ address, status, wallet });
  const {
    handleLevel1BackendCertificateMinted,
    level1BackendCertificateSnapshot,
  } = useLevel1BackendCertificate({ address, cluster });

  const handleCopy = useCallback(async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1600);
  }, []);

  const {
    certificateState,
    isCertificateLoading,
    isLevel0Loading,
    isLevel1Loading,
    isLevel2Loading,
    isLevel3Loading,
    level0Error,
    level0State,
    level1Error,
    level1State,
    level2Error,
    level2State,
    level3Error,
    level3State,
    mutateLevel0State,
    mutateLevel2State,
    mutateLevel3State,
    refreshSnapshots,
  } = useLevelSnapshots({
    address,
    client,
    cluster,
    level3RewardAccountInput: level3UserRewardAccount,
    signer,
  });

  const refreshState = useCallback(async () => {
    await Promise.all([
      refreshSnapshots(),
      mutateLevel1BackendStatus(),
      mutateLevel2BackendStatus(),
      mutateLevel3BackendStatus(),
      walletBalance.mutate(),
    ]);
  }, [
    mutateLevel1BackendStatus,
    mutateLevel2BackendStatus,
    mutateLevel3BackendStatus,
    refreshSnapshots,
    walletBalance,
  ]);

  const {
    handleDepositLevel1,
    handleDelegateTask,
    handleInitBank,
    handleInitGlobalProfile,
    handleInitGuildAuthority,
    handleInitLevel0,
    handleInitLevel1,
    handleInitLevel2,
    handleInitLevel3,
    handleInitStats,
    handleUpdateProfile,
    handleVerifyLevel0,
    handleVerifyLevel1,
    handleVerifyLevel2,
    handleVerifyLevel3,
  } = useLevelChainActions({
    address,
    getExplorerUrl,
    level1Amount,
    level1ExpectedMint,
    level1UserTokenAccount,
    level1Vault,
    level2InitialCommander,
    level3Amount,
    level3BountyVault,
    level3ExternalProgram,
    level3RewardMint,
    level3State,
    level3UserRewardAccount,
    refreshState,
    send,
    signer,
  });

  const level1Completed =
    Boolean(level0State?.completedLevels[1]) || level1BackendCompleted;
  const level2Completed =
    Boolean(level0State?.completedLevels[2]) || level2BackendCompleted;
  const level3Completed =
    Boolean(level0State?.completedLevels[3]) || level3BackendCompleted;
  const level0Certificate = certificateState?.[0];
  const chainLevel1Certificate = certificateState?.[1];
  const level1Certificate = chainLevel1Certificate?.minted
    ? chainLevel1Certificate
    : (level1BackendCertificateSnapshot ?? chainLevel1Certificate);
  const level2Certificate = certificateState?.[2];
  const level3Certificate = certificateState?.[3];
  const effectiveCertificateState = useMemo(() => {
    if (!certificateState) return certificateState;
    if (!level1BackendCertificateSnapshot || certificateState[1]?.minted) {
      return certificateState;
    }

    return {
      ...certificateState,
      1: level1BackendCertificateSnapshot,
    } satisfies CertificateCollection;
  }, [certificateState, level1BackendCertificateSnapshot]);
  const level1CertificationMinted = Boolean(level1Certificate?.minted);
  const level1DepositReady =
    (level1State?.depositedAmount ?? 0n) >= LEVEL_1_TARGET ||
    level1BackendCompleted;
  const level2Hijacked = Boolean(address && level2State?.commander === address);
  const level3DelegationReady =
    level3BackendCompleted ||
    Boolean(level3Challenge || level3BackendStatus?.challenge_context) ||
    (level3State?.rewardAmount ?? 0n) >=
      (level3State?.bountyAmount || LEVEL_3_DEFAULT_TARGET);
  const level1PanelChallenge =
    level1Challenge ?? level1BackendStatus?.challenge_context ?? null;
  const level1PanelPda =
    level1PanelChallenge?.challenge_pda &&
    isAddress(level1PanelChallenge.challenge_pda)
      ? toAddress(level1PanelChallenge.challenge_pda)
      : (level1State?.bankPda ?? DEFAULT_LEVEL_2_COMMANDER);
  const level1PanelExpectedMint =
    level1PanelChallenge?.official_mint &&
    isAddress(level1PanelChallenge.official_mint)
      ? toAddress(level1PanelChallenge.official_mint)
      : (level1State?.expectedMint ?? null);
  const level1PanelState: Level1Snapshot | undefined = level1PanelChallenge
    ? {
        bankPda: level1PanelPda,
        depositedAmount: level1BackendCompleted
          ? LEVEL_1_TARGET
          : (level1State?.depositedAmount ?? 0n),
        expectedMint: level1PanelExpectedMint,
        hasBank: true,
        hasLevel1State: Boolean(
          level1BackendStatus?.level_session_id || level1State?.hasLevel1State
        ),
        level1StatePda: level1PanelPda,
      }
    : level1State;
  const level1PanelError = level1BackendError ?? level1Error;
  const isLevel1PanelLoading =
    isLevel1Loading || isLevel1BackendLoading || isLevel1BackendBusy;

  const { mintingLevel, mintLevelCertificate } = useCertificateMinting({
    address,
    cluster,
    getExplorerUrl,
    onLevel1BackendCertificateMinted: handleLevel1BackendCertificateMinted,
    refreshState,
    send,
    signer,
    wallet,
  });

  const handleMintLevel0Flag = useCallback(async () => {
    await mintLevelCertificate({
      level: 0,
      levelId: "level0",
      existingCertificate: level0Certificate,
      title: "Hello SolBreach",
    });
  }, [level0Certificate, mintLevelCertificate]);

  const handleMintLevel1Flag = useCallback(async () => {
    const auth = level1BackendCompleted
      ? await ensureLevel1BackendSession()
      : null;

    await mintLevelCertificate({
      backendAccessToken: level1BackendCompleted
        ? auth?.accessToken
        : undefined,
      level: 1,
      levelId: "level1",
      existingCertificate: level1Certificate,
      title: "Level 1",
    });
  }, [
    ensureLevel1BackendSession,
    level1BackendCompleted,
    level1Certificate,
    mintLevelCertificate,
  ]);

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
    if (status !== "connected" || !address || !wallet) {
      return {
        badge: "Wallet required",
        title: "Attach the operator wallet first.",
        description:
          "Level 1 needs a connected devnet wallet so the backend can bind the challenge and verify the exploit transaction.",
        actionLabel: null,
        actionKind: "secondary",
      };
    }

    if (cluster !== "devnet") {
      return {
        badge: "Devnet required",
        title: "Switch the cluster to devnet.",
        description:
          "The Level 1 backend verifies a real devnet transaction signature. Switch clusters before preparing the challenge.",
        actionLabel: null,
        actionKind: "secondary",
      };
    }

    if (isLevel1BackendBusy || isLevel1BackendLoading) {
      return {
        badge: "Synchronizing",
        title: "Synchronizing Level 1 with the backend.",
        description:
          "The frontend is preparing challenge state, submitting the transaction, or waiting for backend verification.",
        actionLabel: null,
        actionKind: "secondary",
      };
    }

    if (level1BackendError) {
      return {
        badge: "Backend read error",
        title: "Could not read the Level 1 backend state.",
        description:
          "Retry the backend session read before running another exploit transaction.",
        actionLabel: "Retry backend sync",
        actionKind: "secondary",
        onAction: async () => {
          if (level1BackendAuth) {
            await mutateLevel1BackendStatus();
          } else {
            await handleSetupLevel1Backend();
          }
        },
      };
    }

    if (level1RuntimeError) {
      return {
        badge: "Execution error",
        title: "Level 1 exploit flow stopped before verification.",
        description: level1RuntimeError,
        actionLabel: level1Challenge
          ? "Retry exploit deposit"
          : "Retry challenge setup",
        actionKind: "primary",
        level1Mode: level1Challenge ? "execute" : "prepare",
        onAction: level1Challenge
          ? handleRunLevel1BackendExploit
          : handleSetupLevel1Backend,
      };
    }

    if (level1Completed) {
      return {
        badge: "Verified",
        title: "Level 1 exploit verified.",
        description:
          "The backend accepted the signed devnet transaction and recorded the forged ledger credit for this wallet.",
        actionLabel: null,
        actionKind: "secondary",
        level1Mode: "complete",
      };
    }

    if (!level1Challenge) {
      return {
        badge: level1BackendStatus?.level_session_id ? "Challenge" : "Start",
        title: "Prepare the deterministic exploit challenge.",
        description:
          "The backend will create the Level 1 setup, expose the official and counterfeit accounts, and bind them to this wallet.",
        actionLabel: "Prepare For Exploit",
        actionKind: "primary",
        level1Mode: "prepare",
        onAction: handleSetupLevel1Backend,
      };
    }

    return {
      badge: level1TxSignature ? "Proof ready" : "Exploit",
      title: "Execute the counterfeit deposit path.",
      description:
        "Reconstruct the dependency chain, then sign the deterministic devnet interaction and submit the signature to the verifier.",
      actionLabel: "Run exploit deposit",
      actionKind: "primary",
      level1Mode: "sequence",
      onAction: handleRunLevel1BackendExploit,
    };
  }, [
    address,
    cluster,
    handleRunLevel1BackendExploit,
    handleSetupLevel1Backend,
    isLevel1BackendBusy,
    isLevel1BackendLoading,
    level1BackendAuth,
    level1BackendError,
    level1BackendStatus?.level_session_id,
    level1Completed,
    level1Challenge,
    level1RuntimeError,
    level1TxSignature,
    mutateLevel1BackendStatus,
    status,
    wallet,
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

  const levelTiles = useMemo(() => {
    return buildLevelTiles({
      level0Completed: level0State?.isCompleted,
      level0HasLevelState: level0State?.hasLevel0State,
      level1Completed,
      level1DepositReady,
      level1HasLevelState: level1State?.hasLevel1State,
      level2Completed,
      level2HasLevelState: level2State?.hasLevel2State,
      level2HasProfile: level2State?.hasProfile,
      level2Hijacked,
      level3Completed,
      level3DelegationReady,
      level3HasGuildAuthority: level3State?.hasGuildAuthority,
      level3HasLevelState: level3State?.hasLevel3State,
    });
  }, [
    level0State?.hasLevel0State,
    level0State?.isCompleted,
    level1Completed,
    level1DepositReady,
    level1State?.hasLevel1State,
    level2Completed,
    level2Hijacked,
    level2State?.hasLevel2State,
    level2State?.hasProfile,
    level3Completed,
    level3DelegationReady,
    level3State?.hasGuildAuthority,
    level3State?.hasLevel3State,
  ]);

  const activeLevel = activeLevelsView === "landing" ? null : activeLevelsView;
  const activeGuide = activeLevel ? LEVEL_GUIDES[activeLevel] : null;
  const activeLevelStatus = useActiveLevelStatus({
    activeLevel,
    address,
    cluster,
    level0Certificate,
    level0State,
    level1Certificate,
    level1CertificationMinted,
    level1Completed,
    level1StageBadge: level1Stage.badge,
    level1State,
    level2Certificate,
    level2Completed,
    level2Hijacked,
    level2StageBadge: level2Stage.badge,
    level2State,
    level3Certificate,
    level3Completed,
    level3StageBadge: level3Stage.badge,
    level3State,
    levelTiles,
    mintingLevel,
    onMintLevel0: handleMintLevel0Flag,
    onMintLevel1: handleMintLevel1Flag,
    onMintLevel2: handleMintLevel2Flag,
    onMintLevel3: handleMintLevel3Flag,
    stageBadge: stage.badge,
    status,
  });

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
                onSelectResearchLabs={() => setActiveSection("research-labs")}
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
                  {activeLevel === "level1" ? (
                    <Level1Panel
                      address={address}
                      certificationAction={{
                        disabled: activeLevelStatus.mintDisabled,
                        label: activeLevelStatus.mintLabel,
                        onMint: activeLevelStatus.onMint,
                      }}
                      copied={copied}
                      isLoading={isLevel1PanelLoading}
                      isSending={isSending || isLevel1BackendBusy}
                      level1Error={level1PanelError}
                      level1State={level1PanelState}
                      onCopy={handleCopy}
                      onDeposit={handleDepositLevel1}
                      onInitBank={handleInitBank}
                      onInitLevel1={handleInitLevel1}
                      onVerify={handleVerifyLevel1}
                      stage={level1Stage}
                      status={status}
                    />
                  ) : activeLevel === "level2" ? (
                    <Level2Panel
                      address={address}
                      backendExecution={{
                        challengeReady: Boolean(level2Challenge),
                        completed: level2BackendCompleted,
                        error:
                          level2RuntimeError ??
                          (level2BackendError
                            ? getErrorMessage(level2BackendError)
                            : null),
                        isBusy: isLevel2BackendBusy || isLevel2BackendLoading,
                        onPrepare: handleSetupLevel2Backend,
                        onRun: handleRunLevel2BackendExploit,
                        txSignature: level2TxSignature,
                      }}
                      certificate={level2Certificate}
                      isLoading={isLevel2Loading}
                      isMinting={mintingLevel === "level2"}
                      isSending={isSending}
                      level2Completed={level2Completed}
                      level2Error={level2Error}
                      level2InitialCommander={level2InitialCommander}
                      level2State={level2State}
                      onInitGlobalProfile={handleInitGlobalProfile}
                      onInitLevel2={handleInitLevel2}
                      onMint={activeLevelStatus.onMint}
                      onUpdateProfile={handleUpdateProfile}
                      onVerify={handleVerifyLevel2}
                      status={status}
                    />
                  ) : activeLevel === "level3" ? (
                    <Level3Panel
                      address={address}
                      backendExecution={{
                        challengeReady: Boolean(level3Challenge),
                        completed: level3BackendCompleted,
                        error:
                          level3RuntimeError ??
                          (level3BackendError
                            ? getErrorMessage(level3BackendError)
                            : null),
                        isBusy: isLevel3BackendBusy || isLevel3BackendLoading,
                        onPrepare: handleSetupLevel3Backend,
                        onRun: handleRunLevel3BackendExploit,
                        txSignature: level3TxSignature,
                      }}
                      certificate={level3Certificate}
                      isLoading={isLevel3Loading}
                      isMinting={mintingLevel === "level3"}
                      isSending={isSending}
                      level3Completed={level3Completed}
                      level3Error={level3Error}
                      level3State={level3State}
                      onMint={activeLevelStatus.onMint}
                      status={status}
                    />
                  ) : (
                    <LevelWorkspacePage
                      guide={activeGuide}
                      level0Activity={
                        activeLevel === "level0"
                          ? {
                              certificateMinted: Boolean(
                                level0Certificate?.minted
                              ),
                              isLevel0Loading,
                              isMinting: mintingLevel === "level0",
                              isSending,
                              level0Error,
                              level0State,
                              mintDisabled: activeLevelStatus.mintDisabled,
                              mintLabel: activeLevelStatus.mintLabel,
                              onContinueToLevel1: () => {
                                setActiveLevelsView("level1");
                              },
                              onMint: activeLevelStatus.onMint,
                              stage,
                              status,
                            }
                          : undefined
                      }
                      levelId={activeLevel ?? undefined}
                      missionStatus={activeLevelStatus}
                    />
                  )}
                </div>
              ) : null}
            </div>
          ) : activeSection === "research-labs" ? (
            <ResearchLabsSection />
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
                certificateState={effectiveCertificateState}
                completedLevels={
                  level0State?.completedLevels
                    ? level0State.completedLevels.map((val, i) =>
                        i === 1 ? val || level1BackendCompleted : val
                      )
                    : undefined
                }
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
