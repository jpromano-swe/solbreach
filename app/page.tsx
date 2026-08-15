"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Address } from "@solana/kit";
import { toast } from "sonner";
import { AppHeader } from "./components/app-header";
import { BadgeEarnedDialog } from "./components/badge-earned-dialog";
import { BetaAccessSection } from "./components/beta-access-section";
import { BreachRoomsSection } from "./components/breach-rooms-section";
import { CertificateMintLoader } from "./components/certificate-mint-loader";
import { FutureVulnerabilityPanel } from "./components/future-vulnerability-panel";
import { GridBackground } from "./components/grid-background";
import { LandingPageSection } from "./components/landing-page-section";
import { Level1Panel } from "./components/level-1-panel";
import { Level2Panel } from "./components/level-2-panel";
import { Level3Panel } from "./components/level-3-panel";
import { LevelWorkspacePage } from "./components/level-workspace";
import { ProfileCertificatesSection } from "./components/profile-certificates-section";
import {
  ResearchLabCertificationDialog,
  type ResearchLabCertificationDialogState,
} from "./components/research-lab-certification-dialog";
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
import { readStoredBackendWalletAuth } from "./lib/levels/level1-backend";
import { useSolanaClient } from "./lib/solana-client-context";
import { useWallet } from "./lib/wallet/context";
import { trackAnalyticsEvent } from "./lib/analytics";
import {
  getLevelBadge,
  type UserBadge,
  type UserBadgesSummary,
} from "./lib/badges";
import type {
  ProfileCertificate,
  ProfileCertificatesSummary,
} from "./lib/certificates/profile-certificates";

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
type ResearchLabCertificateLevel = 1 | 2 | 3;
type ResearchLabCertificateMintDialogState = {
  description: string;
  label: string;
};
type ProfileIdentity = {
  address?: string;
  avatarSrc?: string;
  name: string;
};

const PROFILE_IDENTITY_STORAGE_PREFIX = "solbreach-profile";

const RESEARCH_LAB_CERTIFICATE_DETAILS: Record<
  ResearchLabCertificateLevel,
  {
    certificateId: string;
    certificateNumber: number;
    description: string;
    imageUri: string;
    metadataUri: string;
    nextLevel: "level1" | "level2" | "level3";
    title: string;
  }
> = {
  1: {
    certificateId: "solbreach-level-1",
    certificateNumber: 1,
    description:
      "You completed the Account Substitution lab, proved how unbound collateral accounts can create illegitimate credit, and minted the Research Lab certificate.",
    imageUri: "/nfts/level-1-nobg.png",
    metadataUri: "/certificates/metadata/level-1.json",
    nextLevel: "level2",
    title: "The Illusionist",
  },
  2: {
    certificateId: "solbreach-level-2",
    certificateNumber: 2,
    description:
      "You completed the Yield Hijack lab, proved how static PDA derivation can expose a staking position, and minted the Research Lab certificate.",
    imageUri: "/nfts/level-2-nobg.png",
    metadataUri: "/certificates/metadata/level-2.json",
    nextLevel: "level3",
    title: "The Identity Thief",
  },
  3: {
    certificateId: "solbreach-level-3",
    certificateNumber: 3,
    description:
      "You completed the Delegated CPI lab, proved the exploit path, and minted the Research Lab certificate.",
    imageUri: "/nfts/level-3-nobg.png",
    metadataUri: "/certificates/metadata/level-3.json",
    nextLevel: "level3",
    title: "The Trojan Horse",
  },
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function getStoredProfileIdentity(address?: string): ProfileIdentity | null {
  if (!address || typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(
      `${PROFILE_IDENTITY_STORAGE_PREFIX}:${address}`
    );
    if (!stored) return null;

    const parsed = JSON.parse(stored) as Partial<ProfileIdentity>;
    return {
      address,
      avatarSrc:
        typeof parsed.avatarSrc === "string" ? parsed.avatarSrc : undefined,
      name: typeof parsed.name === "string" ? parsed.name : "",
    };
  } catch {
    return null;
  }
}

function storeProfileIdentity(identity: ProfileIdentity) {
  if (!identity.address || typeof window === "undefined") return;

  window.localStorage.setItem(
    `${PROFILE_IDENTITY_STORAGE_PREFIX}:${identity.address}`,
    JSON.stringify({
      avatarSrc: identity.avatarSrc,
      name: identity.name,
    })
  );
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
  const [manualBadgeDialog, setManualBadgeDialog] = useState<UserBadge | null>(
    null
  );
  const [profileIdentity, setProfileIdentity] = useState<ProfileIdentity>({
    name: "",
  });
  const [researchLabCertificationDialog, setResearchLabCertificationDialog] =
    useState<ResearchLabCertificationDialogState | null>(null);
  const [
    researchLabCertificateMintDialog,
    setResearchLabCertificateMintDialog,
  ] = useState<ResearchLabCertificateMintDialogState | null>(null);
  const [isCollectingLevel1Badge, setIsCollectingLevel1Badge] = useState(false);
  const [isCollectingLevel2Badge, setIsCollectingLevel2Badge] = useState(false);
  const [researchLabsMenuResetKey, setResearchLabsMenuResetKey] = useState(0);
  const trackedLevelViewsRef = useRef<Set<string>>(new Set());
  const storedProfileIdentity = useMemo(
    () => (address ? getStoredProfileIdentity(address) : null),
    [address]
  );
  const activeProfileIdentity =
    profileIdentity.address === address
      ? profileIdentity
      : (storedProfileIdentity ?? {
          address,
          name: "",
        });
  const profileName = activeProfileIdentity.name;
  const profileAvatarSrc = activeProfileIdentity.avatarSrc;
  const handleProfileNameChange = useCallback(
    (nextProfileName: string) => {
      if (!address) return;

      setProfileIdentity((current) => {
        const nextProfile = {
          address,
          avatarSrc:
            current.address === address ? current.avatarSrc : undefined,
          name: nextProfileName,
        };
        storeProfileIdentity(nextProfile);
        return nextProfile;
      });
    },
    [address]
  );
  const handleProfileAvatarChange = useCallback(
    (nextProfileAvatarSrc: string) => {
      if (!address) return;

      setProfileIdentity((current) => {
        const currentProfile =
          current.address === address
            ? current
            : getStoredProfileIdentity(address);
        const nextProfile = {
          address,
          avatarSrc: nextProfileAvatarSrc,
          name: currentProfile?.name ?? "",
        };
        storeProfileIdentity(nextProfile);
        return nextProfile;
      });
    },
    [address]
  );

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
    backendCertificateMintedAtByLevel,
    effectiveCertificateState,
    handleResearchLabCertificateMinted,
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

  const level1Badge = getLevelBadge(badges, 1);
  const level2Badge = getLevelBadge(badges, 2);
  const level3Badge = getLevelBadge(badges, 3);
  const level4Badge = getLevelBadge(badges, 4);
  const level5Badge = getLevelBadge(badges, 5);
  const level1Completed = Boolean(level1Badge?.earned);
  const level2Completed =
    Boolean(level0State?.completedLevels[2]) || level2BackendCompleted;
  const level3Completed =
    Boolean(level0State?.completedLevels[3]) || level3BackendCompleted;
  const level4Completed = Boolean(level4Badge?.earned);
  const level5Completed = Boolean(level5Badge?.earned);
  const researchLabCertificateState =
    effectiveCertificateState ?? certificateState;
  const level0Certificate = researchLabCertificateState?.[0];
  const level1Certificate = researchLabCertificateState?.[1];
  const level2Certificate = researchLabCertificateState?.[2];
  const level3Certificate = researchLabCertificateState?.[3];
  const profileCertificateMintedLevels = useMemo(
    () =>
      new Set(
        profileCertificates
          .filter((certificate) => certificate.minted)
          .map((certificate) => certificate.level)
      ),
    [profileCertificates]
  );
  const researchLab1Certified =
    Boolean(level1Certificate?.minted) || profileCertificateMintedLevels.has(1);
  const researchLab2Certified =
    Boolean(level2Certificate?.minted) || profileCertificateMintedLevels.has(2);
  const breachRoomsUnlocked = researchLab1Certified && researchLab2Certified;
  const badgesForDisplay = useMemo(
    () =>
      badges.map((badge) => {
        const shouldHidePowerUser =
          badge.slug === "power-user" && !researchLab1Certified;
        const shouldHideUncollectedLevel2 =
          badge.slug === "level-2-identity-thief" &&
          badge.earned &&
          !badge.seenAt;

        if (!shouldHidePowerUser && !shouldHideUncollectedLevel2) {
          return badge;
        }

        return {
          ...badge,
          earned: false,
          earnedAt: null,
          seenAt: null,
        };
      }),
    [badges, researchLab1Certified]
  );
  const badgeSummaryForDisplay = useMemo<UserBadgesSummary | null>(() => {
    if (!badgeSummary && badgesForDisplay.length === 0) return null;

    return {
      earned: badgesForDisplay.filter((badge) => badge.earned).length,
      powerUserEarned: Boolean(
        badgesForDisplay.find((badge) => badge.slug === "power-user")?.earned
      ),
      total: badgeSummary?.total ?? badgesForDisplay.length,
    };
  }, [badgeSummary, badgesForDisplay]);
  const profileCertificatesForDisplay = useMemo(() => {
    const byLevel = new Map(
      profileCertificates.map((certificate) => [certificate.level, certificate])
    );
    const certificatesByLevel = {
      1: level1Certificate,
      2: level2Certificate,
      3: level3Certificate,
    } satisfies Record<
      ResearchLabCertificateLevel,
      typeof level1Certificate | undefined
    >;

    for (const level of [1, 2, 3] as const) {
      const certificate = certificatesByLevel[level];
      if (!certificate?.minted || !certificate.assetId) continue;

      const current = byLevel.get(level);
      const details = RESEARCH_LAB_CERTIFICATE_DETAILS[level];
      const mintedCertificate: ProfileCertificate = {
        assetId: String(certificate.assetId),
        certificateId: current?.certificateId ?? details.certificateId,
        certificateNumber:
          current?.certificateNumber ?? details.certificateNumber,
        certificatePda: certificate.certificatePda
          ? String(certificate.certificatePda)
          : null,
        imageUri: current?.minted ? current.imageUri : details.imageUri,
        level,
        metadataUri: current?.metadataUri ?? details.metadataUri,
        minted: true,
        mintedAt: current?.mintedAt ?? backendCertificateMintedAtByLevel[level],
        status: "minted",
        title: current?.title ?? details.title,
      };

      byLevel.set(level, mintedCertificate);
    }

    return Array.from(byLevel.values()).sort(
      (a, b) => a.certificateNumber - b.certificateNumber
    );
  }, [
    backendCertificateMintedAtByLevel,
    level1Certificate,
    level2Certificate,
    level3Certificate,
    profileCertificates,
  ]);
  const profileCertificateSummaryForDisplay =
    useMemo<ProfileCertificatesSummary | null>(() => {
      if (
        !profileCertificateSummary &&
        profileCertificatesForDisplay.length === 0
      ) {
        return null;
      }

      const minted = profileCertificatesForDisplay.filter(
        (certificate) => certificate.minted
      ).length;
      const total =
        profileCertificateSummary?.total ||
        profileCertificatesForDisplay.length;

      return {
        minted: Math.max(profileCertificateSummary?.minted ?? 0, minted),
        total,
      };
    }, [profileCertificateSummary, profileCertificatesForDisplay]);
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

  const {
    mintingLevel,
    mintLevel1,
    mintResearchLabLevel2,
    mintResearchLabLevel3,
  } = useCertificateMinting({
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
    onResearchLabCertificateMinted: handleResearchLabCertificateMinted,
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
      level1BackendCompleted,
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
      level4Completed,
      level5Completed,
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
    level4Completed,
    level5Completed,
    level3StageBadge: level3Stage.badge,
    level3State,
    levelTiles,
    badges: badgesForDisplay,
    stageBadge: stage.badge,
    status,
  });

  const unseenEarnedBadge =
    badgesForDisplay.find(
      (badge) =>
        badge.earned &&
        !badge.seenAt &&
        badge.slug !== "level-1-illusionist" &&
        badge.slug !== "level-2-identity-thief"
    ) ?? null;
  const activeBadgeDialog = researchLabCertificationDialog
    ? null
    : (manualBadgeDialog ?? unseenEarnedBadge);

  const closeBadgeDialog = useCallback(() => {
    if (manualBadgeDialog) {
      setManualBadgeDialog(null);
      return;
    }

    if (!unseenEarnedBadge) return;
    void markBadgeSeen(unseenEarnedBadge.slug);
  }, [manualBadgeDialog, markBadgeSeen, unseenEarnedBadge]);

  const collectLevel1Badge = useCallback(async () => {
    if (isCollectingLevel1Badge) return;

    const currentBadge = level1Badge?.earned
      ? level1Badge
      : (await mutateBadges())?.badges.find(
          (badge) => badge.slug === "level-1-illusionist"
        );

    if (!currentBadge?.earned) {
      toast.error("Badge is still syncing. Try again in a moment.");
      return;
    }

    setIsCollectingLevel1Badge(true);
    setManualBadgeDialog(currentBadge);

    try {
      if (!currentBadge.seenAt) {
        await markBadgeSeen(currentBadge.slug);
      }
      await mutateBadges();
    } finally {
      setIsCollectingLevel1Badge(false);
    }
  }, [isCollectingLevel1Badge, level1Badge, markBadgeSeen, mutateBadges]);

  const collectLevel2Badge = useCallback(async () => {
    if (isCollectingLevel2Badge) return;

    const currentBadge = level2Badge
      ? level2Badge
      : (await mutateBadges())?.badges.find(
          (badge) => badge.slug === "level-2-identity-thief"
        );

    if (currentBadge?.seenAt) {
      setManualBadgeDialog(currentBadge);
      return;
    }

    if (
      !currentBadge ||
      !(
        currentBadge.earned ||
        (level2BackendCompleted && Boolean(level2TxSignature))
      )
    ) {
      toast.error("Badge is still syncing. Try again in a moment.");
      return;
    }

    setIsCollectingLevel2Badge(true);

    try {
      await markBadgeSeen("level-2-identity-thief");
      const refreshedBadges = await mutateBadges();
      const collectedBadge =
        refreshedBadges?.badges.find(
          (badge) => badge.slug === "level-2-identity-thief"
        ) ?? currentBadge;

      setManualBadgeDialog({
        ...collectedBadge,
        earned: true,
        earnedAt: collectedBadge.earnedAt ?? new Date().toISOString(),
        seenAt: collectedBadge.seenAt ?? new Date().toISOString(),
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsCollectingLevel2Badge(false);
    }
  }, [
    isCollectingLevel2Badge,
    level2BackendCompleted,
    level2Badge,
    level2TxSignature,
    markBadgeSeen,
    mutateBadges,
  ]);

  const mintResearchLabCertificate = useCallback(
    async ({
      certificateLevel,
      researchLabAccessToken,
      researchLabSessionId,
    }: {
      certificateLevel: ResearchLabCertificateLevel;
      researchLabAccessToken: string;
      researchLabSessionId: string;
    }) => {
      const certificateDetails =
        RESEARCH_LAB_CERTIFICATE_DETAILS[certificateLevel];

      setResearchLabCertificateMintDialog({
        description: `${certificateDetails.title} is being recorded for your wallet. Please keep this window open.`,
        label: "NFT certificate is being minted",
      });

      try {
        const result =
          certificateLevel === 2
            ? await mintResearchLabLevel2({
                researchLabAccessToken,
                researchLabSessionId,
              })
            : certificateLevel === 3
              ? await mintResearchLabLevel3({
                  researchLabAccessToken,
                  researchLabSessionId,
                })
              : await mintLevel1({
                  researchLabAccessToken,
                  researchLabSessionId,
                });

        if (!result) return;

        handleResearchLabCertificateMinted({
          assetId: result.assetId,
          certificatePda: result.certificatePda,
          level: certificateLevel,
          leafIndex: result.leafIndex,
          leafNonce: result.leafNonce,
          merkleTree: result.merkleTree,
        });

        const [badgePayload] = await Promise.all([
          mutateBadges(),
          mutateProfileCertificates(),
        ]);
        const powerBadge =
          certificateLevel === 1
            ? (badgePayload?.badges.find(
                (badge) => badge.slug === "power-user"
              ) ??
              badges.find((badge) => badge.slug === "power-user") ??
              null)
            : null;

        setResearchLabCertificationDialog({
          assetId: result.assetId,
          certificateImage: certificateDetails.imageUri,
          certificateTitle: certificateDetails.title,
          description: certificateDetails.description,
          nextLevel: certificateDetails.nextLevel,
          powerBadge: powerBadge?.earned ? powerBadge : null,
          showPowerBadge: certificateLevel === 1,
        });
      } finally {
        setResearchLabCertificateMintDialog(null);
      }
    },
    [
      badges,
      handleResearchLabCertificateMinted,
      mintLevel1,
      mintResearchLabLevel2,
      mintResearchLabLevel3,
      mutateBadges,
      mutateProfileCertificates,
    ]
  );

  const closeResearchLabCertificationDialog = useCallback(() => {
    const powerBadge = researchLabCertificationDialog?.powerBadge;
    setResearchLabCertificationDialog(null);

    if (powerBadge?.earned && !powerBadge.seenAt) {
      void markBadgeSeen(powerBadge.slug);
    }
  }, [markBadgeSeen, researchLabCertificationDialog]);

  const enterLevel1FromBeta = useCallback(() => {
    setActiveSection("levels");
    setActiveLevelsView("level1");
  }, [setActiveLevelsView, setActiveSection]);

  const openBetaAccess = useCallback(() => {
    setActiveSection("beta-access");
    setActiveLevelsView("landing");
  }, [setActiveLevelsView, setActiveSection]);

  const hasRegisteredWalletSession = useCallback(() => {
    if (status !== "connected" || !address) return false;

    const storedAuth = readStoredBackendWalletAuth();

    return (
      storedAuth?.walletAddress === address && Boolean(storedAuth.accessToken)
    );
  }, [address, status]);

  const requireRegisteredWallet = useCallback(
    (navigate: () => void) => {
      if (!hasRegisteredWalletSession()) {
        openBetaAccess();
        return;
      }

      navigate();
    },
    [hasRegisteredWalletSession, openBetaAccess]
  );

  useEffect(() => {
    const protectedSection =
      activeSection === "profile" ||
      activeSection === "vulnerabilities" ||
      activeSection === "research-labs" ||
      (activeSection === "levels" && activeLevelsView !== "landing");

    if (!protectedSection) return;
    if (!hasRegisteredWalletSession()) {
      openBetaAccess();
    }
  }, [
    activeLevelsView,
    activeSection,
    hasRegisteredWalletSession,
    openBetaAccess,
  ]);

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
    if (
      !level1BackendCompleted &&
      !level1Completed &&
      !level2Completed &&
      !level3Completed
    ) {
      return;
    }

    void mutateBadges();
  }, [
    level1BackendCompleted,
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
          onOpenProfile={() =>
            requireRegisteredWallet(() => setActiveSection("profile"))
          }
          onSelectBreachRooms={() =>
            requireRegisteredWallet(() => setActiveSection("breach-rooms"))
          }
          onSelectResearchLabs={() =>
            requireRegisteredWallet(() => {
              setActiveSection("research-labs");
              setResearchLabsMenuResetKey((key) => key + 1);
            })
          }
          onSelectVulnerabilities={() =>
            requireRegisteredWallet(() => setActiveSection("vulnerabilities"))
          }
          onSelectLevel={(level) =>
            requireRegisteredWallet(() => {
              setActiveSection("levels");
              setActiveLevelsView(level);
            })
          }
          profileDisplayName={profileName.trim() || undefined}
          profileImageSrc={profileAvatarSrc}
          breachRoomsUnlocked={breachRoomsUnlocked}
          walletStatus={status}
        />

        <main
          className={
            activeSection === "research-labs" ||
            activeSection === "vulnerabilities" ||
            activeSection === "breach-rooms"
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
                  documentationUrl={SOLBREACH_DOCUMENTATION_URL}
                />
              ) : activeGuide && activeLevelStatus ? (
                <div className="space-y-8">
                  {activeLevel === "level1" ? (
                    <Level1Panel
                      key={`${address ?? "no-wallet"}:${level1Completed ? "complete" : "active"}`}
                      address={address}
                      copied={copied}
                      isCollectingLevel1Badge={isCollectingLevel1Badge}
                      isLoading={isLevel1PanelLoading}
                      isSending={isSending || isLevel1BackendBusy}
                      level1BadgeCollected={Boolean(level1Badge?.seenAt)}
                      level1BadgeEarned={
                        Boolean(level1Badge?.earned) ||
                        (level1BackendCompleted && Boolean(level1TxSignature))
                      }
                      level1Error={level1PanelError}
                      level1State={level1PanelState}
                      onCollectLevel1Badge={collectLevel1Badge}
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
                      isCollectingLevel2Badge={isCollectingLevel2Badge}
                      isLoading={isLevel2Loading}
                      isSending={isSending}
                      level2BadgeCollected={Boolean(level2Badge?.seenAt)}
                      level2BadgeEarned={
                        Boolean(level2Badge?.earned) ||
                        (level2BackendCompleted && Boolean(level2TxSignature))
                      }
                      level2Completed={level2Completed}
                      level2Error={level2Error}
                      level2InitialCommander={DEFAULT_LEVEL_2_COMMANDER}
                      level2State={level2State}
                      onCollectLevel2Badge={collectLevel2Badge}
                      onInitGlobalProfile={handleInitGlobalProfile}
                      onInitLevel2={handleInitLevel2}
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
                  ) : activeLevel === "level4" || activeLevel === "level5" ? (
                    <FutureVulnerabilityPanel
                      address={address}
                      badges={badges}
                      guide={activeGuide}
                      levelId={activeLevel}
                      onBadgeSeen={markBadgeSeen}
                      onBadgeStateChanged={() => mutateBadges()}
                      status={status}
                      wallet={wallet}
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
                                requireRegisteredWallet(() => {
                                  setActiveLevelsView("level1");
                                });
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
              isCollectingLevel1Badge={isCollectingLevel1Badge}
              menuResetKey={researchLabsMenuResetKey}
              mintingResearchLabCertificateLevel={
                mintingLevel === "level1"
                  ? 1
                  : mintingLevel === "level2"
                    ? 2
                    : mintingLevel === "level3"
                      ? 3
                      : null
              }
              level1BadgeCollected={Boolean(level1Badge?.seenAt)}
              level1BadgeEarned={Boolean(level1Badge?.earned)}
              level2BadgeCollected={Boolean(level2Badge?.seenAt)}
              level3BadgeCollected={Boolean(level3Badge?.seenAt)}
              powerUserBadgeEarned={Boolean(
                badgesForDisplay.find((badge) => badge.slug === "power-user")
                  ?.earned
              )}
              researchLabCertificateMintedByLevel={{
                1: researchLab1Certified,
                2: researchLab2Certified,
                3: Boolean(level3Certificate?.minted),
              }}
              onBadgeStateChanged={() => {
                void mutateBadges();
              }}
              onContinueToLevel2={() => {
                requireRegisteredWallet(() => {
                  setActiveSection("levels");
                  setActiveLevelsView("level2");
                });
              }}
              onContinueToLevel3={() => {
                requireRegisteredWallet(() => {
                  setActiveSection("levels");
                  setActiveLevelsView("level3");
                });
              }}
              onGoToLevel1Module={() =>
                requireRegisteredWallet(enterLevel1FromBeta)
              }
              onGoToLevel2Module={() => {
                requireRegisteredWallet(() => {
                  setActiveSection("levels");
                  setActiveLevelsView("level2");
                });
              }}
              onGoToLevel3Module={() => {
                requireRegisteredWallet(() => {
                  setActiveSection("levels");
                  setActiveLevelsView("level3");
                });
              }}
              onMintResearchLabCertificate={mintResearchLabCertificate}
            />
          ) : activeSection === "vulnerabilities" ? (
            <VulnerabilitiesSection
              completedLevels={{
                level1: level1Completed,
                level2: level2Completed || Boolean(level2Badge?.earned),
                level3: level3Completed || Boolean(level3Badge?.earned),
              }}
              onSelectLevel={(level) =>
                requireRegisteredWallet(() => {
                  setActiveSection("levels");
                  setActiveLevelsView(level);
                })
              }
            />
          ) : activeSection === "breach-rooms" ? (
            <BreachRoomsSection
              onOpenProfile={() =>
                requireRegisteredWallet(() => setActiveSection("profile"))
              }
              profileDisplayName={profileName.trim() || undefined}
              profileImageSrc={profileAvatarSrc}
            />
          ) : (
            <section className="space-y-8">
              <div className="max-w-3xl space-y-4">
                <h1 className="text-5xl font-semibold tracking-[-0.08em] sm:text-6xl">
                  Profile.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
                  User&apos;s badges, certificates and Special Rewards for level
                  completion.
                </p>
              </div>

              <ProfileCertificatesSection
                address={address}
                badges={badgesForDisplay}
                badgeSummary={badgeSummaryForDisplay}
                certificates={profileCertificatesForDisplay}
                certificateSummary={profileCertificateSummaryForDisplay}
                getExplorerUrl={getExplorerUrl}
                isBadgeLoading={isBadgeLoading}
                isLoading={isProfileCertificatesLoading}
                onProfileAvatarChange={handleProfileAvatarChange}
                onProfileNameChange={handleProfileNameChange}
                onSelectLevel={(level) =>
                  requireRegisteredWallet(() => {
                    setActiveSection("levels");
                    setActiveLevelsView(level);
                  })
                }
                profileAvatarSrc={profileAvatarSrc}
                profileName={profileName}
              />
            </section>
          )}
        </main>

        <SiteFooter documentationUrl={SOLBREACH_DOCUMENTATION_URL} />
      </div>
      <BadgeEarnedDialog
        badge={activeBadgeDialog}
        onClose={closeBadgeDialog}
        onOpenProfile={() => {
          closeBadgeDialog();
          requireRegisteredWallet(() => setActiveSection("profile"));
        }}
        onOpenResearchLab={() => {
          closeBadgeDialog();
          requireRegisteredWallet(() => {
            setActiveSection("research-labs");
            setResearchLabsMenuResetKey((key) => key + 1);
          });
        }}
      />
      {researchLabCertificateMintDialog ? (
        <CertificateMintLoader
          description={researchLabCertificateMintDialog.description}
          label={researchLabCertificateMintDialog.label}
          variant="modal"
        />
      ) : null}
      <ResearchLabCertificationDialog
        reward={researchLabCertificationDialog}
        onClose={closeResearchLabCertificationDialog}
        onOpenNextModule={() => {
          const nextLevel =
            researchLabCertificationDialog?.nextLevel ?? "level2";
          closeResearchLabCertificationDialog();
          requireRegisteredWallet(() => {
            setActiveSection("levels");
            setActiveLevelsView(nextLevel);
          });
        }}
        onOpenProfile={() => {
          closeResearchLabCertificationDialog();
          requireRegisteredWallet(() => setActiveSection("profile"));
        }}
      />
    </div>
  );
}
