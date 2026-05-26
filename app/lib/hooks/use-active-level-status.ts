"use client";

import { useMemo } from "react";
import type { Address } from "@solana/kit";
import type { LevelCertificateSnapshot } from "../certificates/certificate-state";
import type { MissionStatusData } from "../../components/level-workspace";
import { compactAddress } from "../../components/level-ui";
import {
  getStatusLabel,
  type LevelId,
  type LevelTileConfig,
} from "../levels/course-status";
import type {
  Level0Snapshot,
  Level1Snapshot,
  Level2Snapshot,
  Level3Snapshot,
} from "../levels/level-state";
import type { ClusterMoniker } from "../solana-client";

const LEVEL_1_TARGET = 1_000_000n;
const LEVEL_3_DEFAULT_TARGET = 1_000_000n;

function getMintState({
  activeLevel,
  isMinted,
  level0Completed,
  level1Completed,
  level2Completed,
  level3Completed,
  mintingLevel,
  onMintLevel0,
  onMintLevel1,
  onMintLevel2,
  onMintLevel3,
}: {
  activeLevel: LevelId;
  isMinted: boolean;
  level0Completed?: boolean;
  level1Completed: boolean;
  level2Completed: boolean;
  level3Completed: boolean;
  mintingLevel: LevelId | null;
  onMintLevel0: () => void;
  onMintLevel1: () => void;
  onMintLevel2: () => void;
  onMintLevel3: () => void;
}) {
  if (isMinted) {
    return {
      mintDisabled: true,
      mintLabel: "Certification Minted",
      onMint: () => {},
    };
  }

  const config = {
    level0: {
      completed: Boolean(level0Completed),
      onMint: onMintLevel0,
    },
    level1: {
      completed: level1Completed,
      onMint: onMintLevel1,
    },
    level2: {
      completed: level2Completed,
      onMint: onMintLevel2,
    },
    level3: {
      completed: level3Completed,
      onMint: onMintLevel3,
    },
  }[activeLevel];

  const isMinting = mintingLevel === activeLevel;

  return {
    mintDisabled: !config.completed || isMinting,
    mintLabel: isMinting
      ? "Minting..."
      : config.completed
        ? "Unlock Certification"
        : "Mint Locked",
    onMint: config.onMint,
  };
}

function walletRow(status: string, address?: Address) {
  return {
    label: "Wallet",
    value: status === "connected" ? compactAddress(address ?? "") : "Detached",
  };
}

export function useActiveLevelStatus({
  activeLevel,
  address,
  cluster,
  level0Certificate,
  level0State,
  level1Certificate,
  level1CertificationMinted,
  level1Completed,
  level1StageBadge,
  level1State,
  level2Certificate,
  level2Completed,
  level2Hijacked,
  level2StageBadge,
  level2State,
  level3Certificate,
  level3Completed,
  level3StageBadge,
  level3State,
  levelTiles,
  mintingLevel,
  onMintLevel0,
  onMintLevel1,
  onMintLevel2,
  onMintLevel3,
  stageBadge,
  status,
}: {
  activeLevel: LevelId | null;
  address?: Address;
  cluster: ClusterMoniker;
  level0Certificate?: LevelCertificateSnapshot;
  level0State?: Level0Snapshot;
  level1Certificate?: LevelCertificateSnapshot;
  level1CertificationMinted: boolean;
  level1Completed: boolean;
  level1StageBadge: string;
  level1State?: Level1Snapshot;
  level2Certificate?: LevelCertificateSnapshot;
  level2Completed: boolean;
  level2Hijacked: boolean;
  level2StageBadge: string;
  level2State?: Level2Snapshot;
  level3Certificate?: LevelCertificateSnapshot;
  level3Completed: boolean;
  level3StageBadge: string;
  level3State?: Level3Snapshot;
  levelTiles: LevelTileConfig[];
  mintingLevel: LevelId | null;
  onMintLevel0: () => void;
  onMintLevel1: () => void;
  onMintLevel2: () => void;
  onMintLevel3: () => void;
  stageBadge: string;
  status: string;
}): MissionStatusData | null {
  return useMemo(() => {
    if (!activeLevel) {
      return null;
    }

    const activeTile =
      levelTiles.find((tile) => tile.id === activeLevel) ?? null;
    const activeCertificate =
      {
        level0: level0Certificate,
        level1: level1Certificate,
        level2: level2Certificate,
        level3: level3Certificate,
      }[activeLevel] ?? null;
    const activeLevelCertificateMinted =
      activeLevel === "level1"
        ? level1CertificationMinted
        : Boolean(activeCertificate?.minted);
    const mintState = getMintState({
      activeLevel,
      isMinted: activeLevelCertificateMinted,
      level0Completed: level0State?.isCompleted,
      level1Completed,
      level2Completed,
      level3Completed,
      mintingLevel,
      onMintLevel0,
      onMintLevel1,
      onMintLevel2,
      onMintLevel3,
    });

    const chipLabel = activeTile ? getStatusLabel(activeTile.status) : "Ready";
    const baseRows = [
      { label: "Cluster", value: cluster },
      walletRow(status, address),
    ];

    switch (activeLevel) {
      case "level0": {
        const progressValue =
          status !== "connected" || !address
            ? 0
            : !level0State?.hasUserStats
              ? 33
              : !level0State.hasLevel0State && !level0State.isCompleted
                ? 66
                : level0State.isCompleted
                  ? 100
                  : 92;

        return {
          badge: stageBadge,
          chipLabel,
          ...mintState,
          progressValue,
          rows: [
            ...baseRows,
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
      }
      case "level1":
        return {
          badge: level1StageBadge,
          chipLabel,
          ...mintState,
          progressValue: Math.min(
            Number(
              ((level1State?.depositedAmount ?? 0n) * 100n) / LEVEL_1_TARGET
            ),
            100
          ),
          rows: [
            ...baseRows,
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
          badge: level2StageBadge,
          chipLabel,
          ...mintState,
          progressValue: level2Completed ? 100 : level2Hijacked ? 66 : 20,
          rows: [
            ...baseRows,
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
          badge: level3StageBadge,
          chipLabel,
          ...mintState,
          progressValue: Math.min(
            Number(
              ((level3State?.rewardAmount ?? 0n) * 100n) /
                (level3State?.bountyAmount || LEVEL_3_DEFAULT_TARGET)
            ),
            100
          ),
          rows: [
            ...baseRows,
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
    address,
    cluster,
    level0Certificate,
    level0State,
    level1Certificate,
    level1CertificationMinted,
    level1Completed,
    level1StageBadge,
    level1State,
    level2Certificate,
    level2Completed,
    level2Hijacked,
    level2StageBadge,
    level2State,
    level3Certificate,
    level3Completed,
    level3StageBadge,
    level3State,
    levelTiles,
    mintingLevel,
    onMintLevel0,
    onMintLevel1,
    onMintLevel2,
    onMintLevel3,
    stageBadge,
    status,
  ]);
}
