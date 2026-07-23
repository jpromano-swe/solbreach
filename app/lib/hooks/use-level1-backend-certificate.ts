"use client";

import { useCallback, useMemo, useState } from "react";
import { address as toAddress, isAddress, type Address } from "@solana/kit";
import type {
  CertificateCollection,
  LevelCertificateSnapshot,
} from "../certificates/certificate-state";
import type { ClusterMoniker } from "../solana-client";

type ResearchLabCertificateLevel = 1 | 2 | 3;

type ResearchLabCertificateRecord = {
  assetId: string;
  certificatePda: string;
  cluster: string;
  level: ResearchLabCertificateLevel;
  leafIndex: number | null;
  leafNonce: string | null;
  merkleTree: string | null;
  mintedAt: string;
  walletAddress: string;
};

type BackendCertificatePayload = {
  assetId: string;
  certificatePda: string;
  level: ResearchLabCertificateLevel;
  leafIndex: number | null;
  leafNonce: string | null;
  merkleTree: string | null;
};

const STORAGE_PREFIX = "solbreach.researchLab.backendCertificate";
const LEGACY_LEVEL_1_STORAGE_PREFIX = "solbreach.level1.backendCertificate";

function storageKey({
  cluster,
  level,
  walletAddress,
}: {
  cluster: string;
  level: ResearchLabCertificateLevel;
  walletAddress: string;
}) {
  return `${STORAGE_PREFIX}:${cluster}:${walletAddress}:level${level}`;
}

function legacyLevel1StorageKey({
  cluster,
  walletAddress,
}: {
  cluster: string;
  walletAddress: string;
}) {
  return `${LEGACY_LEVEL_1_STORAGE_PREFIX}:${cluster}:${walletAddress}`;
}

function toSnapshot(
  record: ResearchLabCertificateRecord | null
): LevelCertificateSnapshot | null {
  if (
    !record ||
    !isAddress(record.assetId) ||
    !isAddress(record.certificatePda)
  ) {
    return null;
  }

  return {
    assetId: toAddress(record.assetId),
    certificatePda: toAddress(record.certificatePda),
    exists: true,
    leafIndex: record.leafIndex,
    leafNonce: record.leafNonce ? BigInt(record.leafNonce) : null,
    level: record.level,
    merkleTree:
      record.merkleTree && isAddress(record.merkleTree)
        ? toAddress(record.merkleTree)
        : null,
    minted: true,
  };
}

export function useLevel1BackendCertificate({
  address,
  certificateState,
  cluster,
}: {
  address?: Address;
  certificateState?: CertificateCollection;
  cluster: ClusterMoniker;
}) {
  const [overrides, setOverrides] = useState<
    Partial<Record<ResearchLabCertificateLevel, ResearchLabCertificateRecord>>
  >({});

  const recordsByLevel = useMemo(() => {
    if (!address) return null;

    const records: Partial<
      Record<ResearchLabCertificateLevel, ResearchLabCertificateRecord>
    > = {};

    for (const level of [1, 2, 3] as const) {
      const override = overrides[level];
      if (override?.walletAddress === address && override.cluster === cluster) {
        records[level] = override;
      }
    }

    if (typeof window === "undefined") return null;

    for (const level of [1, 2, 3] as const) {
      if (records[level]) continue;

      try {
        const raw =
          window.localStorage.getItem(
            storageKey({
              cluster,
              level,
              walletAddress: address,
            })
          ) ||
          (level === 1
            ? window.localStorage.getItem(
                legacyLevel1StorageKey({
                  cluster,
                  walletAddress: address,
                })
              )
            : null);
        if (!raw) continue;

        const parsed = JSON.parse(raw) as Partial<ResearchLabCertificateRecord>;
        records[level] = {
          ...parsed,
          level,
        } as ResearchLabCertificateRecord;
      } catch {
        continue;
      }
    }

    return records;
  }, [address, cluster, overrides]);

  const snapshotsByLevel = useMemo(() => {
    if (!recordsByLevel) return {};

    return Object.fromEntries(
      ([1, 2, 3] as const).map((level) => [
        level,
        toSnapshot(recordsByLevel[level] ?? null),
      ])
    ) as Partial<Record<ResearchLabCertificateLevel, LevelCertificateSnapshot>>;
  }, [recordsByLevel]);

  const effectiveCertificateState = useMemo(() => {
    if (!certificateState) return certificateState;

    const nextState: CertificateCollection = { ...certificateState };
    let changed = false;

    for (const level of [1, 2, 3] as const) {
      const snapshot = snapshotsByLevel[level];
      if (!snapshot || certificateState[level]?.minted) continue;
      nextState[level] = snapshot;
      changed = true;
    }

    return changed ? nextState : certificateState;
  }, [certificateState, snapshotsByLevel]);

  const handleMinted = useCallback(
    (payload: BackendCertificatePayload) => {
      if (!address) return;

      const nextRecord: ResearchLabCertificateRecord = {
        ...payload,
        cluster,
        mintedAt: new Date().toISOString(),
        walletAddress: address,
      };

      setOverrides((current) => ({
        ...current,
        [payload.level]: nextRecord,
      }));

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          storageKey({
            cluster,
            level: payload.level,
            walletAddress: address,
          }),
          JSON.stringify(nextRecord)
        );
      }
    },
    [address, cluster]
  );

  return {
    effectiveCertificateState,
    backendCertificateMintedAtByLevel: {
      1: recordsByLevel?.[1]?.mintedAt ?? null,
      2: recordsByLevel?.[2]?.mintedAt ?? null,
      3: recordsByLevel?.[3]?.mintedAt ?? null,
    },
    backendCertificateSnapshots: snapshotsByLevel,
    handleResearchLabCertificateMinted: handleMinted,
    level1BackendCertificateMintedAt: recordsByLevel?.[1]?.mintedAt ?? null,
    level1BackendCertificateSnapshot: snapshotsByLevel[1] ?? null,
    handleLevel1BackendCertificateMinted: (payload: Omit<BackendCertificatePayload, "level">) =>
      handleMinted({ ...payload, level: 1 }),
  };
}
