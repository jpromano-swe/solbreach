"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Address } from "@solana/kit";
import { AppHeader } from "./components/app-header";
import { BadgeEarnedDialog } from "./components/badge-earned-dialog";
import { BetaAccessSection } from "./components/beta-access-section";
import { GridBackground } from "./components/grid-background";
import { LandingPageSection } from "./components/landing-page-section";
import { Level1Panel } from "./components/level-1-panel";
import { Level2Panel } from "./components/level-2-panel";
import { Level3Panel } from "./components/level-3-panel";
import { LevelWorkspacePage } from "./components/level-workspace";
import { ProfileCertificatesSection } from "./components/profile-certificates-section";
import { ResearchLabsSection } from "./components/research-labs-section";
import { SiteFooter } from "./components/site-footer";
import { VulnerabilitiesSection } from "./components/vulnerabilities-section";
import { useCluster } from "./components/cluster-context";
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
import { useProfileCertificates } from "./lib/hooks/use-profile-certificates";
import { useSendTransaction } from "./lib/hooks/use-send-transaction";
import { useUserBadges } from "./lib/hooks/use-user-badges";
import { useSolanaClient } from "./lib/solana-client-context";
import { useWallet } from "./lib/wallet/context";
import { trackAnalyticsEvent } from "./lib/analytics";

const LEVEL_3_DEFAULT_TARGET = 1_000_000n;
const DEFAULT_LEVEL_1_AMOUNT = "1000000";
const DEFAULT_LEVEL_1_EXPECTED_MINT = "";
const DEFAULT_LEVEL_1_USER_TOKEN_ACCOUNT = "";
const DEFAULT_LEVEL_1_VAULT = "";
const DEFAULT_LEVEL_2_COMMANDER = "11111111111111111111111111111111" as Address;
const DEFAULT_LEVEL_3_AMOUNT = "1000000";
const DEFAULT_LEVEL_3_BOUNTY_VAULT = "";
const DEFAULT_LEVEL_3_EXTERNAL_PROGRAM = "";
const DEFAULT_LEVEL_3_REWARD_ACCOUNT = "";
const DEFAULT_LEVEL_3_REWARD_MINT = "";
const SOLBREACH_DOCUMENTATION_URL =
  "https://solbreach.gitbook.io/documentation";
const ENABLE_APP_ENTRY = process.env.NEXT_PUBLIC_ENABLE_APP_ENTRY === "true";
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
  const [copied, setCopied] = useState<string | null>(null);
  const trackedLevelViewsRef = useRef<Set<string>>(new Set());
  const {
    badges,
    isLoading: isBadgeLoading,
    markSeen: markBadgeSeen,
    mutate: mutateBadges,
    summary: badgeSummary,
  } = useUserBadges({ enabled: status === "connected", wallet });
  const {
    certificates: profileCertificates,
    isLoading: isProfileCertificatesLoading,
    mutate: mutateProfileCertificates,
    summary: profileCertificateSummary,
  } = useProfileCertificates({ enabled: status === "connected", wallet });
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
  const handleCopy = useCallback(async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1600);
  }, []);

  const {
    certificateState,
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
    level3RewardAccountInput: DEFAULT_LEVEL_3_REWARD_ACCOUNT,
    signer,
  });
  const {
    handleLevel1BackendCertificateMinted,
    level1BackendCertificateSnapshot,
  } = useLevel1BackendCertificate({ address, certificateState, cluster });

  const refreshState = useCallback(async () => {
    await Promise.all([
      refreshSnapshots(),
      mutateLevel1BackendStatus(),
      mutateLevel2BackendStatus(),
      mutateLevel3BackendStatus(),
      mutateBadges(),
      mutateProfileCertificates(),
      walletBalance.mutate(),
    ]);
  }, [
    mutateLevel1BackendStatus,
    mutateLevel2BackendStatus,
    mutateLevel3BackendStatus,
    mutateBadges,
    mutateProfileCertificates,
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
    level1Amount: DEFAULT_LEVEL_1_AMOUNT,
    level1ExpectedMint: DEFAULT_LEVEL_1_EXPECTED_MINT,
    level1UserTokenAccount: DEFAULT_LEVEL_1_USER_TOKEN_ACCOUNT,
    level1Vault: DEFAULT_LEVEL_1_VAULT,
    level2InitialCommander: DEFAULT_LEVEL_2_COMMANDER,
    level3Amount: DEFAULT_LEVEL_3_AMOUNT,
    level3BountyVault: DEFAULT_LEVEL_3_BOUNTY_VAULT,
    level3ExternalProgram: DEFAULT_LEVEL_3_EXTERNAL_PROGRAM,
    level3RewardMint: DEFAULT_LEVEL_3_REWARD_MINT,
    level3State,
    level3UserRewardAccount: DEFAULT_LEVEL_3_REWARD_ACCOUNT,
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

  const { mintingLevel, mintLevel1 } =
    useCertificateMinting({
      address,
      certificates: {
        level0Certificate,
        level1Certificate,
        level2Certificate,
        level3Certificate,
      },
      cluster,
      ensureLevel1BackendSession,
      getExplorerUrl,
      level1BackendCompleted,
      onLevel1BackendCertificateMinted: handleLevel1BackendCertificateMinted,
      refreshState,
      send,
      signer,
      wallet,
    });

  const { level1Stage, level2Stage, level3Stage, levelTiles, stage } =
    useLevelStageConfigs({
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
    });

  const activeLevel = activeLevelsView === "landing" ? null : activeLevelsView;
  const activeGuide = activeLevel ? LEVEL_GUIDES[activeLevel] : null;
  const activeLevelStatus = useActiveLevelStatus({
    activeLevel,
    address,
    cluster,
    level0State,
    level1Completed,
    level1StageBadge: level1Stage.badge,
    level1State,
    level2Completed,
    level2Hijacked,
    level2StageBadge: level2Stage.badge,
    level2State,
    level3Completed,
    level3StageBadge: level3Stage.badge,
    level3State,
    levelTiles,
    badges,
    stageBadge: stage.badge,
    status,
  });

  const unseenEarnedBadge =
    badges.find((badge) => badge.earned && !badge.seenAt) ?? null;

  const closeBadgeDialog = useCallback(() => {
    if (!unseenEarnedBadge) return;
    void markBadgeSeen(unseenEarnedBadge.slug);
  }, [markBadgeSeen, unseenEarnedBadge]);

  const enterLevel1FromBeta = useCallback(() => {
    setActiveSection("levels");
    setActiveLevelsView("level1");
  }, [setActiveLevelsView, setActiveSection]);

  useEffect(() => {
    if (activeSection !== "levels" || !activeLevel) return;

    const key = `${activeLevel}:${address ?? "anonymous"}`;
    if (trackedLevelViewsRef.current.has(key)) return;

    trackedLevelViewsRef.current.add(key);
    trackAnalyticsEvent({
      eventName: "level_opened",
      levelId: activeLevel,
      properties: {
        levelTitle: LEVEL_GUIDES[activeLevel].missionTitle,
      },
      walletAddress: address ?? null,
    });
  }, [activeLevel, activeSection, address]);

  useEffect(() => {
    if (status !== "connected") return;
    if (!level1Completed && !level2Completed && !level3Completed) return;

    void mutateBadges();
  }, [
    level1Completed,
    level2Completed,
    level3Completed,
    mutateBadges,
    status,
  ]);

  if (activeSection === "beta-access") {
    return <BetaAccessSection onEnterLevel1={enterLevel1FromBeta} />;
  }

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
          onSelectVulnerabilities={() => setActiveSection("vulnerabilities")}
          onSelectLevel={(level) => {
            setActiveSection("levels");
            setActiveLevelsView(level);
          }}
          walletStatus={status}
        />

        <main
          className={
            activeSection === "research-labs" ||
            activeSection === "vulnerabilities"
              ? "w-full pb-0 pt-0"
              : "mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10"
          }
        >
          {activeSection === "levels" ? (
            <div className="space-y-8">
              {activeLevelsView === "landing" ? (
                <LandingPageSection
                  enableAppEntry={ENABLE_APP_ENTRY}
                  onPlayNow={() => setActiveSection("beta-access")}
                  repositoryUrl={SOLBREACH_DOCUMENTATION_URL}
                />
              ) : activeGuide && activeLevelStatus ? (
                <div className="space-y-8">
                  {activeLevel === "level1" ? (
                    <Level1Panel
                      address={address}
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
                      level2InitialCommander={DEFAULT_LEVEL_2_COMMANDER}
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
            <ResearchLabsSection
              getExplorerUrl={getExplorerUrl}
              isMintingLevel1Certificate={mintingLevel === "level1"}
              level1CertificateAssetId={level1Certificate?.assetId ?? null}
              level1CertificateMinted={Boolean(level1Certificate?.minted)}
              onBadgeStateChanged={() => {
                void mutateBadges();
              }}
              onContinueToLevel2={() => {
                setActiveSection("levels");
                setActiveLevelsView("level2");
              }}
              onMintLevel1Certificate={mintLevel1}
            />
          ) : activeSection === "vulnerabilities" ? (
            <VulnerabilitiesSection
              onSelectLevel={(level) => {
                setActiveSection("levels");
                setActiveLevelsView(level);
              }}
            />
          ) : (
            <section className="space-y-8">
              <div className="max-w-3xl space-y-4">
                <h1 className="text-5xl font-semibold tracking-[-0.08em] sm:text-6xl">
                  Profile.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
                  Backend-earned badges, special rewards, and wallet-bound
                  certificates for this SolBreach account.
                </p>
              </div>

              <ProfileCertificatesSection
                address={address}
                badges={badges}
                badgeSummary={badgeSummary}
                certificates={profileCertificates}
                certificateSummary={profileCertificateSummary}
                getExplorerUrl={getExplorerUrl}
                isBadgeLoading={isBadgeLoading}
                isLoading={isProfileCertificatesLoading}
                onSelectLevel={(level) => {
                  setActiveSection("levels");
                  setActiveLevelsView(level);
                }}
              />
            </section>
          )}
        </main>

        <SiteFooter repositoryUrl={SOLBREACH_DOCUMENTATION_URL} />
      </div>
      <BadgeEarnedDialog
        badge={unseenEarnedBadge}
        onClose={closeBadgeDialog}
        onOpenProfile={() => {
          closeBadgeDialog();
          setActiveSection("profile");
        }}
      />
    </div>
  );
}
