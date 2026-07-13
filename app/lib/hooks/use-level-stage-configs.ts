"use client";

import { useMemo } from "react";
import type { Address } from "@solana/kit";
import type {
  Level0Snapshot,
  Level1Snapshot,
  Level2Snapshot,
  Level3Snapshot,
} from "../levels/level-state";
import { buildLevelTiles } from "../levels/course-status";
import type { ClusterMoniker } from "../solana-client";

const LEVEL_1_TARGET = 1_000_000n;

export type StageConfig = {
  badge: string;
  title: string;
  description: string;
  actionLabel: string | null;
  actionKind: "primary" | "secondary";
  actionDisabled?: boolean;
  level1Mode?: "prepare" | "sequence" | "execute" | "complete";
  onAction?: () => Promise<void>;
};

type StageAction = () => Promise<unknown>;

function toStageAction(action: StageAction): () => Promise<void> {
  return async () => {
    await action();
  };
}

export function useLevelStageConfigs({
  address,
  cluster,
  handleDelegateTask,
  handleInitGlobalProfile,
  handleInitGuildAuthority,
  handleInitLevel0,
  handleInitLevel2,
  handleInitLevel3,
  handleInitStats,
  handleRunLevel1BackendExploit,
  handleSetupLevel1Backend,
  handleUpdateProfile,
  handleVerifyLevel0,
  handleVerifyLevel2,
  handleVerifyLevel3,
  hasSigner,
  hasWallet,
  isLevel0Loading,
  isLevel1BackendBusy,
  isLevel1BackendLoading,
  isLevel2Loading,
  isLevel3Loading,
  level0Error,
  level0State,
  level1BackendAuthReady,
  level1BackendCompleted,
  level1BackendError,
  level1ChallengeReady,
  level1Completed,
  level1RuntimeError,
  level1SessionReady,
  level1State,
  level1TxSignature,
  level2Completed,
  level2Error,
  level2Hijacked,
  level2State,
  level3Completed,
  level3DelegationReady,
  level3Error,
  level3State,
  mutateLevel0State,
  mutateLevel1BackendStatus,
  mutateLevel2State,
  mutateLevel3State,
  status,
}: {
  address?: Address;
  cluster: ClusterMoniker;
  handleDelegateTask: StageAction;
  handleInitGlobalProfile: StageAction;
  handleInitGuildAuthority: StageAction;
  handleInitLevel0: StageAction;
  handleInitLevel2: StageAction;
  handleInitLevel3: StageAction;
  handleInitStats: StageAction;
  handleRunLevel1BackendExploit: StageAction;
  handleSetupLevel1Backend: StageAction;
  handleUpdateProfile: StageAction;
  handleVerifyLevel0: StageAction;
  handleVerifyLevel2: StageAction;
  handleVerifyLevel3: StageAction;
  hasSigner: boolean;
  hasWallet: boolean;
  isLevel0Loading: boolean;
  isLevel1BackendBusy: boolean;
  isLevel1BackendLoading: boolean;
  isLevel2Loading: boolean;
  isLevel3Loading: boolean;
  level0Error?: unknown;
  level0State?: Level0Snapshot;
  level1BackendAuthReady: boolean;
  level1BackendCompleted: boolean;
  level1BackendError?: unknown;
  level1ChallengeReady: boolean;
  level1Completed: boolean;
  level1RuntimeError?: string | null;
  level1SessionReady: boolean;
  level1State?: Level1Snapshot;
  level1TxSignature?: string | null;
  level2Completed: boolean;
  level2Error?: unknown;
  level2Hijacked: boolean;
  level2State?: Level2Snapshot;
  level3Completed: boolean;
  level3DelegationReady: boolean;
  level3Error?: unknown;
  level3State?: Level3Snapshot;
  mutateLevel0State: StageAction;
  mutateLevel1BackendStatus: StageAction;
  mutateLevel2State: StageAction;
  mutateLevel3State: StageAction;
  status: string;
}) {
  const stage = useMemo<StageConfig>(() => {
    if (status !== "connected" || !address || !hasSigner) {
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
        onAction: toStageAction(mutateLevel0State),
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
        onAction: toStageAction(handleInitStats),
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
        onAction: toStageAction(handleInitLevel0),
      };
    }

    return {
      badge: "Step 3",
      title: "Mark completion and reclaim rent.",
      description:
        "Level 0 is ready to verify. Completing it flips `completed_levels[0]` and closes the instance account.",
      actionLabel: "Complete Level 0",
      actionKind: "primary",
      onAction: toStageAction(handleVerifyLevel0),
    };
  }, [
    address,
    handleInitLevel0,
    handleInitStats,
    handleVerifyLevel0,
    hasSigner,
    isLevel0Loading,
    level0Error,
    level0State,
    mutateLevel0State,
    status,
  ]);

  const level1Stage = useMemo<StageConfig>(() => {
    if (status !== "connected" || !address || !hasWallet) {
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
        onAction: toStageAction(
          level1BackendAuthReady
            ? mutateLevel1BackendStatus
            : handleSetupLevel1Backend
        ),
      };
    }

    if (level1RuntimeError) {
      return {
        badge: "Execution error",
        title: "Level 1 exploit flow stopped before verification.",
        description: level1RuntimeError,
        actionLabel: level1ChallengeReady
          ? "Retry exploit deposit"
          : "Retry challenge setup",
        actionKind: "primary",
        level1Mode: level1ChallengeReady ? "execute" : "prepare",
        onAction: toStageAction(
          level1ChallengeReady
            ? handleRunLevel1BackendExploit
            : handleSetupLevel1Backend
        ),
      };
    }

    if (level1Completed) {
      return {
        badge: "Verified",
        title: "Level 1 exploit verified.",
        description: "",
        actionLabel: null,
        actionKind: "secondary",
        level1Mode: "complete",
      };
    }

    if (level1BackendCompleted && level1TxSignature) {
      return {
        badge: "Verified",
        title: "Level 1 exploit verified.",
        description:
          "The backend verified the exploit transaction. Collect the badge to record this completion on your profile.",
        actionLabel: "Exploit verified",
        actionKind: "secondary",
        actionDisabled: true,
        level1Mode: "complete",
      };
    }

    if (!level1ChallengeReady) {
      return {
        badge: level1SessionReady ? "Challenge" : "Start",
        title: "Prepare the deterministic exploit challenge.",
        description:
          "The backend will create the Level 1 setup, expose the official and counterfeit accounts, and bind them to this wallet.",
        actionLabel: "Prepare For Exploit",
        actionKind: "primary",
        level1Mode: "prepare",
        onAction: toStageAction(handleSetupLevel1Backend),
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
      onAction: toStageAction(handleRunLevel1BackendExploit),
    };
  }, [
    address,
    cluster,
    handleRunLevel1BackendExploit,
    handleSetupLevel1Backend,
    hasWallet,
    isLevel1BackendBusy,
    isLevel1BackendLoading,
    level1BackendAuthReady,
    level1BackendCompleted,
    level1BackendError,
    level1ChallengeReady,
    level1Completed,
    level1RuntimeError,
    level1SessionReady,
    level1TxSignature,
    mutateLevel1BackendStatus,
    status,
  ]);

  const level2Stage = useMemo<StageConfig>(() => {
    if (status !== "connected" || !address || !hasSigner) {
      return {
        badge: "Wallet required",
        title: "Attach the operator wallet first.",
        description:
          "Level 2 needs a connected signer so the board can derive the static profile PDA and verify the commander overwrite.",
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
        onAction: toStageAction(mutateLevel2State),
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
        onAction: toStageAction(handleInitGlobalProfile),
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
        onAction: toStageAction(handleInitLevel2),
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
        onAction: toStageAction(handleUpdateProfile),
      };
    }

    return {
      badge: "Verify",
      title: "Prove you now control the global registry.",
      description:
        "Verification checks that the static profile commander matches the connected wallet, then flips `completed_levels[2]` and closes the Level 2 instance.",
      actionLabel: "Verify and close",
      actionKind: "primary",
      onAction: toStageAction(handleVerifyLevel2),
    };
  }, [
    address,
    handleInitGlobalProfile,
    handleInitLevel2,
    handleUpdateProfile,
    handleVerifyLevel2,
    hasSigner,
    isLevel2Loading,
    level2Completed,
    level2Error,
    level2Hijacked,
    level2State,
    mutateLevel2State,
    status,
  ]);

  const level3Stage = useMemo<StageConfig>(() => {
    if (status !== "connected" || !address || !hasSigner) {
      return {
        badge: "Wallet required",
        title: "Attach the operator wallet first.",
        description:
          "Level 3 needs a connected signer so the board can derive the guild authority PDA, open the per-player state, and delegate into the attacker program.",
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
        onAction: toStageAction(mutateLevel3State),
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
        onAction: toStageAction(handleInitGuildAuthority),
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
        onAction: toStageAction(handleInitLevel3),
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
        onAction: toStageAction(handleDelegateTask),
      };
    }

    return {
      badge: "Verify",
      title: "Prove the guild executed your malicious orders.",
      description:
        "Verification checks that your reward account received the bounty amount, then flips `completed_levels[3]` and closes the Level 3 instance.",
      actionLabel: "Verify and close",
      actionKind: "primary",
      onAction: toStageAction(handleVerifyLevel3),
    };
  }, [
    address,
    handleDelegateTask,
    handleInitGuildAuthority,
    handleInitLevel3,
    handleVerifyLevel3,
    hasSigner,
    isLevel3Loading,
    level3Completed,
    level3DelegationReady,
    level3Error,
    level3State,
    mutateLevel3State,
    status,
  ]);

  const levelTiles = useMemo(() => {
    const level1DepositReady =
      (level1State?.depositedAmount ?? 0n) >= LEVEL_1_TARGET || level1Completed;

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
    level1State?.depositedAmount,
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

  return {
    level1Stage,
    level2Stage,
    level3Stage,
    levelTiles,
    stage,
  };
}
