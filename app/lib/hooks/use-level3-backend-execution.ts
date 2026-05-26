"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { parseTransactionError } from "../errors";
import {
  ensureLevel1DemoAuth,
  type Level1AuthSession,
} from "../levels/level1-backend";
import {
  executeLevel3ExploitTransaction,
  fetchLevel3BackendStatus,
  setupLevel3,
  startLevel3,
  submitLevel3Proof,
  type Level3Challenge,
} from "../levels/level3-backend";
import type { WalletSession } from "../wallet/types";

const LOG_PREFIX = "[SolBreach Level 3]";

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

export function useLevel3BackendExecution({
  address,
  status,
  wallet,
}: {
  address?: string;
  status: string;
  wallet?: WalletSession | null;
}) {
  const [backendAuth, setBackendAuth] = useState<Level1AuthSession | null>(
    null
  );
  const [challenge, setChallenge] = useState<Level3Challenge | null>(null);
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
      ? (["level3-backend-status", backendAuth.accessToken] as const)
      : null,
    async (): Promise<Awaited<ReturnType<typeof fetchLevel3BackendStatus>>> => {
      return fetchLevel3BackendStatus(backendAuth!.accessToken);
    },
    { revalidateOnFocus: true }
  );

  const ensureBackendSession = useCallback(async () => {
    if (status !== "connected" || !address) {
      throw new Error("Connect your wallet before starting Level 3.");
    }

    const auth = await ensureLevel1DemoAuth(address);
    setBackendAuth(auth);
    return auth;
  }, [address, status]);

  const ensureStarted = useCallback(async (accessToken: string) => {
    try {
      await startLevel3(accessToken);
    } catch (error) {
      const message = parseTransactionError(error).toLowerCase();
      if (
        !message.includes("active") &&
        !message.includes("already") &&
        !message.includes("started")
      ) {
        throw error;
      }
    }
  }, []);

  const prepare = useCallback(async () => {
    if (!address) return;

    setIsBusy(true);
    setRuntimeError(null);
    try {
      const auth = await ensureBackendSession();
      await ensureStarted(auth.accessToken);
      const setup = await setupLevel3(auth.accessToken, address);
      console.info(`${LOG_PREFIX} challenge payload received`, setup);
      setChallenge(setup.challenge);
      await mutateBackendStatus();
      toast.success("Level 3 exploit challenge prepared.");
    } catch (error) {
      logFrontendError("challenge setup failed", error);
      const message = getErrorMessage(error);
      setRuntimeError(message);
      toast.error(message);
      throw error;
    } finally {
      setIsBusy(false);
    }
  }, [address, ensureBackendSession, ensureStarted, mutateBackendStatus]);

  const run = useCallback(async () => {
    if (!address || !wallet) return;

    setIsBusy(true);
    setRuntimeError(null);
    try {
      const auth = await ensureBackendSession();
      await ensureStarted(auth.accessToken);
      const setup =
        challenge && backendStatus?.level_session_id
          ? {
              challenge,
              level_session_id: backendStatus.level_session_id,
            }
          : await setupLevel3(auth.accessToken, address);

      console.info(`${LOG_PREFIX} challenge payload received`, setup);
      setChallenge(setup.challenge);

      const signature = await executeLevel3ExploitTransaction({
        challenge: setup.challenge,
        wallet,
      });
      setTxSignature(signature);

      await submitLevel3Proof(auth.accessToken, {
        level_session_id: setup.level_session_id,
        transaction_signature: signature,
        wallet_address: address,
      });
      await mutateBackendStatus();

      toast.success("Level 3 exploit verified by backend.");
    } catch (error) {
      logFrontendError("exploit flow failed", error);
      const message = getErrorMessage(error);
      setRuntimeError(message);
      toast.error(message);
      throw error;
    } finally {
      setIsBusy(false);
    }
  }, [
    address,
    backendStatus,
    challenge,
    ensureBackendSession,
    ensureStarted,
    mutateBackendStatus,
    wallet,
  ]);

  return {
    backendAuth,
    backendCompleted: Boolean(
      backendStatus?.completed ||
      backendStatus?.state === "completed" ||
      backendStatus?.certification?.unlock_status === "unlocked"
    ),
    backendError,
    backendStatus,
    challenge,
    isBackendLoading,
    isBusy,
    mutateBackendStatus,
    prepare,
    run,
    runtimeError,
    txSignature,
  };
}
