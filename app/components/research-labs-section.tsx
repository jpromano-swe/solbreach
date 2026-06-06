"use client";

import {
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import {
  ensureBackendWalletAuth,
  type Level1AuthSession,
} from "../lib/levels/level1-backend";
import {
  applyTerminalEvents,
  createResearchLabSession,
  FALLBACK_RESEARCH_LABS,
  fetchResearchLabTerminal,
  getResearchLab,
  getResearchLabAccounts,
  getResearchLabReport,
  listResearchLabs,
  resetResearchLabSession,
  verifyResearchLabObjective,
  submitResearchLabTransaction,
  saveResearchLabReportDraft,
  submitResearchLabReport,
  type LabTransactionPayload,
  type ResearchLabManifest,
  type ResearchLabReport,
  type ResearchLabReportFields,
  type ResearchLabSession,
  type SandboxAccountSummary,
} from "../lib/research-labs/lab-state";
import { useWallet } from "../lib/wallet/context";
import { ResearchLabCatalog } from "./research-labs/catalog";
import { NEUTRAL_LABELS } from "./research-labs/execute-exploit-tab";
import { LabContextPanel } from "./research-labs/context-panel";
import {
  LabScenarioBriefing,
  ResearchLabSessionHeader,
} from "./research-labs/lab-shell";
import { RuntimeConsoleDrawer } from "./research-labs/runtime-console";
import { ResearchLabWorkspace } from "./research-labs/workspace";
import {
  defaultReportMetaFields,
  emptyReportFields,
  suggestedReportMetaFields,
  suggestedReportText,
} from "./research-labs/report-utils";
import { useFindingReview } from "./research-labs/use-finding-review";
import type {
  AccountEvidence,
  AuditReportStage,
  EnrichedTransactionResult,
  ExecuteExploitView,
  LabPhase,
  ReportMetaFields,
  SandboxStatus,
  WorkspaceTab,
} from "./research-labs/types";

// Research lab motion storyboard:
//   000ms old section fades down/out while new section slides up/in
//   180ms previous section unmounts; new section owns the surface

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "Research Labs request failed.";
  }
}

export function ResearchLabsSection() {
  const { status: walletStatus, wallet } = useWallet();
  const [backendAuth, setBackendAuth] = useState<Level1AuthSession | null>(null);
  const [labs, setLabs] = useState<ResearchLabManifest[]>(FALLBACK_RESEARCH_LABS);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [activeLab, setActiveLab] = useState<ResearchLabManifest | null>(null);
  const [session, setSession] = useState<ResearchLabSession | null>(null);
  const [activeFilePath, setActiveFilePath] = useState("");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("inspect");
  const [executeExploitView, setExecuteExploitView] =
    useState<ExecuteExploitView>("HYPOTHESIS");
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [revealedHints, setRevealedHints] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<ResearchLabReport | null>(null);
  const [reportFields, setReportFields] = useState<ResearchLabReportFields>(emptyReportFields);
  const [reportMetaFields, setReportMetaFields] = useState<ReportMetaFields>(defaultReportMetaFields);
  const [auditReportStage, setAuditReportStage] = useState<AuditReportStage>("BUILDER");
  const [isReportSaving, setIsReportSaving] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const [txResults, setTxResults] = useState<EnrichedTransactionResult[]>([]);
  const [evidenceAccounts, setEvidenceAccounts] = useState<SandboxAccountSummary[]>([]);

  const populateReportDefaults = useCallback(() => {
    setReportFields((fields) => ({
      ...fields,
      vulnerabilityCategory:
        fields.vulnerabilityCategory ?? "arithmetic_safety",
      affectedArea: fields.affectedArea ?? "vault_health_calculation",
      severity: fields.severity ?? "medium",
      rootCause: fields.rootCause || suggestedReportText.rootCause,
      impact: fields.impact || suggestedReportText.impact,
      proof: fields.proof || suggestedReportText.proof,
      recommendedFix: fields.recommendedFix || suggestedReportText.recommendedFix,
    }));
    setReportMetaFields((fields) => ({
      title: fields.title || suggestedReportMetaFields.title,
      likelihood: fields.likelihood || suggestedReportMetaFields.likelihood,
    }));
  }, []);

  const {
    criticalAnsweredCount,
    criticalTotal,
    openFindingReport,
    questionnaireAnswers,
    questionnaireResult,
    reportOpened,
    resetFindingReview,
    retryQuestionIds,
    retryQuestionnaire,
    reviewAttempts,
    reviewIndex,
    reviewMode,
    reviewStarted,
    reviewStepCurrent,
    reviewStepTotal,
    setReviewIndex,
    startFindingReview,
    submitQuestionnaire,
    updateQuestionnaireAnswer,
  } = useFindingReview({
    onOpenReportTab: () => setActiveTab("report"),
    onPopulateReportDefaults: populateReportDefaults,
    onResetAuditReportStage: () => setAuditReportStage("BUILDER"),
  });

  const activeBackendAuth =
    backendAuth &&
    walletStatus === "connected" &&
    wallet?.account.address === backendAuth.walletAddress
      ? backendAuth
      : null;
  const isBackendAuthenticated = Boolean(activeBackendAuth?.accessToken);

  const activeFile = useMemo(() => {
    if (!activeLab || !session || !activeFilePath) return null;
    return (
      session.fileEntries.find((file) => file.path === activeFilePath) ??
      session.fileEntries.find((file) => file.path === activeLab.entryFile) ??
      session.fileEntries[0] ??
      null
    );
  }, [activeFilePath, activeLab, session]);

  const activeFileContent =
    activeFile && session ? (session.files[activeFile.path] ?? activeFile.content) : "";

  const sandboxStatus = deriveSandboxStatus(session, isRunning);
  const impactVerified = Boolean(
    session?.labCompleted ||
      session?.status === "passed" ||
      session?.reportStatus ||
      report?.status === "draft" ||
      report?.status === "retry" ||
      report?.status === "accepted"
  );
  const findingReviewPassed = Boolean(
    questionnaireResult?.passed || report?.status === "accepted" || session?.labCompleted
  );
  const availableTabs = useMemo(
    () => ["inspect", "exploit", "report"] as WorkspaceTab[],
    []
  );
  const resolvedActiveTab = availableTabs.includes(activeTab)
    ? activeTab
    : activeTab === "verify"
      ? "exploit"
      : "inspect";
  const phase = deriveLabPhase({
    activeTab: resolvedActiveTab,
    impactVerified,
    isRunning,
    report,
    session,
  });

  const ensureLabAuth = useCallback(async () => {
    if (walletStatus !== "connected" || !wallet) {
      throw new Error("Connect your wallet before opening Research Labs.");
    }

    const auth = await ensureBackendWalletAuth(wallet);
    setBackendAuth(auth);
    return auth;
  }, [wallet, walletStatus]);

  const loadCatalog = useCallback(async () => {
    setIsCatalogLoading(true);
    setCatalogError(null);
    try {
      const auth = await ensureLabAuth();
      const nextLabs = await listResearchLabs(auth.accessToken);
      setLabs(nextLabs.length ? nextLabs : FALLBACK_RESEARCH_LABS);
    } catch (error) {
      const message = getErrorMessage(error);
      setCatalogError(message);
      toast.error(message);
    } finally {
      setIsCatalogLoading(false);
    }
  }, [ensureLabAuth]);

  const pollTerminal = useCallback(
    async (
      auth: Level1AuthSession,
      currentSession: ResearchLabSession,
      afterSequence = currentSession.latestTerminalSequence
    ) => {
      const terminal = await fetchResearchLabTerminal({
        accessToken: auth.accessToken,
        afterSequence,
        sessionId: currentSession.sessionId,
      });
      const nextSession = applyTerminalEvents(
        currentSession,
        terminal.events,
        terminal.latestSequence
      );
      setSession(nextSession);
      return nextSession;
    },
    []
  );

  const loadReport = useCallback(
    async (auth: Level1AuthSession, currentSession: ResearchLabSession) => {
      const nextReport = await getResearchLabReport(
        auth.accessToken,
        currentSession.sessionId
      );
      setReport(nextReport);
      setReportFields(nextReport.fields ?? emptyReportFields);
      setReportMetaFields((fields) => ({
        title: fields.title || suggestedReportMetaFields.title,
        likelihood: fields.likelihood || suggestedReportMetaFields.likelihood,
      }));
      setAuditReportStage(nextReport.status === "accepted" ? "SUBMITTED" : "BUILDER");
      return nextReport;
    },
    []
  );

  const openLab = async (lab: ResearchLabManifest) => {
    setIsCatalogLoading(true);
    setCatalogError(null);
    try {
      const auth = activeBackendAuth;
      if (!auth?.accessToken) {
        throw new Error("Authenticate your wallet before opening a Research Lab.");
      }

      const labDetail = await getResearchLab(auth.accessToken, lab.id);
      const nextSession = await createResearchLabSession(auth.accessToken, labDetail.id);
      const nextLab = { ...labDetail, files: nextSession.fileEntries };

      setActiveLab(nextLab);
      setSession(nextSession);
      setActiveFilePath(
        nextSession.fileEntries.find((file) => file.path === nextLab.entryFile)?.path ??
          nextSession.fileEntries[0]?.path ??
          nextLab.entryFile
      );
      setActiveTab("inspect");
      setExecuteExploitView("HYPOTHESIS");
      setConsoleOpen(false);
      setRevealedHints([]);
      resetFindingReview();
      await pollTerminal(auth, nextSession, 0);
      await loadReport(auth, nextSession);
      toast.success("Research lab session created");
    } catch (error) {
      const message = getErrorMessage(error);
      setCatalogError(message);
      toast.error(message);
    } finally {
      setIsCatalogLoading(false);
    }
  };

  const resetEnvironment = async () => {
    if (!activeLab || !session) return;
    setIsRunning(true);
    try {
      const auth = activeBackendAuth ?? (await ensureLabAuth());
      const nextSession = await resetResearchLabSession(auth.accessToken, session.sessionId);
      setSession(nextSession);
      setActiveLab({ ...activeLab, files: nextSession.fileEntries });
      setActiveFilePath(
        nextSession.fileEntries.find((file) => file.path === activeLab.entryFile)?.path ??
          nextSession.fileEntries[0]?.path ??
          activeLab.entryFile
      );
      setActiveTab("inspect");
      setExecuteExploitView("HYPOTHESIS");
      setConsoleOpen(false);
      setRevealedHints([]);
      setReport(null);
      setReportFields(emptyReportFields);
      setReportMetaFields(defaultReportMetaFields);
      setAuditReportStage("BUILDER");
      setTxResults([]);
      setEvidenceAccounts([]);
      resetFindingReview();
      await loadReport(auth, nextSession);
      toast.message("Sandbox session reset");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsRunning(false);
    }
  };

  const leaveLab = () => {
    setActiveLab(null);
    setSession(null);
    setActiveFilePath("");
    setActiveTab("inspect");
    setExecuteExploitView("HYPOTHESIS");
    setConsoleOpen(false);
    setRevealedHints([]);
    setReport(null);
    setReportFields(emptyReportFields);
    setReportMetaFields(defaultReportMetaFields);
    setAuditReportStage("BUILDER");
    setTxResults([]);
    setEvidenceAccounts([]);
    resetFindingReview();
  };

  const revealHint = () => {
    if (!activeLab) return;
    const nextHint = activeLab.hints.find((hint) => !revealedHints.includes(hint.id));
    if (!nextHint) return;
    setRevealedHints([...revealedHints, nextHint.id]);
  };

  const fetchAccountEvidence = useCallback(
    async (auth: Level1AuthSession) => {
      try {
        const response = await getResearchLabAccounts(auth.accessToken, session!.sessionId);
        setEvidenceAccounts(response.accounts ?? []);
      } catch {
        // silent — evidence fetch is non-critical
      }
    },
    [session]
  );

  const executeTransaction = async (payload: LabTransactionPayload) => {
    if (!activeLab || !session || isRunning) return;
    try {
      const auth = activeBackendAuth ?? (await ensureLabAuth());

      const enrichedInputs = {
        collateralSourceRef: payload.action_type === "DEPOSIT_COLLATERAL"
          ? payload.collateral_account_ref
          : undefined,
        collateralSourceLabel: payload.action_type === "DEPOSIT_COLLATERAL"
          ? NEUTRAL_LABELS[payload.collateral_account_ref] ?? payload.collateral_account_ref
          : undefined,
        vaultDestinationRef: payload.action_type === "DEPOSIT_COLLATERAL"
          ? payload.vault_account_ref
          : undefined,
        vaultDestinationLabel: payload.action_type === "DEPOSIT_COLLATERAL"
          ? NEUTRAL_LABELS[payload.vault_account_ref] ?? payload.vault_account_ref
          : undefined,
        amount: payload.amount,
      };

      const result = await submitResearchLabTransaction(auth.accessToken, session.sessionId, payload);

      const enriched: EnrichedTransactionResult = { ...result, inputs: enrichedInputs };

      setTxResults((prev) => [enriched, ...prev]);

      const beforeRunSequence = session.latestTerminalSequence;
      const nextSession = await pollTerminal(auth, session, beforeRunSequence);

      if (result.executionStatus === "success") {
        toast.success(
          payload.action_type === "DEPOSIT_COLLATERAL"
            ? "Deposit submitted to sandbox"
            : "Withdrawal submitted to sandbox"
        );
        await fetchAccountEvidence(auth);
      } else {
        const lastLog = result.logs?.at(-1);
        if (lastLog?.toLowerCase().includes("simulation") || lastLog?.toLowerCase().includes("instruction")) {
          toast.error("Transaction simulation failed", { description: lastLog });
        } else if (lastLog?.toLowerCase().includes("session") || lastLog?.toLowerCase().includes("expired")) {
          toast.error("Session error", { description: lastLog });
        } else {
          toast.error("Transaction failed", {
            description: lastLog ?? "Check transaction logs for details",
          });
        }
      }

      if (nextSession.terminalLines.length > session.terminalLines.length) {
        setConsoleOpen(true);
      }
    } catch (error) {
      const message = getErrorMessage(error);
      if (message.toLowerCase().includes("validation") || message.toLowerCase().includes("invalid")) {
        toast.error("Invalid request", { description: message });
      } else if (message.toLowerCase().includes("network") || message.toLowerCase().includes("fetch")) {
        toast.error("Network error", { description: "Check your connection and try again." });
      } else {
        toast.error(message);
      }
    }
  };

  const proveImpact = async () => {
    if (!activeLab || !session || isRunning) return;
    setIsRunning(true);
      setConsoleOpen(true);
    try {
      const auth = activeBackendAuth ?? (await ensureLabAuth());
      const beforeRunSequence = session.latestTerminalSequence;

      const result = await verifyResearchLabObjective(auth.accessToken, session.sessionId);

      const nextSession = await pollTerminal(auth, session, beforeRunSequence);

      if (result.passed) {
        setSession({
          ...nextSession,
          status: "passed",
          stage: "report",
          objectiveProgress: activeLab.objectives.length,
        });
        await loadReport(auth, nextSession);
        setConsoleOpen(false);
        toast.success("Impact Verified", {
          description:
            "Unauthorized treasury withdrawal reproduced. Continue to Submit Finding when ready.",
        });
      } else {
        toast.error("Exploit proof did not verify", {
          description: "Review the runtime output and transaction evidence before trying again.",
        });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsRunning(false);
    }
  };

  const saveReportDraft = async () => {
    if (!session) return null;
    setIsReportSaving(true);
    try {
      const auth = activeBackendAuth ?? (await ensureLabAuth());
      const nextReport = await saveResearchLabReportDraft({
        accessToken: auth.accessToken,
        fields: reportFields,
        sessionId: session.sessionId,
      });
      setReport(nextReport);
      toast.message("Report draft saved");
      return nextReport;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return null;
    } finally {
      setIsReportSaving(false);
    }
  };

  const submitReport = async () => {
    if (!activeLab || !session || isReportSubmitting) return;
    if (!reportMetaFields.title.trim() || !reportMetaFields.likelihood) {
      toast.error("Complete the finding title and likelihood before submitting.");
      return;
    }
    setIsReportSubmitting(true);
    try {
      const auth = activeBackendAuth ?? (await ensureLabAuth());
      const saved = await saveResearchLabReportDraft({
        accessToken: auth.accessToken,
        fields: reportFields,
        sessionId: session.sessionId,
      });
      setReport(saved);

      const submitted = await submitResearchLabReport(auth.accessToken, session.sessionId);
      setReport(submitted);
      setSession({
        ...session,
        labCompleted: Boolean(submitted.labCompleted),
        objectiveProgress: submitted.labCompleted
          ? activeLab.objectives.length
          : session.objectiveProgress,
        reportStatus: submitted.status,
        stage: "report",
        xpAwarded: submitted.xpAwarded,
      });

      if (submitted.status === "accepted" && submitted.labCompleted) {
        setAuditReportStage("SUBMITTED");
        toast.success(`Report accepted. ${submitted.xpAwarded ?? activeLab.xpReward} XP awarded.`);
      } else {
        setAuditReportStage("BUILDER");
        toast.error("Report needs revision", {
          description:
            submitted.feedback ??
            "The report needs clearer vulnerability, impact, and remediation details.",
        });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsReportSubmitting(false);
    }
  };

  if (!activeLab || !session) {
    return (
      <ResearchLabCatalog
        catalogError={catalogError}
        isAuthenticated={isBackendAuthenticated}
        isLoading={isCatalogLoading}
        labs={labs}
        onLoadCatalog={loadCatalog}
        onOpenLab={openLab}
        walletStatus={walletStatus}
      />
    );
  }

  return (
    <section className="relative min-h-[calc(100vh-88px)] overflow-x-hidden border-t border-white/10 bg-[#070808] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(153,69,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(20,241,149,0.04)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_52%_8%,rgba(153,69,255,0.12),transparent_32%),radial-gradient(circle_at_78%_24%,rgba(20,241,149,0.08),transparent_34%)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-88px)] max-w-[1800px] flex-col px-5 pb-5 pt-4 2xl:px-7">
        <ResearchLabSessionHeader
          lab={activeLab}
          phase={phase}
          sandboxStatus={sandboxStatus}
          onBack={leaveLab}
          onReset={resetEnvironment}
          onLeave={leaveLab}
        />

        <LabScenarioBriefing lab={activeLab} phase={phase} />

        <div className="mt-3 grid min-h-[920px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:min-h-[980px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
          <ResearchLabWorkspace
            activeFile={activeFile}
            activeFileContent={activeFileContent}
            activeTab={resolvedActiveTab}
            accounts={buildAccountEvidence(session, impactVerified)}
            auditReportStage={auditReportStage}
            availableTabs={availableTabs}
            impactVerified={impactVerified}
            findingReviewPassed={findingReviewPassed}
            files={session.fileEntries}
            isRunning={isRunning}
            questionnaireAnswers={questionnaireAnswers}
            questionnaireResult={questionnaireResult}
            reportOpened={reportOpened}
            retryQuestionIds={retryQuestionIds}
            reviewAttempts={reviewAttempts}
            reviewIndex={reviewIndex}
            reviewMode={reviewMode}
            reviewStarted={reviewStarted}
            report={report}
            reportFields={reportFields}
            reportMetaFields={reportMetaFields}
            txResults={txResults}
            evidenceAccounts={evidenceAccounts}
            executeExploitView={executeExploitView}
            onChangeReportFields={setReportFields}
            onChangeReportMetaFields={setReportMetaFields}
            onChangeAuditReportStage={setAuditReportStage}
            onChangeExecuteExploitView={setExecuteExploitView}
            onProveImpact={proveImpact}
            onExecuteTransaction={executeTransaction}
            onQuestionnaireAnswer={updateQuestionnaireAnswer}
            onQuestionnaireRetry={retryQuestionnaire}
            onQuestionnaireSubmit={submitQuestionnaire}
            onOpenFindingReport={openFindingReport}
            onReviewIndexChange={setReviewIndex}
            onReviewStart={startFindingReview}
            onSaveReport={saveReportDraft}
            onSelectFile={setActiveFilePath}
            onSubmitReport={submitReport}
            onTabChange={setActiveTab}
            isReportSaving={isReportSaving}
            isReportSubmitting={isReportSubmitting}
          />

          <LabContextPanel
            activeFile={activeFile}
            auditReportStage={auditReportStage}
            lab={activeLab}
            phase={phase}
            executeExploitView={executeExploitView}
            findingReviewPassed={findingReviewPassed}
            impactVerified={impactVerified}
            questionnaireResult={questionnaireResult}
            report={report}
            reportOpened={reportOpened}
            retryQuestionIds={retryQuestionIds}
            reviewMode={reviewMode}
            reviewStarted={reviewStarted}
            reviewStepCurrent={reviewStepCurrent}
            reviewStepTotal={reviewStepTotal}
            criticalAnsweredCount={criticalAnsweredCount}
            criticalTotal={criticalTotal}
            revealedHints={revealedHints}
            session={session}
            txResults={txResults}
            onOpenExploit={() => setActiveTab("exploit")}
            onOpenReport={openFindingReport}
            onRevealHint={revealHint}
            onRetryReview={retryQuestionnaire}
            onStartReview={startFindingReview}
          />
        </div>

        <RuntimeConsoleDrawer
          compact={phase === "SUBMIT_FINDING" || phase === "COMPLETED"}
          isOpen={consoleOpen}
          isRunning={isRunning}
          lines={session.terminalLines}
          onToggle={() => setConsoleOpen((open) => !open)}
        />
      </div>
    </section>
  );
}


function deriveLabPhase({
  activeTab,
  impactVerified,
  isRunning,
  report,
  session,
}: {
  activeTab: WorkspaceTab;
  impactVerified: boolean;
  isRunning: boolean;
  report: ResearchLabReport | null;
  session: ResearchLabSession | null;
}): LabPhase {
  if (session?.labCompleted || report?.status === "accepted") return "COMPLETED";
  if (activeTab === "verify" || isRunning || session?.status === "running_tests" || session?.status === "failed") {
    return "VERIFY_IMPACT";
  }
  if (activeTab === "exploit") return "EXECUTE_EXPLOIT";
  if (activeTab === "report" || impactVerified) return "SUBMIT_FINDING";
  return "INSPECT";
}

function deriveSandboxStatus(session: ResearchLabSession | null, isRunning: boolean): SandboxStatus {
  if (isRunning || session?.status === "running_tests") return "RUNNING";
  switch (session?.status) {
    case "provisioning":
      return "PROVISIONING";
    case "expired":
      return "EXPIRED";
    case "error":
      return "ERROR";
    default:
      return "READY";
  }
}

function buildAccountEvidence(session: ResearchLabSession, verified: boolean): AccountEvidence[] {
  const wallet = session.sessionId.slice(0, 4) || "9xQe";
  return [
    {
      id: "signer",
      label: "Investigator Wallet",
      address: `${wallet}...wallet`,
      owner: "System Program",
      role: "Transaction signer",
      authority: "Connected wallet",
      state: [{ label: "Signer", value: "Available" }],
    },
    {
      id: "protocol-state",
      label: "Protocol State",
      address: "PDA...state",
      owner: "Lab Program",
      role: "State account under investigation",
      authority: verified ? "Unexpected authority accepted" : "Expected authority unknown",
      state: [
        { label: "Transition", value: "Unverified", after: verified ? "Unauthorized transition observed" : undefined },
        { label: "Evidence", value: "Pending", after: verified ? "Captured" : undefined },
      ],
    },
    {
      id: "treasury",
      label: "Protocol Treasury",
      address: "Vault...1111",
      owner: "Lab Program",
      role: "Value-bearing account",
      mint: "Scenario-defined asset",
      state: [
        { label: "Pre-state", value: "Stable" },
        { label: "Post-state", value: "Pending", after: verified ? "State delta detected" : undefined },
      ],
    },
  ];
}
