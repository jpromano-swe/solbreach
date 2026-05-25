"use client";

import useSWR from "swr";
import type { Address } from "@solana/kit";
import {
  fetchCertificateCollection,
  type CertificateCollection,
} from "../certificates/certificate-state";
import {
  fetchLevel0Snapshot,
  fetchLevel1Snapshot,
  fetchLevel2Snapshot,
  fetchLevel3Snapshot,
  type Level0Snapshot,
  type Level1Snapshot,
  type Level2Snapshot,
  type Level3Snapshot,
} from "../levels/level-state";
import type { ClusterMoniker, SolanaClient } from "../solana-client";

type Level0User = Parameters<typeof fetchLevel0Snapshot>[0]["user"];

export function useLevelSnapshots({
  address,
  client,
  cluster,
  level3RewardAccountInput,
  signer,
}: {
  address?: Address;
  client: SolanaClient;
  cluster: ClusterMoniker;
  level3RewardAccountInput: string;
  signer?: Level0User | null;
}) {
  const level0 = useSWR(
    signer && address ? (["level0-state", cluster, address] as const) : null,
    async (): Promise<Level0Snapshot> => {
      return fetchLevel0Snapshot({
        rpc: client.rpc,
        user: signer!,
      });
    },
    { revalidateOnFocus: true }
  );

  const level1 = useSWR(
    signer && address ? (["level1-state", cluster, address] as const) : null,
    async (): Promise<Level1Snapshot> => {
      return fetchLevel1Snapshot({
        playerAddress: address!,
        rpc: client.rpc,
      });
    },
    { revalidateOnFocus: true }
  );

  const level2 = useSWR(
    signer && address ? (["level2-state", cluster, address] as const) : null,
    async (): Promise<Level2Snapshot> => {
      return fetchLevel2Snapshot({
        playerAddress: address!,
        rpc: client.rpc,
      });
    },
    { revalidateOnFocus: true }
  );

  const level3 = useSWR(
    signer && address
      ? ([
          "level3-state",
          cluster,
          address,
          level3RewardAccountInput.trim(),
        ] as const)
      : null,
    async (): Promise<Level3Snapshot> => {
      return fetchLevel3Snapshot({
        playerAddress: address!,
        rewardAccountInput: level3RewardAccountInput,
        rpc: client.rpc,
      });
    },
    { revalidateOnFocus: true }
  );

  const certificates = useSWR(
    address ? (["certificate-state", cluster, address] as const) : null,
    async (): Promise<CertificateCollection> => {
      return fetchCertificateCollection({
        playerAddress: address!,
        rpc: client.rpc,
      });
    },
    { revalidateOnFocus: true }
  );

  const refreshSnapshots = async () => {
    await Promise.all([
      level0.mutate(),
      level1.mutate(),
      level2.mutate(),
      level3.mutate(),
      certificates.mutate(),
    ]);
  };

  return {
    certificateState: certificates.data,
    isCertificateLoading: certificates.isLoading,
    level0Error: level0.error,
    level0State: level0.data,
    isLevel0Loading: level0.isLoading,
    level1Error: level1.error,
    level1State: level1.data,
    isLevel1Loading: level1.isLoading,
    level2Error: level2.error,
    level2State: level2.data,
    isLevel2Loading: level2.isLoading,
    level3Error: level3.error,
    level3State: level3.data,
    isLevel3Loading: level3.isLoading,
    mutateCertificateState: certificates.mutate,
    mutateLevel0State: level0.mutate,
    mutateLevel1State: level1.mutate,
    mutateLevel2State: level2.mutate,
    mutateLevel3State: level3.mutate,
    refreshSnapshots,
  };
}
