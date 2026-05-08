"use client";

import { useCallback, useMemo, useState } from "react";
import {
  address as toAddress,
  isAddress,
  lamports as sol,
  type Address,
  type Instruction,
} from "@solana/kit";
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
import { lamportsToSolString } from "./lib/lamports";
import { useSolanaClient } from "./lib/solana-client-context";
import { useWallet } from "./lib/wallet/context";
import {
  fetchMaybeBankConfig,
  fetchMaybeLevel0State,
  fetchMaybeLevel1State,
  fetchMaybeLevel2State,
  fetchMaybeUserProfile,
  fetchMaybeUserStats,
  findBankPda,
  findLevel1StatePda,
  findLevel2StatePda,
  findProfilePda,
  getDepositTokensInstructionAsync,
  getInitBankInstructionAsync,
  getInitGlobalProfileInstructionAsync,
  getInitLevel0InstructionAsync,
  getInitLevel1InstructionAsync,
  getInitLevel2InstructionAsync,
  getInitUserStatsInstructionAsync,
  getUpdateProfileInstructionAsync,
  getVerifyAndCloseLevel0InstructionAsync,
  getVerifyAndCloseLevel1InstructionAsync,
  getVerifyAndCloseLevel2InstructionAsync,
} from "./generated/vault";

type LevelId = "level0" | "level1" | "level2" | "level3";
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

const LEVEL_1_TARGET = 1_000_000n;
const DEFAULT_LEVEL_2_COMMANDER =
  "11111111111111111111111111111111" as Address;

export default function Home() {
  const { wallet, signer, status } = useWallet();
  const { cluster, getExplorerUrl } = useCluster();
  const client = useSolanaClient();
  const { send, isSending } = useSendTransaction();

  const address = wallet?.account.address;
  const walletBalance = useBalance(address);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<LevelId>("level0");
  const [level1ExpectedMint, setLevel1ExpectedMint] = useState("");
  const [level1Vault, setLevel1Vault] = useState("");
  const [level1UserTokenAccount, setLevel1UserTokenAccount] = useState("");
  const [level1Amount, setLevel1Amount] = useState("1000000");
  const [level2InitialCommander, setLevel2InitialCommander] = useState<string>(
    DEFAULT_LEVEL_2_COMMANDER
  );

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

  const copyText = useCallback(async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1400);
  }, []);

  const refreshState = useCallback(async () => {
    await Promise.all([
      mutateLevel0State(),
      mutateLevel1State(),
      mutateLevel2State(),
      walletBalance.mutate(),
    ]);
  }, [mutateLevel0State, mutateLevel1State, mutateLevel2State, walletBalance]);

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
      throw new Error("Deposit amount must be a whole number of raw token units.");
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

  const handleAirdrop = useCallback(async () => {
    if (!address) return;

    try {
      toast.info("Requesting 1 SOL on devnet/localnet...");
      const signature = await client.airdrop(address, sol(1_000_000_000n));
      await walletBalance.mutate();

      toast.success("Wallet funded.", {
        description: signature ? (
          <a
            href={getExplorerUrl(`/tx/${signature}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            View funding transaction
          </a>
        ) : undefined,
      });
    } catch (err) {
      console.error("Airdrop failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      const rateLimited =
        message.includes("429") || message.includes("Internal JSON-RPC error");

      toast.error(
        rateLimited
          ? "Devnet faucet is rate-limited right now."
          : "Could not fund the wallet.",
        rateLimited
          ? {
              description: (
                <a
                  href="https://faucet.solana.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Open faucet.solana.com
                </a>
              ),
            }
          : undefined
      );
    }
  }, [address, client, getExplorerUrl, walletBalance]);

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

  const handleMintLevel1Flag = useCallback(() => {
    toast.success("Level 1 mint unlocked.", {
      description:
        "Completion is on-chain now. The real cNFT mint is the next backend step.",
    });
  }, []);

  const handleMintLevel2Flag = useCallback(() => {
    toast.success("Level 2 mint unlocked.", {
      description:
        "Completion is on-chain now. The real cNFT mint is the next backend step.",
    });
  }, []);

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

  const level1Completed = Boolean(level0State?.completedLevels[1]);
  const level2Completed = Boolean(level0State?.completedLevels[2]);
  const level1DepositReady =
    (level1State?.depositedAmount ?? 0n) >= LEVEL_1_TARGET;
  const level2Hijacked = Boolean(address && level2State?.commander === address);

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
  ]);

  const progressValue = useMemo(() => {
    if (status !== "connected" || !address) return 0;
    if (isLevel0Loading || level0Error) return 15;
    if (!level0State?.hasUserStats) return 33;
    if (!level0State.hasLevel0State && !level0State.isCompleted) return 66;
    if (level0State.isCompleted) return 100;
    return 92;
  }, [address, isLevel0Loading, level0Error, level0State, status]);

  const walletBalanceLabel =
    walletBalance.lamports != null
      ? `${lamportsToSolString(walletBalance.lamports)} SOL`
      : "Loading";

  const stepStates = useMemo<[StepState, StepState, StepState]>(() => {
    if (!level0State?.hasUserStats) return ["active", "idle", "idle"];
    if (level0State.isCompleted) return ["done", "done", "done"];
    if (!level0State.hasLevel0State) return ["done", "active", "idle"];
    return ["done", "done", "active"];
  }, [level0State]);

  const levelTiles = useMemo<LevelTileConfig[]>(() => {
    const level0Status: LevelStatus = level0State?.isCompleted
      ? "cleared"
      : level0State?.hasLevel0State
        ? "live"
        : "ready";

    const level1Status: LevelStatus = level1Completed
      ? "cleared"
      : level1DepositReady
        ? "armed"
        : level1State?.hasLevel1State
          ? "live"
          : level0State?.isCompleted
            ? "ready"
            : "locked";

    const level2Status: LevelStatus = level2Completed
      ? "cleared"
      : level2Hijacked
        ? "armed"
        : level2State?.hasProfile || level2State?.hasLevel2State
          ? "live"
          : level0State?.isCompleted
            ? "ready"
            : "locked";

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
        label: "Exploit",
        title: "Illusionist",
        status: level1Status,
        summary: "Exploit the missing mint constraint and forge the ledger.",
      },
      {
        id: "level2",
        index: "02",
        label: "Exploit",
        title: "Identity Thief",
        status: level2Status,
        summary: "Hijack the global profile PDA and become commander.",
      },
      {
        id: "level3",
        index: "03",
        label: "Locked",
        title: "Trojan Horse",
        status: "locked",
        summary: "Arbitrary CPI route with local validator testing.",
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
  ]);

  const operatorLevelsUnlocked = Boolean(level0State?.isCompleted);
  const activeLevel = operatorLevelsUnlocked ? selectedLevel : "level0";
  const selectedTile = useMemo(
    () => levelTiles.find((tile) => tile.id === activeLevel) ?? levelTiles[0],
    [activeLevel, levelTiles]
  );
  const selectedStageLabel = useMemo(() => {
    switch (activeLevel) {
      case "level0":
        return stage.badge;
      case "level1":
        return level1Stage.badge;
      case "level2":
        return level2Stage.badge;
      default:
        return "Locked";
    }
  }, [activeLevel, level1Stage.badge, level2Stage.badge, stage.badge]);

  const clusterModeLabel =
    cluster === "localnet" ? "operator mode" : "browser mode";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <GridBackground />

      <div className="relative z-10">
        <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <div className="flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-semibold tracking-tight">
            Level 0 live
          </div>

          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.32em] text-muted">
              Rustopia
            </p>
            <p className="text-2xl font-semibold tracking-[-0.05em]">
              SolBreach
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <ClusterSelect />
            <WalletButton />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
          <section className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-muted">
              Solana wargame
            </p>
            <h1 className="mt-6 text-6xl font-semibold tracking-[-0.08em] sm:text-7xl lg:text-8xl">
              SolBreach
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-muted sm:text-lg">
              Clear the browser-safe warmup, then move into three local operator
              levels. The UI becomes the board: choose a level, inspect state,
              and only unlock mint controls after the exploit is actually proven.
            </p>
          </section>

          <section className="mt-12">
            <div className="mx-auto max-w-5xl space-y-8">
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-muted">
                    Warmup
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.06em] sm:text-4xl">
                    Clear the handshake first.
                  </h2>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                    Level 0 is the gate. It proves the registry and per-level
                    PDA flow before the exploit levels become available.
                  </p>
                </div>

                <div className="mx-auto max-w-sm">
                  <LevelTile
                    tile={levelTiles[0]}
                    selected={activeLevel === "level0"}
                    onSelect={() => setSelectedLevel("level0")}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-muted">
                    Operator levels
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.06em] sm:text-4xl">
                    Three levels unlock after the warmup.
                  </h2>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                    Once Level 0 is completed, the board opens the local
                    operator path: exploit, verify, then mint.
                  </p>
                </div>

                {operatorLevelsUnlocked ? (
                  <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-3">
                    {levelTiles.slice(1).map((tile) => (
                      <LevelTile
                        key={tile.id}
                        tile={tile}
                        selected={tile.id === activeLevel}
                        onSelect={() => setSelectedLevel(tile.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[26px] border border-border bg-card/90 px-6 py-8 text-center shadow-[0_24px_80px_-60px_rgba(0,0,0,0.45)]">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
                      Locked
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">
                      Finish Level 0 to reveal Levels 1–3.
                    </h3>
                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted">
                      The exploit levels should not appear as actionable until
                      the warmup PDA flow is cleared. This keeps the board aligned
                      with the real progression contract.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="mt-12">
            <div className="rounded-[34px] border border-border bg-card/95 p-5 shadow-[0_32px_100px_-70px_rgba(0,0,0,0.45)] sm:p-7">
              <div className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill>{selectedTile.index}</Pill>
                    <Pill>{selectedTile.label}</Pill>
                    <Pill>{statusLabel(selectedTile.status)}</Pill>
                  </div>
                  <div>
                    <h2 className="text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
                      {selectedTile.title}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                      {selectedTile.summary}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
                  <MiniStat label="Cluster" value={cluster} detail={clusterModeLabel} />
                  <MiniStat
                    label="Wallet"
                    value={status === "connected" ? "Attached" : "Detached"}
                    detail={walletBalanceLabel}
                  />
                  <MiniStat
                    label="Stage"
                    value={selectedStageLabel}
                    detail="Current gate"
                  />
                </div>
              </div>

              <div className="mt-6">
                {activeLevel === "level0" ? (
                  <Level0Panel
                    address={address}
                    copied={copied}
                    getExplorerUrl={getExplorerUrl}
                    handleAirdrop={handleAirdrop}
                    isLevel0Loading={isLevel0Loading}
                    isSending={isSending}
                    level0Error={level0Error}
                    level0State={level0State}
                    onCopy={copyText}
                    progressValue={progressValue}
                    stage={stage}
                    stepStates={stepStates}
                    status={status}
                  />
                ) : null}

                {activeLevel === "level1" ? (
                  <Level1Panel
                    address={address}
                    copied={copied}
                    getExplorerUrl={getExplorerUrl}
                    isSending={isSending}
                    isLoading={isLevel1Loading}
                    level1Amount={level1Amount}
                    level1Completed={level1Completed}
                    level1Error={level1Error}
                    level1ExpectedMint={level1ExpectedMint}
                    level1State={level1State}
                    level1UserTokenAccount={level1UserTokenAccount}
                    level1Vault={level1Vault}
                    onChangeAmount={setLevel1Amount}
                    onChangeExpectedMint={setLevel1ExpectedMint}
                    onChangeUserTokenAccount={setLevel1UserTokenAccount}
                    onChangeVault={setLevel1Vault}
                    onCopy={copyText}
                    onInitBank={handleInitBank}
                    onInitLevel1={handleInitLevel1}
                    onMint={handleMintLevel1Flag}
                    onDeposit={handleDepositLevel1}
                    onVerify={handleVerifyLevel1}
                    stage={level1Stage}
                    status={status}
                  />
                ) : null}

                {activeLevel === "level2" ? (
                  <Level2Panel
                    address={address}
                    copied={copied}
                    getExplorerUrl={getExplorerUrl}
                    isSending={isSending}
                    isLoading={isLevel2Loading}
                    level2Completed={level2Completed}
                    level2Error={level2Error}
                    level2InitialCommander={level2InitialCommander}
                    level2State={level2State}
                    onChangeInitialCommander={setLevel2InitialCommander}
                    onCopy={copyText}
                    onInitGlobalProfile={handleInitGlobalProfile}
                    onInitLevel2={handleInitLevel2}
                    onMint={handleMintLevel2Flag}
                    onUpdateProfile={handleUpdateProfile}
                    onVerify={handleVerifyLevel2}
                    stage={level2Stage}
                    status={status}
                  />
                ) : null}

                {activeLevel === "level3" ? (
                  <LockedLevelPanel
                    copied={copied}
                    title="Trojan Horse"
                    description="Level 3 should look and feel like the final operator exam: local validator, proof transaction, and a mint gate that only opens after the verifier confirms the arbitrary CPI path."
                    hint="Design target: arbitrary CPI and forged execution path."
                    onCopy={copyText}
                  />
                ) : null}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function Level0Panel({
  address,
  copied,
  getExplorerUrl,
  handleAirdrop,
  isLevel0Loading,
  isSending,
  level0Error,
  level0State,
  onCopy,
  progressValue,
  stage,
  stepStates,
  status,
}: {
  address?: string;
  copied: string | null;
  getExplorerUrl: (path: string) => string;
  handleAirdrop: () => Promise<void>;
  isLevel0Loading: boolean;
  isSending: boolean;
  level0Error: unknown;
  level0State?: Level0Snapshot;
  onCopy: (label: string, value: string) => Promise<void>;
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
          <InlineStep index="01" label="Create registry" state={stepStates[0]} />
          <InlineStep index="02" label="Initialize level" state={stepStates[1]} />
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
              explorerUrl={address ? getExplorerUrl(`/address/${address}`) : null}
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
        </div>
      </aside>
    </div>
  );
}

function Level1Panel({
  address,
  copied,
  getExplorerUrl,
  isLoading,
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
  copied: string | null;
  getExplorerUrl: (path: string) => string;
  isLoading: boolean;
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

          <p className="mt-3 text-sm leading-6 text-muted">{stage.description}</p>

          <div className="mt-5 rounded-[22px] border border-border bg-card/80 p-4">
            <div className="space-y-4">
              <AddressRow
                label="Wallet"
                value={address}
                copied={copied === "level1-wallet-address"}
                explorerUrl={address ? getExplorerUrl(`/address/${address}`) : null}
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
              disabled={!level1Completed}
              className="min-h-13 w-full rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-accent disabled:text-muted"
            >
              {level1Completed ? "Mint Level 1 flag" : "Mint locked"}
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

function Level2Panel({
  address,
  copied,
  getExplorerUrl,
  isLoading,
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
  copied: string | null;
  getExplorerUrl: (path: string) => string;
  isLoading: boolean;
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
  const commanderCaptured = Boolean(address && level2State?.commander === address);

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
              state={level2Completed ? "done" : commanderCaptured ? "active" : "idle"}
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

          <p className="mt-3 text-sm leading-6 text-muted">{stage.description}</p>

          <div className="mt-5 rounded-[22px] border border-border bg-card/80 p-4">
            <div className="space-y-4">
              <AddressRow
                label="Wallet"
                value={address}
                copied={copied === "level2-wallet-address"}
                explorerUrl={address ? getExplorerUrl(`/address/${address}`) : null}
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
                      ? getExplorerUrl(`/address/${level2InitialCommander.trim()}`)
                      : null
                }
                onCopy={
                  level2State?.commander || level2InitialCommander.trim()
                    ? () => {
                        void onCopy(
                          "level2-commander",
                          level2State?.commander ?? level2InitialCommander.trim()
                        );
                      }
                    : undefined
                }
              />
              <StatusTextRow
                label="Status"
                value={commanderCaptured ? "Commander hijacked" : "Awaiting overwrite"}
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
              disabled={!level2Completed}
              className="min-h-13 w-full rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-accent disabled:text-muted"
            >
              {level2Completed ? "Mint Level 2 flag" : "Mint locked"}
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

function LockedLevelPanel({
  copied,
  description,
  hint,
  onCopy,
  title,
}: {
  copied: string | null;
  description: string;
  hint: string;
  onCopy: (label: string, value: string) => Promise<void>;
  title: string;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <BriefCard
          eyebrow="Queued level"
          title={`Design the ${title} shell before wiring the exploit.`}
          body={description}
        />

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
                Operator runbook
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Keep the exact same local workflow structure: local keypair,
                local validator, proof transaction, verifier, mint unlock.
              </p>
            </div>
            <Pill>Locked</Pill>
          </div>

          <div className="mt-5 grid gap-3">
            <CommandBlock
              label="Generate operator keypair"
              command="solana-keygen new -o .keys/player.json"
              copied={copied === "cmd-keygen"}
              onCopy={() => {
                void onCopy("cmd-keygen", "solana-keygen new -o .keys/player.json");
              }}
            />
            <CommandBlock
              label="Point Solana CLI to localhost"
              command="solana config set --keypair .keys/player.json --url localhost"
              copied={copied === "cmd-config"}
              onCopy={() => {
                void onCopy(
                  "cmd-config",
                  "solana config set --keypair .keys/player.json --url localhost"
                );
              }}
            />
            <CommandBlock
              label="Run local validator"
              command="solana-test-validator --reset"
              copied={copied === "cmd-validator"}
              onCopy={() => {
                void onCopy("cmd-validator", "solana-test-validator --reset");
              }}
            />
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
            Level brief
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">{hint}</p>
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
            Mint gate
          </p>
          <button
            disabled
            className="mt-5 min-h-13 w-full rounded-full bg-accent px-5 text-sm font-medium text-muted"
          >
            Mint locked
          </button>
        </div>
      </aside>
    </div>
  );
}

function LevelTile({
  onSelect,
  selected,
  tile,
}: {
  onSelect: () => void;
  selected: boolean;
  tile: LevelTileConfig;
}) {
  const tone = selected
    ? "border-foreground bg-foreground text-background"
    : "border-border bg-card/90 text-foreground hover:border-foreground/25 hover:bg-card";

  const statusTone = selected
    ? "bg-background/12 text-background"
    : "bg-accent text-muted";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-h-[170px] rounded-[22px] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${tone}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${statusTone}`}
        >
          {tile.index}
        </span>
        <span className="text-[11px] uppercase tracking-[0.24em] opacity-70">
          {statusLabel(tile.status)}
        </span>
      </div>

      <div className="mt-10">
        <p className="text-[11px] uppercase tracking-[0.28em] opacity-70">
          {tile.label}
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">
          {tile.title}
        </h3>
        <p className="mt-3 text-sm leading-6 opacity-78">{tile.summary}</p>
      </div>
    </button>
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
      <p className="text-[11px] uppercase tracking-[0.28em] text-muted">{label}</p>
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
      <p className="text-[11px] uppercase tracking-[0.28em] text-muted">{label}</p>
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
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone}`}>
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
      <p className="text-[11px] uppercase tracking-[0.28em] text-muted">{eyebrow}</p>
      <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
    </article>
  );
}

function CommandBlock({
  label,
  command,
  copied,
  onCopy,
}: {
  label: string;
  command: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-[22px] border border-border bg-card/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
            {label}
          </p>
          <code className="mt-3 block overflow-x-auto font-mono text-sm text-foreground">
            {command}
          </code>
        </div>
        <button
          onClick={onCopy}
          className="min-h-10 rounded-full border border-border px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted transition hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {copied ? "Done" : "Copy"}
        </button>
      </div>
    </div>
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

function StatusTextRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
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
  return <div className={`animate-pulse rounded-[20px] bg-accent ${className}`} />;
}

function compactAddress(address: string) {
  if (address.length <= 18) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
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
