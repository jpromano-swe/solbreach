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
  listResearchLabs,
  resetResearchLabSession,
  type ResearchLabManifest,
  type ResearchLabReport,
  type ResearchLabSession,
} from "../lib/research-labs/lab-state";
import { useWallet } from "../lib/wallet/context";
import { ResearchLabCatalog } from "./research-labs/catalog";
import { buildAccountEvidence } from "./research-labs/account-evidence";
import { LabContextPanel } from "./research-labs/context-panel";
import {
  LabScenarioBriefing,
  ResearchLabSessionHeader,
} from "./research-labs/lab-shell";
import { RuntimeConsoleDrawer } from "./research-labs/runtime-console";
import { ResearchLabWorkspace } from "./research-labs/workspace";
import { useFindingReview } from "./research-labs/use-finding-review";
import { useResearchLabReport } from "./research-labs/use-research-lab-report";
import { useResearchLabTransactions } from "./research-labs/use-research-lab-transactions";
import type {
  ExecuteExploitView,
  LabPhase,
  SandboxStatus,
  WorkspaceTab,
} from "./research-labs/types";

const AVAILABLE_TABS: WorkspaceTab[] = ["inspect", "exploit", "report"];

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

  const activeBackendAuth =
    backendAuth &&
    walletStatus === "connected" &&
    wallet?.account.address === backendAuth.walletAddress
      ? backendAuth
      : null;
  const isBackendAuthenticated = Boolean(activeBackendAuth?.accessToken);

  const ensureLabAuth = useCallback(async () => {
    if (walletStatus !== "connected" || !wallet) {
      throw new Error("Connect your wallet before opening Research Labs.");
    }

    const auth = await ensureBackendWalletAuth(wallet);
    setBackendAuth(auth);
    return auth;
  }, [wallet, walletStatus]);

  const getActiveAuth = useCallback(
    async () => activeBackendAuth ?? (await ensureLabAuth()),
    [activeBackendAuth, ensureLabAuth]
  );

  const {
    auditReportStage,
    isReportSaving,
    isReportSubmitting,
    loadReport,
    populateReportDefaults,
    report,
    reportFields,
    resetReport,
    saveReportDraft,
    setAuditReportStage,
    setReportFields,
    submitReport,
  } = useResearchLabReport({
    activeLab,
    getAuth: getActiveAuth,
    onSessionChange: setSession,
    session,
  });

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

  const impactVerified = Boolean(
    session?.impactVerified ??
      session?.labCompleted ??
      (report?.status === "accepted" ? true : false)
  );
  const reportUnlocked = Boolean(
    session?.reportUnlocked ??
      (report?.status === "draft" ||
      report?.status === "retry" ||
      report?.status === "accepted")
  );
  const findingReviewPassed = Boolean(
    session?.findingReviewPassed ??
      questionnaireResult?.passed ??
      (report?.status === "accepted" || session?.labCompleted)
  );
  const resolvedActiveTab = AVAILABLE_TABS.includes(activeTab)
    ? activeTab
    : activeTab === "verify"
      ? "exploit"
      : "inspect";

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
    [setSession]
  );

  const {
    evidenceAccounts,
    executeTransaction,
    isRunning,
    proveImpact,
    resetTransactions,
    txResults,
  } = useResearchLabTransactions({
    activeLab,
    getAuth: getActiveAuth,
    loadReport,
    onConsoleClose: () => setConsoleOpen(false),
    onConsoleOpen: () => setConsoleOpen(true),
    onSessionChange: setSession,
    pollTerminal,
    session,
  });

  const resetLocalState = useCallback(() => {
    setActiveFilePath("");
    setActiveTab("inspect");
    setExecuteExploitView("HYPOTHESIS");
    setConsoleOpen(false);
    setRevealedHints([]);
    resetReport();
    resetTransactions();
    resetFindingReview();
  }, [resetFindingReview, resetReport, resetTransactions]);

  const sandboxStatus = deriveSandboxStatus(session, isRunning);
  const phase = deriveLabPhase({
    activeTab: resolvedActiveTab,
    executeExploitView,
    impactVerified,
    isRunning,
    report,
    session,
  });

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
      resetLocalState();
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
    try {
      const auth = await getActiveAuth();
      const nextSession = await resetResearchLabSession(auth.accessToken, session.sessionId);
      setSession(nextSession);
      setActiveLab({ ...activeLab, files: nextSession.fileEntries });
      setActiveFilePath(
        nextSession.fileEntries.find((file) => file.path === activeLab.entryFile)?.path ??
          nextSession.fileEntries[0]?.path ??
          activeLab.entryFile
      );
      resetLocalState();
      await loadReport(auth, nextSession);
      toast.message("Sandbox session reset");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const leaveLab = () => {
    resetLocalState();
    setActiveLab(null);
    setSession(null);
  };

  const revealHint = () => {
    if (!activeLab) return;
    const nextHint = activeLab.hints.find((hint) => !revealedHints.includes(hint.id));
    if (!nextHint) return;
    setRevealedHints([...revealedHints, nextHint.id]);
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
            availableTabs={AVAILABLE_TABS}
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
            txResults={txResults}
            evidenceAccounts={evidenceAccounts}
            executeExploitView={executeExploitView}
            onChangeReportFields={setReportFields}
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
            reportUnlocked={reportUnlocked}
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
  executeExploitView,
  impactVerified,
  isRunning,
  report,
  session,
}: {
  activeTab: WorkspaceTab;
  executeExploitView: ExecuteExploitView;
  impactVerified: boolean;
  isRunning: boolean;
  report: ResearchLabReport | null;
  session: ResearchLabSession | null;
}): LabPhase {
  if (session?.labCompleted || report?.status === "accepted") return "COMPLETED";
  if (activeTab === "report") return "SUBMIT_FINDING";
  if (
    activeTab === "verify" ||
    activeTab === "exploit" && executeExploitView === "EVIDENCE_REVIEW" ||
    isRunning ||
    session?.status === "running_tests" ||
    session?.status === "failed"
  ) {
    return "VERIFY_IMPACT";
  }
  if (activeTab === "exploit") return "EXECUTE_EXPLOIT";
  if (impactVerified && activeTab !== "inspect") return "SUBMIT_FINDING";
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
