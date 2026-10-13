"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { parseTransactionError } from "../errors";
import {
  clearBackendWalletAuth,
  ensureBackendWalletAuth,
  isBackendAuthError,
  type Level1AuthSession,
} from "../levels/level1-backend";
import {
  executeFutureLevelProofTransaction,
  fetchFutureLevelBackendStatus,
  getChallengeFromLevelResponse,
  getLevelSessionId,
  setupFutureLevel,
  startFutureLevel,
  submitFutureLevelProof,
  type FutureLevelChallenge,
  type FutureLevelId,
  type FutureLevelSelections,
} from "../levels/future-levels-backend";
import type { WalletSession } from "../wallet/types";

const LOG_PREFIX = "[SolBreach Future Levels]";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function logFrontendError(label: string, error: unknown) {
  console.error(`${LOG_PREFIX} ${label}`, error);
  if (error instanceof Error && error.stack) {
    console.error(`${LOG_PREFIX} ${label} stack`, error.stack);
  }
}

function challengeFromStatus(
  status: Awaited<ReturnType<typeof fetchFutureLevelBackendStatus>> | undefined
) {
  const restoredChallenge = getChallengeFromLevelResponse(status);
  if (!restoredChallenge) return null;

  return {
    ...restoredChallenge,
    level_session_id: getLevelSessionId(status) ?? undefined,
  } as FutureLevelChallenge;
}

export function useFutureLevelBackendExecution({
  address,
  levelId,
  onBadgeStateChanged,
  status,
  wallet,
}: {
  address?: string;
  levelId: FutureLevelId;
  onBadgeStateChanged?: () => Promise<unknown> | unknown;
  status: string;
  wallet?: WalletSession | null;
}) {
  const [backendAuth, setBackendAuth] = useState<Level1AuthSession | null>(
    null
  );
  const [challenge, setChallenge] = useState<FutureLevelChallenge | null>(null);
  const [levelSessionId, setLevelSessionId] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const {
    data: backendStatus,
    error: backendError,
    isLoading: isBackendLoading,
    mutate: mutateBackendStatus,
  } = useSWR(
    backendAuth
      ? (["future-level-backend-status", levelId, backendAuth.accessToken] as const)
      : null,
    async (): Promise<
      Awaited<ReturnType<typeof fetchFutureLevelBackendStatus>>
    > => fetchFutureLevelBackendStatus(backendAuth!.accessToken, levelId),
    { revalidateOnFocus: true }
  );

  const statusChallenge = useMemo(
    () => challengeFromStatus(backendStatus),
    [backendStatus]
  );

  const ensureBackendSession = useCallback(async (force = false) => {
    if (status !== "connected" || !address || !wallet) {
      throw new Error(`Connect your wallet before starting ${levelId}.`);
    }

    const auth = await ensureBackendWalletAuth(wallet, { force });
    setBackendAuth(auth);
    return auth;
  }, [address, levelId, status, wallet]);

  const refreshBackendSession = useCallback(async () => {
    if (!address) {
      throw new Error(`Connect your wallet before starting ${levelId}.`);
    }
    clearBackendWalletAuth(address);
    setBackendAuth(null);
    return ensureBackendSession(true);
  }, [address, ensureBackendSession, levelId]);

  const ensureStarted = useCallback(
    async (accessToken: string) => {
      try {
        return await startFutureLevel(accessToken, levelId);
      } catch (error) {
        const message = parseTransactionError(error).toLowerCase();
        if (
          !message.includes("active") &&
          !message.includes("already") &&
          !message.includes("started")
        ) {
          throw error;
        }
        return null;
      }
    },
    [levelId]
  );

  const prepare = useCallback(async () => {
    if (!address) return null;

    setIsBusy(true);
    setRuntimeError(null);
    try {
      let auth = await ensureBackendSession();
      let setup: Awaited<ReturnType<typeof setupFutureLevel>>;
      try {
        await ensureStarted(auth.accessToken);
        setup = await setupFutureLevel({
          accessToken: auth.accessToken,
          levelId,
          walletAddress: address,
        });
      } catch (error) {
        if (!isBackendAuthError(error)) throw error;
        auth = await refreshBackendSession();
        await ensureStarted(auth.accessToken);
        setup = await setupFutureLevel({
          accessToken: auth.accessToken,
          levelId,
          walletAddress: address,
        });
      }

      console.info(`${LOG_PREFIX} challenge payload received`, {
        levelId,
        setup,
      });
      setChallenge(setup.challenge);
      setLevelSessionId(setup.level_session_id);
      await mutateBackendStatus();
      toast.success(`${levelId === "level4" ? "Level 4" : "Level 5"} challenge prepared.`);
      return setup;
    } catch (error) {
      logFrontendError("challenge setup failed", error);
      const message = getErrorMessage(error);
      setRuntimeError(message);
      toast.error(message);
      throw error;
    } finally {
      setIsBusy(false);
    }
  }, [
    address,
    ensureBackendSession,
    ensureStarted,
    levelId,
    mutateBackendStatus,
    refreshBackendSession,
  ]);

  const run = useCallback(
    async (selections: FutureLevelSelections) => {
      if (!address || !wallet) return null;

      setIsBusy(true);
      setRuntimeError(null);
      try {
        let auth = await ensureBackendSession();
        let setup:
          | {
              challenge: FutureLevelChallenge;
              level_session_id: string;
            }
          | Awaited<ReturnType<typeof setupFutureLevel>>;

        try {
          const startResponse = await ensureStarted(auth.accessToken);
          const restoredChallenge = challenge ?? statusChallenge;
          const restoredSessionId =
            levelSessionId ??
            getLevelSessionId(backendStatus) ??
            getLevelSessionId(startResponse) ??
            null;
          const startChallenge = getChallengeFromLevelResponse(startResponse);
          const effectiveChallenge =
            restoredChallenge ??
            (startChallenge
              ? ({
                  ...startChallenge,
                  level_session_id: restoredSessionId ?? undefined,
                } as FutureLevelChallenge)
              : null);

          setup =
            effectiveChallenge && restoredSessionId
              ? {
                  challenge: effectiveChallenge,
                  level_session_id: restoredSessionId,
                }
              : await setupFutureLevel({
                  accessToken: auth.accessToken,
                  levelId,
                  walletAddress: address,
                });
        } catch (error) {
          if (!isBackendAuthError(error)) throw error;
          auth = await refreshBackendSession();
          await ensureStarted(auth.accessToken);
          setup = await setupFutureLevel({
            accessToken: auth.accessToken,
            levelId,
            walletAddress: address,
          });
        }

        setChallenge(setup.challenge);
        setLevelSessionId(setup.level_session_id);

        const signature = await executeFutureLevelProofTransaction({
          challenge: setup.challenge,
          levelId,
          wallet,
        });
        setTxSignature(signature);

        await submitFutureLevelProof({
          accessToken: auth.accessToken,
          challenge: setup.challenge,
          levelId,
          levelSessionId: setup.level_session_id,
          selections,
          transactionSignature: signature,
          walletAddress: address,
        });

        await mutateBackendStatus();
        await onBadgeStateChanged?.();

        toast.success(`${levelId === "level4" ? "Level 4" : "Level 5"} proof verified.`);
        return signature;
      } catch (error) {
        logFrontendError("exploit flow failed", error);
        const message = getErrorMessage(error);
        setRuntimeError(message);
        toast.error(message);
        throw error;
      } finally {
        setIsBusy(false);
      }
    },
    [
      address,
      backendStatus,
      challenge,
      ensureBackendSession,
      ensureStarted,
      levelId,
      levelSessionId,
      mutateBackendStatus,
      onBadgeStateChanged,
      refreshBackendSession,
      statusChallenge,
      wallet,
    ]
  );

  const backendCompleted = Boolean(
    backendStatus?.completed ||
      backendStatus?.state === "completed" ||
      backendStatus?.certification?.unlock_status === "unlocked"
  );

  return {
    backendAuth,
    backendCompleted,
    backendError,
    backendStatus,
    challenge: challenge ?? statusChallenge,
    challengeReady: Boolean(challenge || statusChallenge),
    isBackendLoading,
    isBusy,
    levelSessionId,
    mutateBackendStatus,
    prepare,
    run,
    runtimeError,
    txSignature,
  };
}
