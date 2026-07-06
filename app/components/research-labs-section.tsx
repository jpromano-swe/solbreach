"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  ensureBackendWalletAuth,
  type Level1AuthSession,
} from "../lib/levels/level1-backend";
import type { Level1ResearchLabMintAuthorization } from "../lib/hooks/use-certificate-minting";
import { trackAnalyticsEvent, type AnalyticsEventName } from "../lib/analytics";
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

const BASE_TABS: WorkspaceTab[] = ["inspect", "exploit"];

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

export function ResearchLabsSection({
  getExplorerUrl,
  isMintingLevel1Certificate,
  level1CertificateAssetId,
  level1CertificateMinted,
  onContinueToLevel2,
  onMintLevel1Certificate,
}: {
  getExplorerUrl: (path: string) => string;
  isMintingLevel1Certificate: boolean;
  level1CertificateAssetId?: string | null;
  level1CertificateMinted: boolean;
  onContinueToLevel2: () => void;
  onMintLevel1Certificate: (
    authorization?: Level1ResearchLabMintAuthorization
  ) => void;
}) {
  const { status: walletStatus, wallet } = useWallet();
  const [backendAuth, setBackendAuth] = useState<Level1AuthSession | null>(
    null
  );
  const [labs, setLabs] = useState<ResearchLabManifest[]>(
    FALLBACK_RESEARCH_LABS
  );
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [activeLab, setActiveLab] = useState<ResearchLabManifest | null>(null);
  const [session, setSession] = useState<ResearchLabSession | null>(null);
  const [activeFilePath, setActiveFilePath] = useState("");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("inspect");
  const [executeExploitView, setExecuteExploitView] =
    useState<ExecuteExploitView>("HYPOTHESIS");
  const [revealedHints, setRevealedHints] = useState<string[]>([]);
  const trackedViewEventsRef = useRef<Set<string>>(new Set());

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

  const resolveDefaultFilePath = useCallback(
    (
      lab: ResearchLabManifest | null,
      currentSession: ResearchLabSession | null,
      selectedPath?: string
    ) => {
      if (!lab || !currentSession) return "";

      return (
        (selectedPath
          ? currentSession.fileEntries.find(
              (file) => file.path === selectedPath
            )?.path
          : undefined) ??
        currentSession.fileEntries.find((file) => file.path === lab.entryFile)
          ?.path ??
        currentSession.fileEntries[0]?.path ??
        lab.entryFile ??
        ""
      );
    },
    []
  );

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
    reviewIndex,
    reviewMode,
    reviewOptionOrder,
    visibleReviewQuestions,
    reviewStarted,
    reviewStepCurrent,
    reviewStepTotal,
    setReviewIndex,
    startFindingReview,
    submitQuestionnaire,
    updateQuestionnaireAnswer,
  } = useFindingReview({
    getAuth: getActiveAuth,
    loadReport,
    onOpenReportTab: () => setActiveTab("report"),
    onSessionChange: setSession,
    onPopulateReportDefaults: populateReportDefaults,
    onResetAuditReportStage: () => setAuditReportStage("BUILDER"),
    session,
  });

  const activeFile = useMemo(() => {
    if (!activeLab || !session) return null;

    const resolvedPath = resolveDefaultFilePath(
      activeLab,
      session,
      activeFilePath
    );

    return (
      session.fileEntries.find((file) => file.path === resolvedPath) ?? null
    );
  }, [activeFilePath, activeLab, resolveDefaultFilePath, session]);

  const activeFileContent =
    activeFile && session
      ? (session.files[activeFile.path] ?? activeFile.content)
      : "";

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
    (report?.status === "accepted" || session?.labCompleted)
  );
  const availableTabs = useMemo<WorkspaceTab[]>(
    () => (impactVerified ? [...BASE_TABS, "report"] : BASE_TABS),
    [impactVerified]
  );
  const resolvedActiveTab = availableTabs.includes(activeTab)
    ? activeTab
    : activeTab === "verify" || activeTab === "report"
      ? "exploit"
      : "inspect";
  const changeWorkspaceTab = useCallback(
    (tab: WorkspaceTab) => {
      if (tab === "report" && !impactVerified) {
        setActiveTab("exploit");
        return;
      }

      setActiveTab(tab);
    },
    [impactVerified]
  );

  const trackLabEvent = useCallback(
    (
      eventName: AnalyticsEventName,
      properties?: Record<string, string | number | boolean | null | undefined>
    ) => {
      trackAnalyticsEvent({
        eventName,
        labId: activeLab?.id ?? null,
        properties,
        sessionId: session?.sessionId ?? null,
        walletAddress: wallet?.account.address ?? null,
      });
    },
    [activeLab?.id, session?.sessionId, wallet?.account.address]
  );

  useEffect(() => {
    trackAnalyticsEvent({
      eventName: "research_labs_catalog_viewed",
      walletAddress: wallet?.account.address ?? null,
    });
  }, [wallet?.account.address]);

  useEffect(() => {
    if (!activeLab || !session) return;

    const baseProperties = {
      activeTab: resolvedActiveTab,
      executeExploitView,
    };
    const events: Array<{
      eventName: AnalyticsEventName;
      properties?: Record<string, string | number | boolean | null | undefined>;
      key: string;
    }> = [];

    if (resolvedActiveTab === "inspect") {
      events.push({
        eventName: "rl1_inspect_viewed",
        key: `${session.sessionId}:rl1_inspect_viewed`,
        properties: baseProperties,
      });
      events.push({
        eventName: "rl1_account_state_viewed",
        key: `${session.sessionId}:rl1_account_state_viewed`,
        properties: baseProperties,
      });

      if (activeFile?.path) {
        events.push({
          eventName: "rl1_source_file_opened",
          key: `${session.sessionId}:rl1_source_file_opened:${activeFile.path}`,
          properties: {
            ...baseProperties,
            filePath: activeFile.path,
          },
        });
      }
    }

    if (resolvedActiveTab === "exploit") {
      events.push({
        eventName:
          executeExploitView === "EVIDENCE_REVIEW"
            ? "rl1_evidence_review_viewed"
            : "rl1_exploit_interface_viewed",
        key: `${session.sessionId}:${
          executeExploitView === "EVIDENCE_REVIEW"
            ? "rl1_evidence_review_viewed"
            : "rl1_exploit_interface_viewed"
        }`,
        properties: baseProperties,
      });
    }

    if (resolvedActiveTab === "report") {
      events.push({
        eventName: "rl1_report_finding_viewed",
        key: `${session.sessionId}:rl1_report_finding_viewed`,
        properties: baseProperties,
      });
    }

    for (const event of events) {
      if (trackedViewEventsRef.current.has(event.key)) continue;
      trackedViewEventsRef.current.add(event.key);
      trackAnalyticsEvent({
        eventName: event.eventName,
        labId: activeLab.id,
        properties: event.properties,
        sessionId: session.sessionId,
        walletAddress: wallet?.account.address ?? null,
      });
    }
  }, [
    activeFile?.path,
    activeLab,
    executeExploitView,
    resolvedActiveTab,
    session,
    wallet?.account.address,
  ]);

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
    onConsoleClose: () => undefined,
    onConsoleOpen: () => undefined,
    onSessionChange: setSession,
    pollTerminal,
    session,
  });

  const resetLocalState = useCallback(() => {
    setActiveFilePath("");
    setActiveTab("inspect");
    setExecuteExploitView("HYPOTHESIS");
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
        throw new Error(
          "Authenticate your wallet before opening a Research Lab."
        );
      }

      resetLocalState();
      const labDetail = await getResearchLab(auth.accessToken, lab.id);
      const nextSession = await createResearchLabSession(
        auth.accessToken,
        labDetail.id
      );
      const nextLab = { ...labDetail, files: nextSession.fileEntries };

      setActiveLab(nextLab);
      setSession(nextSession);
      setActiveFilePath(resolveDefaultFilePath(nextLab, nextSession));
      await pollTerminal(auth, nextSession, 0);
      await loadReport(auth, nextSession);
      trackAnalyticsEvent({
        eventName: "research_lab_opened",
        labId: nextLab.id,
        properties: {
          labSlug: nextLab.slug,
          labTitle: nextLab.title,
        },
        sessionId: nextSession.sessionId,
        walletAddress: auth.walletAddress,
      });
      toast.success("Research lab session created");
    } catch (error) {
      const message = getErrorMessage(error);
      setCatalogError(message);
      toast.error(message);
    } finally {
      setIsCatalogLoading(false);
    }
  };

  const resetEnvironment = useCallback(async () => {
    if (!activeLab || !session) return;
    try {
      const auth = await getActiveAuth();
      resetLocalState();
      const nextSession = await resetResearchLabSession(
        auth.accessToken,
        session.sessionId
      );
      const nextLab = { ...activeLab, files: nextSession.fileEntries };
      setSession(nextSession);
      setActiveLab(nextLab);
      setActiveFilePath(resolveDefaultFilePath(nextLab, nextSession));
      await loadReport(auth, nextSession);
      toast.message("Sandbox session reset");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [
    activeLab,
    getActiveAuth,
    loadReport,
    resetLocalState,
    resolveDefaultFilePath,
    session,
  ]);

  const leaveLab = () => {
    resetLocalState();
    setActiveLab(null);
    setSession(null);
  };

  const revealHint = () => {
    if (!activeLab) return;
    const nextHint = activeLab.hints.find(
      (hint) => !revealedHints.includes(hint.id)
    );
    if (!nextHint) return;
    trackLabEvent("rl1_hint_revealed", {
      hintId: nextHint.id,
      hintIndex: revealedHints.length + 1,
    });
    setRevealedHints([...revealedHints, nextHint.id]);
  };

  const openExploitFromContext = () => {
    trackLabEvent("rl1_try_exploit_clicked");
    setActiveTab("exploit");
  };

  const openFindingReportWithAnalytics = () => {
    trackLabEvent("rl1_audit_report_opened");
    openFindingReport();
  };

  const mintResearchLabCertificate = useCallback(() => {
    if (!activeBackendAuth?.accessToken || !session?.sessionId) {
      toast.error("Open an authenticated Research Lab session before minting.");
      return;
    }

    onMintLevel1Certificate({
      researchLabAccessToken: activeBackendAuth.accessToken,
      researchLabSessionId: session.sessionId,
    });
  }, [activeBackendAuth, onMintLevel1Certificate, session]);

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

        <div className="mt-3 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
          <ResearchLabWorkspace
            activeFile={activeFile}
            activeFileContent={activeFileContent}
            activeTab={resolvedActiveTab}
            accounts={buildAccountEvidence(session, impactVerified)}
            auditReportStage={auditReportStage}
            availableTabs={availableTabs}
            impactVerified={impactVerified}
            inspectHintRevealed={revealedHints.includes("account-binding")}
            findingReviewPassed={findingReviewPassed}
            files={session.fileEntries}
            isRunning={isRunning}
            questionnaireAnswers={questionnaireAnswers}
            questionnaireResult={questionnaireResult}
            reportOpened={reportOpened}
            retryQuestionIds={retryQuestionIds}
            reviewIndex={reviewIndex}
            reviewMode={reviewMode}
            reviewOptionOrder={reviewOptionOrder}
            reviewQuestions={visibleReviewQuestions}
            reviewStarted={reviewStarted}
            report={report}
            reportFields={reportFields}
            level1CertificateMinted={level1CertificateMinted}
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
            onOpenFindingReport={
              impactVerified
                ? openFindingReportWithAnalytics
                : () => setActiveTab("exploit")
            }
            onReviewIndexChange={setReviewIndex}
            onReviewStart={startFindingReview}
            onSaveReport={saveReportDraft}
            onSubmitReport={submitReport}
            onSelectFile={setActiveFilePath}
            onTabChange={changeWorkspaceTab}
            isReportSaving={isReportSaving}
            isReportSubmitting={isReportSubmitting}
          />

          <LabContextPanel
            activeFile={activeFile}
            lab={activeLab}
            phase={phase}
            executeExploitView={executeExploitView}
            auditReportStage={auditReportStage}
            findingReviewPassed={findingReviewPassed}
            impactVerified={impactVerified}
            isMintingLevel1Certificate={isMintingLevel1Certificate}
            level1CertificateAssetId={level1CertificateAssetId}
            level1CertificateExplorerUrl={
              level1CertificateAssetId
                ? getExplorerUrl(`/address/${level1CertificateAssetId}`)
                : null
            }
            level1CertificateMinted={level1CertificateMinted}
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
            onOpenExploit={openExploitFromContext}
            onOpenReport={
              impactVerified
                ? openFindingReportWithAnalytics
                : () => setActiveTab("exploit")
            }
            onRevealHint={revealHint}
            onRetryReview={retryQuestionnaire}
            onContinueToLevel2={onContinueToLevel2}
            onMintLevel1Certificate={mintResearchLabCertificate}
          />
        </div>
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
  if (session?.labCompleted || report?.status === "accepted")
    return "COMPLETED";
  if (activeTab === "report") return "SUBMIT_FINDING";
  if (
    activeTab === "verify" ||
    (activeTab === "exploit" && executeExploitView === "EVIDENCE_REVIEW") ||
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

function deriveSandboxStatus(
  session: ResearchLabSession | null,
  isRunning: boolean
): SandboxStatus {
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
