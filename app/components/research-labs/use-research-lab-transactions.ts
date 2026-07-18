"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { Level1AuthSession } from "../../lib/levels/level1-backend";
import {
  getResearchLabAccounts,
  submitResearchLabTransaction,
  verifyResearchLabObjective,
  type LabTransactionPayload,
  type ResearchLabManifest,
  type ResearchLabSession,
  type SandboxAccountSummary,
} from "../../lib/research-labs/lab-state";
import { NEUTRAL_LABELS } from "./execute-exploit-tab";
import { getResearchLabAdapter, isYieldHijackLab } from "./lab-adapters";
import type { EnrichedTransactionResult } from "./types";

type UseResearchLabTransactionsOptions = {
  activeLab: ResearchLabManifest | null;
  getAuth: () => Promise<Level1AuthSession>;
  loadReport: (
    auth: Level1AuthSession,
    session: ResearchLabSession
  ) => Promise<unknown>;
  onConsoleClose: () => void;
  onConsoleOpen: () => void;
  onSessionChange: (session: ResearchLabSession) => void;
  pollTerminal: (
    auth: Level1AuthSession,
    session: ResearchLabSession,
    afterSequence?: number
  ) => Promise<ResearchLabSession>;
  session: ResearchLabSession | null;
};

export function useResearchLabTransactions({
  activeLab,
  getAuth,
  loadReport,
  onConsoleClose,
  onConsoleOpen,
  onSessionChange,
  pollTerminal,
  session,
}: UseResearchLabTransactionsOptions) {
  const [isRunning, setIsRunning] = useState(false);
  const [txResults, setTxResults] = useState<EnrichedTransactionResult[]>([]);
  const [evidenceAccounts, setEvidenceAccounts] = useState<SandboxAccountSummary[]>([]);

  const resetTransactions = useCallback(() => {
    setTxResults([]);
    setEvidenceAccounts([]);
  }, []);

  const fetchAccountEvidence = useCallback(
    async (
      auth: Level1AuthSession,
      currentSession: ResearchLabSession | null = session
    ) => {
      if (!currentSession) return;
      try {
        const response = await getResearchLabAccounts(
          auth.accessToken,
          currentSession.sessionId
        );
        setEvidenceAccounts(
          (response.accounts ?? []).filter(
            (account) => account.ref !== "shared_position"
          )
        );
      } catch {
        // silent — evidence fetch is non-critical
      }
    },
    [session]
  );

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    void getAuth()
      .then((auth) => {
        if (!cancelled) return fetchAccountEvidence(auth, session);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [fetchAccountEvidence, getAuth, session]);

  const executeTransaction = useCallback(
    async (payload: LabTransactionPayload) => {
      if (!activeLab || !session || isRunning) return;
      try {
        const auth = await getAuth();

        const adapter = getResearchLabAdapter(activeLab);
        const labelForRef = (ref: string | undefined) =>
          ref
            ? adapter.accountLabels[ref] ?? NEUTRAL_LABELS[ref] ?? ref
            : undefined;
        const enrichedInputs = {
          actionType: payload.action_type,
          collateralSourceRef:
            payload.action_type === "DEPOSIT_COLLATERAL"
              ? payload.collateral_account_ref
              : undefined,
          collateralSourceLabel:
            payload.action_type === "DEPOSIT_COLLATERAL"
              ? NEUTRAL_LABELS[payload.collateral_account_ref] ??
                payload.collateral_account_ref
              : undefined,
          vaultDestinationRef:
            payload.action_type === "DEPOSIT_COLLATERAL"
              ? payload.vault_account_ref
              : undefined,
          vaultDestinationLabel:
            payload.action_type === "DEPOSIT_COLLATERAL"
              ? NEUTRAL_LABELS[payload.vault_account_ref] ??
                payload.vault_account_ref
              : undefined,
          sourceAccountRef:
            payload.action_type === "STAKE"
              ? payload.source_account_ref
              : undefined,
          sourceAccountLabel:
            payload.action_type === "STAKE"
              ? labelForRef(payload.source_account_ref)
              : undefined,
          stakeVaultRef:
            payload.action_type === "STAKE"
              ? payload.stake_vault_ref
              : undefined,
          stakeVaultLabel:
            payload.action_type === "STAKE"
              ? labelForRef(payload.stake_vault_ref)
              : undefined,
          positionAccountRef:
            payload.action_type === "STAKE" ||
            payload.action_type === "CLAIM_REWARDS"
              ? payload.position_account_ref
              : undefined,
          positionAccountLabel:
            payload.action_type === "STAKE" ||
            payload.action_type === "CLAIM_REWARDS"
              ? labelForRef(payload.position_account_ref)
              : undefined,
          rewardVaultRef:
            payload.action_type === "CLAIM_REWARDS"
              ? payload.reward_vault_ref
              : undefined,
          rewardVaultLabel:
            payload.action_type === "CLAIM_REWARDS"
              ? labelForRef(payload.reward_vault_ref)
              : undefined,
          destinationAccountRef:
            payload.action_type === "CLAIM_REWARDS"
              ? payload.destination_account_ref
              : undefined,
          destinationAccountLabel:
            payload.action_type === "CLAIM_REWARDS"
              ? labelForRef(payload.destination_account_ref)
              : undefined,
          targetWalletAddress:
            payload.action_type === "CLAIM_REWARDS"
              ? payload.target_wallet_address
              : undefined,
          amount: "amount" in payload ? payload.amount : 0,
        };

        const result = await submitResearchLabTransaction(
          auth.accessToken,
          session.sessionId,
          payload
        );
        const enriched: EnrichedTransactionResult = {
          ...result,
          instructionType:
            result.instructionType ?? result.instruction_type ?? "",
          executionStatus:
            result.executionStatus ?? result.execution_status ?? "failure",
          logs: result.logs ?? [],
          inputs: enrichedInputs,
        };

        setTxResults((prev) => [enriched, ...prev]);

        const beforeRunSequence = session.latestTerminalSequence;
        const nextSession = await pollTerminal(
          auth,
          session,
          beforeRunSequence
        );

        if (enriched.executionStatus === "success") {
          const successCopy =
            payload.action_type === "DEPOSIT_COLLATERAL"
              ? "Deposit submitted to sandbox"
              : payload.action_type === "WITHDRAW_AGAINST_CREDIT"
                ? "Withdrawal submitted to sandbox"
                : payload.action_type === "STAKE"
                  ? "Stake completed"
                  : "Rewards claimed";
          toast.success(successCopy);
          await fetchAccountEvidence(auth, nextSession);
        } else {
          showTransactionFailureToast(
            enriched.logs.at(-1),
            enriched.errorCode ?? enriched.error_code,
            isYieldHijackLab(activeLab)
          );
          await fetchAccountEvidence(auth, nextSession);
        }

        if (nextSession.terminalLines.length > session.terminalLines.length) {
          onConsoleOpen();
        }
      } catch (error) {
        showRequestErrorToast(error);
      }
    },
    [
      activeLab,
      fetchAccountEvidence,
      getAuth,
      isRunning,
      onConsoleOpen,
      pollTerminal,
      session,
    ]
  );

  const proveImpact = useCallback(async () => {
    if (!activeLab || !session || isRunning) return;
    setIsRunning(true);
    onConsoleOpen();
    try {
      const auth = await getAuth();
      const beforeRunSequence = session.latestTerminalSequence;

      const result = await verifyResearchLabObjective(
        auth.accessToken,
        session.sessionId
      );
      const nextSession = await pollTerminal(
        auth,
        session,
        beforeRunSequence
      );

      if (result.passed) {
        const verifiedSession = {
          ...nextSession,
          objectiveProgress: activeLab.objectives.length,
          impactVerified:
            result.impactVerified ??
            result.impact_verified ??
            result.passed,
          reportUnlocked:
            result.reportUnlocked ??
            result.report_unlocked ??
            result.passed,
          verifiedEvidenceRefs:
            result.verifiedEvidenceRefs ??
            result.verified_evidence_refs ??
            nextSession.verifiedEvidenceRefs,
        };
        onSessionChange(verifiedSession);
        await loadReport(auth, verifiedSession);
        onConsoleClose();
        toast.success("Impact Verified", {
          description: getResearchLabAdapter(activeLab).impactVerifiedCopy,
        });
      } else {
        toast.error("Exploit proof did not verify", {
          description:
            result.failureReason ??
            result.userFacingEvidence?.[0] ??
            "Review the runtime output and transaction evidence before trying again.",
        });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsRunning(false);
    }
  }, [
    activeLab,
    getAuth,
    isRunning,
    loadReport,
    onConsoleClose,
    onConsoleOpen,
    onSessionChange,
    pollTerminal,
    session,
  ]);

  return {
    evidenceAccounts,
    executeTransaction,
    isRunning,
    proveImpact,
    resetTransactions,
    txResults,
  };
}

function showTransactionFailureToast(
  lastLog: string | undefined,
  errorCode?: string,
  yieldHijack = false
) {
  const description = yieldHijack
    ? normalizeYieldHijackFailure(lastLog, errorCode)
    : normalizeTransactionFailureLog(lastLog);

  if (
    lastLog?.toLowerCase().includes("simulation") ||
    lastLog?.toLowerCase().includes("instruction")
  ) {
    toast.error("Transaction simulation failed", { description });
  } else if (
    lastLog?.toLowerCase().includes("session") ||
    lastLog?.toLowerCase().includes("expired")
  ) {
    toast.error("Session error", { description });
  } else {
    toast.error("Transaction failed", {
      description,
    });
  }
}

function normalizeYieldHijackFailure(
  lastLog: string | undefined,
  errorCode?: string
) {
  const normalized = `${errorCode ?? ""} ${lastLog ?? ""}`.toLowerCase();

  if (
    normalized.includes("target_wallet_required") ||
    normalized.includes("select a wallet")
  ) {
    return "Paste a wallet from the unclaimed rewards list before claiming.";
  }
  if (
    normalized.includes("invalid_target_wallet") ||
    normalized.includes("target wallet")
  ) {
    return "The pasted wallet does not match the current reward position.";
  }
  if (
    normalized.includes("invalid_position_owner") ||
    normalized.includes("position owner")
  ) {
    return "Your wallet does not currently control this staking position.";
  }
  if (
    normalized.includes("no_rewards") ||
    normalized.includes("no pending rewards") ||
    normalized.includes("rewards available")
  ) {
    return "This position has no pending rewards remaining.";
  }
  if (
    normalized.includes("insufficient") ||
    normalized.includes("stake balance")
  ) {
    return "Your stake account does not contain enough tokens.";
  }
  if (normalized.includes("invalid amount") || normalized.includes("amount")) {
    return "Enter an amount between 1 and your available stake balance.";
  }
  if (normalized.includes("account ref") || normalized.includes("invalid account")) {
    return "The selected session account is no longer valid. Refresh the lab.";
  }
  if (normalized.includes("unsupported")) {
    return "This action is not supported by the current lab runtime.";
  }

  return lastLog ?? "Check transaction logs for details.";
}

function normalizeTransactionFailureLog(lastLog: string | undefined) {
  const fallback = "Check transaction logs for details";

  return (lastLog ?? fallback).replace(
    "Transaction rejected: canonical USDC deposits must target the official protocol vault.",
    "Transaction rejected: USDC deposits must target the official protocol vault."
  );
}

function showRequestErrorToast(error: unknown) {
  const message = getErrorMessage(error);
  if (
    message.toLowerCase().includes("validation") ||
    message.toLowerCase().includes("invalid")
  ) {
    toast.error("Invalid request", { description: message });
  } else if (
    message.toLowerCase().includes("network") ||
    message.toLowerCase().includes("fetch")
  ) {
    toast.error("Network error", {
      description: "Check your connection and try again.",
    });
  } else {
    toast.error(message);
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "Research Labs request failed.";
  }
}
