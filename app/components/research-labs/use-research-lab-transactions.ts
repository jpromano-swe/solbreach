"use client";

import { useCallback, useState } from "react";
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
    async (auth: Level1AuthSession) => {
      if (!session) return;
      try {
        const response = await getResearchLabAccounts(
          auth.accessToken,
          session.sessionId
        );
        setEvidenceAccounts(response.accounts ?? []);
      } catch {
        // silent — evidence fetch is non-critical
      }
    },
    [session]
  );

  const executeTransaction = useCallback(
    async (payload: LabTransactionPayload) => {
      if (!activeLab || !session || isRunning) return;
      try {
        const auth = await getAuth();

        const enrichedInputs = {
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
          amount: payload.amount,
        };

        const result = await submitResearchLabTransaction(
          auth.accessToken,
          session.sessionId,
          payload
        );
        const enriched: EnrichedTransactionResult = {
          ...result,
          inputs: enrichedInputs,
        };

        setTxResults((prev) => [enriched, ...prev]);

        const beforeRunSequence = session.latestTerminalSequence;
        const nextSession = await pollTerminal(
          auth,
          session,
          beforeRunSequence
        );

        if (result.executionStatus === "success") {
          toast.success(
            payload.action_type === "DEPOSIT_COLLATERAL"
              ? "Deposit submitted to sandbox"
              : "Withdrawal submitted to sandbox"
          );
          await fetchAccountEvidence(auth);
        } else {
          showTransactionFailureToast(result.logs?.at(-1));
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
          description:
            "Unauthorized treasury withdrawal reproduced. Continue to Submit Finding when ready.",
        });
      } else {
        toast.error("Exploit proof did not verify", {
          description:
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

function showTransactionFailureToast(lastLog: string | undefined) {
  if (
    lastLog?.toLowerCase().includes("simulation") ||
    lastLog?.toLowerCase().includes("instruction")
  ) {
    toast.error("Transaction simulation failed", { description: lastLog });
  } else if (
    lastLog?.toLowerCase().includes("session") ||
    lastLog?.toLowerCase().includes("expired")
  ) {
    toast.error("Session error", { description: lastLog });
  } else {
    toast.error("Transaction failed", {
      description: lastLog ?? "Check transaction logs for details",
    });
  }
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
