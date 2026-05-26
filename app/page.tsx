"use client";

import { useCallback, useMemo, useState } from "react";
import { type Address } from "@solana/kit";
import { AppHeader } from "./components/app-header";
import { GridBackground } from "./components/grid-background";
import { LandingPageSection } from "./components/landing-page-section";
import { Level1Panel } from "./components/level-1-panel";
import { Level2Panel } from "./components/level-2-panel";
import { Level3Panel } from "./components/level-3-panel";
import { LevelWorkspacePage } from "./components/level-workspace";
import { ProfileCertificatesSection } from "./components/profile-certificates-section";
import { ResearchLabsSection } from "./components/research-labs-section";
import { SiteFooter } from "./components/site-footer";
import { useCluster } from "./components/cluster-context";
import { type CertificateCollection } from "./lib/certificates/certificate-state";
import { LEVEL_GUIDES } from "./lib/levels/level-guides";
import { useActiveLevelStatus } from "./lib/hooks/use-active-level-status";
import { useBalance } from "./lib/hooks/use-balance";
import { useCertificateMinting } from "./lib/hooks/use-certificate-minting";
import { useLevelChainActions } from "./lib/hooks/use-level-chain-actions";
import { useLevel1BackendCertificate } from "./lib/hooks/use-level1-backend-certificate";
import { useLevel1BackendExecution } from "./lib/hooks/use-level1-backend-execution";
import { useLevel1PanelState } from "./lib/hooks/use-level1-panel-state";
import { useLevel2BackendExecution } from "./lib/hooks/use-level2-backend-execution";
import { useLevel3BackendExecution } from "./lib/hooks/use-level3-backend-execution";
import { useLevelRoute } from "./lib/hooks/use-level-route";
import { useLevelSnapshots } from "./lib/hooks/use-level-snapshots";
import { useLevelStageConfigs } from "./lib/hooks/use-level-stage-configs";
import { useSendTransaction } from "./lib/hooks/use-send-transaction";
import { buildLevelTiles } from "./lib/levels/course-status";
import { useSolanaClient } from "./lib/solana-client-context";
import { useWallet } from "./lib/wallet/context";

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
  const { isLevel1PanelLoading, level1PanelError, level1PanelState } =
    useLevel1PanelState({
      defaultBankPda: DEFAULT_LEVEL_2_COMMANDER,
      isLevel1BackendBusy,
      isLevel1BackendLoading,
      isLevel1Loading,
      level1BackendCompleted,
      level1BackendError,
      level1BackendStatus,
      level1Challenge,
      level1Error,
      level1State,
    });

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

  const { level1Stage, level2Stage, level3Stage, stage } = useLevelStageConfigs(
    {
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
      hasSigner: Boolean(signer),
      hasWallet: Boolean(wallet),
      isLevel0Loading,
      isLevel1BackendBusy,
      isLevel1BackendLoading,
      isLevel2Loading,
      isLevel3Loading,
      level0Error,
      level0State,
      level1BackendAuthReady: Boolean(level1BackendAuth),
      level1BackendError,
      level1ChallengeReady: Boolean(level1Challenge),
      level1Completed,
      level1RuntimeError,
      level1SessionReady: Boolean(level1BackendStatus?.level_session_id),
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
    }
  );

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
        <AppHeader
          activeLevelsView={activeLevelsView}
          activeSection={activeSection}
          onOpenLanding={() => {
            setActiveSection("levels");
            setActiveLevelsView("landing");
          }}
          onOpenProfile={() => setActiveSection("profile")}
          onSelectResearchLabs={() => setActiveSection("research-labs")}
          onSelectLevel={(level) => {
            setActiveSection("levels");
            setActiveLevelsView(level);
          }}
          walletStatus={status}
        />

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
