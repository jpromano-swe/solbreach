"use client";

import { useCallback } from "react";
import useSWR from "swr";
import {
  listUserBadges,
  markUserBadgeSeen,
  type UserBadge,
  type UserBadgesSummary,
} from "../badges";
import {
  ensureBackendWalletAuth,
  type Level1AuthSession,
} from "../levels/level1-backend";
import type { WalletSession } from "../wallet/types";

type UseUserBadgesInput = {
  enabled?: boolean;
  wallet?: WalletSession | null;
};

type BadgesFetcherResult = {
  auth: Level1AuthSession;
  badges: UserBadge[];
  summary: UserBadgesSummary;
};

async function fetchBadges(wallet: WalletSession) {
  const auth = await ensureBackendWalletAuth(wallet);
  const payload = await listUserBadges(auth.accessToken);

  return {
    auth,
    badges: payload.badges,
    summary: payload.summary,
  } satisfies BadgesFetcherResult;
}

export function useUserBadges({ enabled = true, wallet }: UseUserBadgesInput) {
  const swr = useSWR(
    enabled && wallet ? ["user-badges", wallet.account.address] : null,
    () => fetchBadges(wallet as WalletSession),
    {
      revalidateOnFocus: true,
      shouldRetryOnError: false,
    }
  );

  const markSeen = useCallback(
    async (slug: string) => {
      if (!wallet) return;

      const currentAuth = swr.data?.auth ?? (await ensureBackendWalletAuth(wallet));
      await markUserBadgeSeen(currentAuth.accessToken, slug);
      await swr.mutate(
        (current) =>
          current
            ? {
                ...current,
                badges: current.badges.map((badge) =>
                  badge.slug === slug
                    ? { ...badge, seenAt: new Date().toISOString() }
                    : badge
                ),
              }
            : current,
        { revalidate: true }
      );
    },
    [swr, wallet]
  );

  return {
    auth: swr.data?.auth ?? null,
    badges: swr.data?.badges ?? [],
    error: swr.error,
    isLoading: swr.isLoading,
    markSeen,
    mutate: swr.mutate,
    summary: swr.data?.summary ?? null,
  };
}
