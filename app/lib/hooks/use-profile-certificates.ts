"use client";

import useSWR from "swr";
import {
  listProfileCertificates,
  type ProfileCertificate,
  type ProfileCertificatesSummary,
} from "../certificates/profile-certificates";
import {
  ensureBackendWalletAuth,
  type Level1AuthSession,
} from "../levels/level1-backend";
import type { WalletSession } from "../wallet/types";

type UseProfileCertificatesInput = {
  enabled?: boolean;
  wallet?: WalletSession | null;
};

type ProfileCertificatesFetcherResult = {
  auth: Level1AuthSession;
  certificates: ProfileCertificate[];
  summary: ProfileCertificatesSummary;
  walletAddress: string | null;
};

async function fetchProfileCertificates(wallet: WalletSession) {
  const auth = await ensureBackendWalletAuth(wallet);
  const payload = await listProfileCertificates(auth.accessToken);

  return {
    auth,
    certificates: payload.certificates,
    summary: payload.summary,
    walletAddress: payload.walletAddress,
  } satisfies ProfileCertificatesFetcherResult;
}

export function useProfileCertificates({
  enabled = true,
  wallet,
}: UseProfileCertificatesInput) {
  const swr = useSWR(
    enabled && wallet ? ["profile-certificates", wallet.account.address] : null,
    () => fetchProfileCertificates(wallet as WalletSession),
    {
      revalidateOnFocus: true,
      shouldRetryOnError: false,
    }
  );

  return {
    auth: swr.data?.auth ?? null,
    certificates: swr.data?.certificates ?? [],
    error: swr.error,
    isLoading: swr.isLoading,
    mutate: swr.mutate,
    summary: swr.data?.summary ?? null,
    walletAddress: swr.data?.walletAddress ?? null,
  };
}
