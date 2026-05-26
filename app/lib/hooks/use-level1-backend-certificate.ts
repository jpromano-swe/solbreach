"use client";

import { useCallback, useMemo, useState } from "react";
import { address as toAddress, isAddress, type Address } from "@solana/kit";
import type {
  CertificateCollection,
  LevelCertificateSnapshot,
} from "../certificates/certificate-state";
import type { ClusterMoniker } from "../solana-client";

type Level1BackendCertificateRecord = {
  assetId: string;
  certificatePda: string;
  cluster: string;
  leafIndex: number | null;
  leafNonce: string | null;
  merkleTree: string | null;
  mintedAt: string;
  walletAddress: string;
};

type BackendCertificatePayload = {
  assetId: string;
  certificatePda: string;
  leafIndex: number | null;
  leafNonce: string | null;
  merkleTree: string | null;
};

const STORAGE_PREFIX = "solbreach.level1.backendCertificate";

function storageKey({
  cluster,
  walletAddress,
}: {
  cluster: string;
  walletAddress: string;
}) {
  return `${STORAGE_PREFIX}:${cluster}:${walletAddress}`;
}

function toSnapshot(
  record: Level1BackendCertificateRecord | null
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
    level: 1,
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
  const [override, setOverride] =
    useState<Level1BackendCertificateRecord | null>(null);

  const record = useMemo(() => {
    if (!address) return null;
    if (override?.walletAddress === address && override.cluster === cluster) {
      return override;
    }

    if (typeof window === "undefined") return null;

    try {
      const raw = window.localStorage.getItem(
        storageKey({
          cluster,
          walletAddress: address,
        })
      );
      return raw ? (JSON.parse(raw) as Level1BackendCertificateRecord) : null;
    } catch {
      return null;
    }
  }, [address, cluster, override]);

  const snapshot = useMemo(() => toSnapshot(record), [record]);
  const effectiveCertificateState = useMemo(() => {
    if (!certificateState) return certificateState;
    if (!snapshot || certificateState[1]?.minted) {
      return certificateState;
    }

    return {
      ...certificateState,
      1: snapshot,
    } satisfies CertificateCollection;
  }, [certificateState, snapshot]);

  const handleMinted = useCallback(
    (payload: BackendCertificatePayload) => {
      if (!address) return;

      const nextRecord: Level1BackendCertificateRecord = {
        ...payload,
        cluster,
        mintedAt: new Date().toISOString(),
        walletAddress: address,
      };

      setOverride(nextRecord);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          storageKey({
            cluster,
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
    level1BackendCertificateSnapshot: snapshot,
    handleLevel1BackendCertificateMinted: handleMinted,
  };
}
