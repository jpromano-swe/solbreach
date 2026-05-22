"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import {
  address as toAddress,
  isAddress,
  type Address,
  type Instruction,
} from "@solana/kit";
import useSWR from "swr";
import { toast } from "sonner";
import { GridBackground } from "./components/grid-background";
import { ClusterSelect } from "./components/cluster-select";
import { HeaderCourseNav } from "./components/course-nav";
import { LandingPageSection } from "./components/landing-page-section";
import { Level1Panel } from "./components/level-1-panel";
import { LevelWorkspacePage } from "./components/level-workspace";
import { compactAddress } from "./components/level-ui";
import { ProfileCertificatesSection } from "./components/profile-certificates-section";
import { ResearchLabsSection } from "./components/research-labs-section";
import { SiteFooter } from "./components/site-footer";
import { ThemeToggle } from "./components/theme-toggle";
import { WalletButton } from "./components/wallet-button";
import { useCluster } from "./components/cluster-context";
import { parseTransactionError } from "./lib/errors";
import {
  fetchCertificateCollection,
  findCertificatePdaForUser,
  type CertificateCollection,
  type LevelCertificateSnapshot,
} from "./lib/certificates/certificate-state";
import { LEVEL_GUIDES } from "./lib/levels/level-guides";
import { useBalance } from "./lib/hooks/use-balance";
import { useSendTransaction } from "./lib/hooks/use-send-transaction";
import {
  buildLevelTiles,
  getStatusLabel,
  type LevelId,
  type LevelsView,
} from "./lib/levels/course-status";
import {
  ensureLevel1DemoAuth,
  executeLevel1ExploitTransaction,
  fetchLevel1BackendStatus,
  setupLevel1,
  startLevel1,
  submitLevel1Proof,
  type Level1AuthSession,
  type Level1Challenge,
} from "./lib/levels/level1-backend";
import {
  fetchLevel0Snapshot,
  fetchLevel1Snapshot,
  fetchLevel2Snapshot,
  fetchLevel3Snapshot,
  type Level0Snapshot,
  type Level1Snapshot,
  type Level2Snapshot,
  type Level3Snapshot,
} from "./lib/levels/level-state";
import { getClusterUrl } from "./lib/solana-client";
import { useSolanaClient } from "./lib/solana-client-context";
import { useWallet } from "./lib/wallet/context";
import {
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

type RootSection = "levels" | "research-labs" | "profile";

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
const LEVEL_1_LOG_PREFIX = "[SolBreach Level 1]";
const MERCENARY_FOLLOW_ORDERS_DISCRIMINATOR = new Uint8Array([
  222, 50, 96, 140, 105, 24, 81, 44,
]);

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function logLevel1FrontendError(label: string, error: unknown) {
  console.error(`${LEVEL_1_LOG_PREFIX} ${label}`, error);
  if (error instanceof Error && error.stack) {
    console.error(`${LEVEL_1_LOG_PREFIX} ${label} stack`, error.stack);
  }
}

export default function Home() {
  const { wallet, signer, status } = useWallet();
  const { cluster, getExplorerUrl } = useCluster();
  const client = useSolanaClient();
  const { send, isSending } = useSendTransaction();

  const address = wallet?.account.address;
  const walletBalance = useBalance(address);
  const [activeSection, setActiveSection] = useState<RootSection>("levels");
  const [activeLevelsView, setActiveLevelsView] =
    useState<LevelsView>("landing");
  const [level1ExpectedMint] = useState("");
  const [level1Vault] = useState("");
  const [level1UserTokenAccount] = useState("");
  const [level1Amount] = useState("1000000");
  const [level1BackendAuth, setLevel1BackendAuth] =
    useState<Level1AuthSession | null>(null);
  const [level1Challenge, setLevel1Challenge] =
    useState<Level1Challenge | null>(null);
  const [level1TxSignature, setLevel1TxSignature] = useState<string | null>(
    null
  );
  const [isLevel1BackendBusy, setIsLevel1BackendBusy] = useState(false);
  const [level1RuntimeError, setLevel1RuntimeError] = useState<string | null>(
    null
  );
  const [
    level1BackendCertificateMinted,
    setLevel1BackendCertificateMinted,
  ] = useState(false);
  const [level2InitialCommander] = useState<string>(DEFAULT_LEVEL_2_COMMANDER);
  const [level3RewardMint] = useState("");
  const [level3BountyVault] = useState("");
  const [level3UserRewardAccount] = useState("");
  const [level3ExternalProgram] = useState("");
  const [level3Amount] = useState("1000000");
  const [mintingLevel, setMintingLevel] = useState<LevelId | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = useCallback(async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1600);
  }, []);

  const {
    data: level0State,
    error: level0Error,
    isLoading: isLevel0Loading,
    mutate: mutateLevel0State,
  } = useSWR(
    signer && address ? (["level0-state", cluster, address] as const) : null,
    async (): Promise<Level0Snapshot> => {
      return fetchLevel0Snapshot({
        rpc: client.rpc,
        user: signer!,
      });
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
      return fetchLevel1Snapshot({
        playerAddress: address!,
        rpc: client.rpc,
      });
    },
    { revalidateOnFocus: true }
  );

  const {
    data: level1BackendStatus,
    error: level1BackendError,
    isLoading: isLevel1BackendLoading,
    mutate: mutateLevel1BackendStatus,
  } = useSWR(
    level1BackendAuth
      ? (["level1-backend-status", level1BackendAuth.accessToken] as const)
      : null,
    async (): Promise<Awaited<ReturnType<typeof fetchLevel1BackendStatus>>> => {
      return fetchLevel1BackendStatus(level1BackendAuth!.accessToken);
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
      return fetchLevel2Snapshot({
        playerAddress: address!,
        rpc: client.rpc,
      });
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
      return fetchLevel3Snapshot({
        playerAddress: address!,
        rewardAccountInput: level3UserRewardAccount,
        rpc: client.rpc,
      });
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
      return fetchCertificateCollection({
        playerAddress: address!,
        rpc: client.rpc,
      });
    },
    { revalidateOnFocus: true }
  );

  const refreshState = useCallback(async () => {
    await Promise.all([
      mutateLevel0State(),
      mutateLevel1State(),
      mutateLevel1BackendStatus(),
      mutateLevel2State(),
      mutateLevel3State(),
      mutateCertificateState(),
      walletBalance.mutate(),
    ]);
  }, [
    mutateCertificateState,
    mutateLevel0State,
    mutateLevel1BackendStatus,
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

  const ensureLevel1BackendSession = useCallback(async () => {
    if (status !== "connected" || !address) {
      throw new Error("Connect your wallet before starting Level 1.");
    }

    const auth = await ensureLevel1DemoAuth(address);
    setLevel1BackendAuth(auth);
    return auth;
  }, [address, status]);

  const ensureLevel1Started = useCallback(async (accessToken: string) => {
    try {
      await startLevel1(accessToken);
    } catch (error) {
      const message = parseTransactionError(error).toLowerCase();
      if (
        !message.includes("active") &&
        !message.includes("already") &&
        !message.includes("started")
      ) {
        throw error;
      }
    }
  }, []);

  const handleSetupLevel1Backend = useCallback(async () => {
    if (!address) return;

    setIsLevel1BackendBusy(true);
    setLevel1RuntimeError(null);
    try {
      const auth = await ensureLevel1BackendSession();
      await ensureLevel1Started(auth.accessToken);
      const setup = await setupLevel1(auth.accessToken, address);
      console.info(`${LEVEL_1_LOG_PREFIX} challenge payload received`, setup);
      setLevel1Challenge(setup.challenge);
      await mutateLevel1BackendStatus();
      toast.success("Level 1 exploit challenge prepared.");
    } catch (error) {
      logLevel1FrontendError("challenge setup failed", error);
      const message = getErrorMessage(error);
      setLevel1RuntimeError(message);
      toast.error(message);
      throw error;
    } finally {
      setIsLevel1BackendBusy(false);
    }
  }, [
    address,
    ensureLevel1BackendSession,
    ensureLevel1Started,
    mutateLevel1BackendStatus,
  ]);

  const handleRunLevel1BackendExploit = useCallback(async () => {
    if (!address || !wallet) return;

    setIsLevel1BackendBusy(true);
    setLevel1RuntimeError(null);
    try {
      const auth = await ensureLevel1BackendSession();
      await ensureLevel1Started(auth.accessToken);
      const setup =
        level1Challenge && level1BackendStatus?.level_session_id
          ? {
              challenge: level1Challenge,
              level_session_id: level1BackendStatus.level_session_id,
            }
          : await setupLevel1(auth.accessToken, address);

      console.info(`${LEVEL_1_LOG_PREFIX} challenge payload received`, setup);
      setLevel1Challenge(setup.challenge);

      const signature = await executeLevel1ExploitTransaction({
        challenge: setup.challenge,
        wallet,
      });
      setLevel1TxSignature(signature);

      console.info(`${LEVEL_1_LOG_PREFIX} backend submit start`, {
        level_session_id: setup.level_session_id,
        transaction_signature: signature,
        wallet_address: address,
      });
      await submitLevel1Proof(auth.accessToken, {
        level_session_id: setup.level_session_id,
        transaction_signature: signature,
        wallet_address: address,
      });
      await mutateLevel1BackendStatus();

      toast.success("Level 1 exploit verified by backend.");
    } catch (error) {
      logLevel1FrontendError("exploit flow failed", error);
      const message = getErrorMessage(error);
      setLevel1RuntimeError(message);
      toast.error(message);
      throw error;
    } finally {
      setIsLevel1BackendBusy(false);
    }
  }, [
    address,
    ensureLevel1BackendSession,
    ensureLevel1Started,
    level1BackendStatus,
    level1Challenge,
    mutateLevel1BackendStatus,
    wallet,
  ]);

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

  const level1BackendCompleted = Boolean(level1BackendStatus?.completed);
  const level1Completed =
    Boolean(level0State?.completedLevels[1]) || level1BackendCompleted;
  const level2Completed = Boolean(level0State?.completedLevels[2]);
  const level3Completed = Boolean(level0State?.completedLevels[3]);
  const level0Certificate = certificateState?.[0];
  const level1Certificate = certificateState?.[1];
  const level2Certificate = certificateState?.[2];
  const level3Certificate = certificateState?.[3];
  const level1CertificationMinted =
    Boolean(level1Certificate?.minted) || level1BackendCertificateMinted;
  const level1DepositReady =
    (level1State?.depositedAmount ?? 0n) >= LEVEL_1_TARGET ||
    level1BackendCompleted;
  const level2Hijacked = Boolean(address && level2State?.commander === address);
  const level3DelegationReady =
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

  const mintLevelCertificate = useCallback(
    async ({
      backendAccessToken,
      level,
      levelId,
      existingCertificate,
      title,
    }: {
      backendAccessToken?: string;
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
        const canMintFromBackendCompletion =
          level === 1 && Boolean(backendAccessToken);

        if (!existingCertificate?.exists && !canMintFromBackendCompletion) {
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
            backendAccessToken,
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

        if (level === 1 && backendAccessToken) {
          setLevel1BackendCertificateMinted(true);
        }

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

  const progressValue = useMemo(() => {
    if (status !== "connected" || !address) return 0;
    if (isLevel0Loading || level0Error) return 15;
    if (!level0State?.hasUserStats) return 33;
    if (!level0State.hasLevel0State && !level0State.isCompleted) return 66;
    if (level0State.isCompleted) return 100;
    return 92;
  }, [address, isLevel0Loading, level0Error, level0State, status]);

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
    const activeLevelCertificateMinted =
      activeLevel === "level1"
        ? level1CertificationMinted
        : Boolean(activeCertificate?.minted);
    const mintState = activeLevelCertificateMinted
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
          chipLabel: activeTile ? getStatusLabel(activeTile.status) : "Ready",
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
          chipLabel: activeTile ? getStatusLabel(activeTile.status) : "Ready",
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
          chipLabel: activeTile ? getStatusLabel(activeTile.status) : "Ready",
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
          chipLabel: activeTile ? getStatusLabel(activeTile.status) : "Ready",
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
    level1CertificationMinted,
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
                certificateState={certificateState}
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
