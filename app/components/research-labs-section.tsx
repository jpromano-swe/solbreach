"use client";

import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock3,
  Code2,
  FileCode2,
  FolderOpen,
  MoreHorizontal,
  Play,
  RefreshCcw,
  ScrollText,
  ShieldCheck,
  TerminalSquare,
  Wallet,
  Wifi,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import {
  ensureBackendWalletAuth,
  type Level1AuthSession,
} from "../lib/levels/level1-backend";
import {
  applyRunResult,
  applyTerminalEvents,
  createResearchLabSession,
  FALLBACK_RESEARCH_LABS,
  fetchResearchLabTerminal,
  getResearchLab,
  getResearchLabReport,
  listResearchLabs,
  resetResearchLabSession,
  runResearchLabTests,
  verifyResearchLabObjective,
  submitResearchLabTransaction,
  saveResearchLabReportDraft,
  submitResearchLabReport,
  type ResearchLabFile,
  type ResearchLabManifest,
  type ResearchLabReport,
  type ResearchLabReportFields,
  type ResearchLabSession,
  type ResearchLabTestResult,
} from "../lib/research-labs/lab-state";
import { useWallet } from "../lib/wallet/context";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Loading source viewer...
      </div>
    ),
  }
);

type WorkspaceTab = "code" | "accounts" | "exploit" | "txlogs" | "report";
type LabPhase = "BRIEFING" | "INSPECT" | "PROVE_IMPACT" | "REPORT" | "COMPLETED";
type SandboxStatus = "PROVISIONING" | "READY" | "RUNNING" | "RESETTING" | "EXPIRED" | "ERROR";

type AccountEvidence = {
  id: string;
  label: string;
  address: string;
  owner: string;
  role: string;
  authority?: string;
  mint?: string;
  state: Array<{ label: string; value: string; after?: string }>;
};

const LOCKED_LABS = [
  {
    id: "rl-011",
    title: "Oracle Drift",
    difficulty: "Advanced",
    estimatedTime: "3-5 hours",
    xpReward: 350,
    summary:
      "Investigate stale price confidence and liquidation boundary assumptions.",
  },
  {
    id: "rl-014",
    title: "Escrow Shadow",
    difficulty: "Intermediate",
    estimatedTime: "2-3 hours",
    xpReward: 275,
    summary:
      "Trace escrow authority constraints through a constrained CPI surface.",
  },
];

const emptyReportFields: ResearchLabReportFields = {
  vulnerabilityCategory: null,
  affectedArea: null,
  rootCause: "",
  impact: "",
  proof: "",
  recommendedFix: "",
  severity: null,
};

const labShellCopy = {
  labCode: "RL-001",
  titleFallback: "Configured Research Lab",
  scenario:
    "A protocol has reported state transitions that should not satisfy its normal account requirements. Review the source, inspect account relationships, test an exploit hypothesis, and document the cause if you can prove impact.",
  objective:
    "Determine whether an attacker can trigger an unauthorized state transition and collect enough evidence to report the finding.",
};

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
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("code");
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [revealedHints, setRevealedHints] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<ResearchLabReport | null>(null);
  const [reportFields, setReportFields] = useState<ResearchLabReportFields>(emptyReportFields);
  const [isReportSaving, setIsReportSaving] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);

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

  const phase = deriveLabPhase(session, report, isRunning);
  const sandboxStatus = deriveSandboxStatus(session, isRunning);
  const reportUnlocked = phase === "REPORT" || phase === "COMPLETED";
  const availableTabs = useMemo(
    () =>
      reportUnlocked
        ? ([
            "code",
            "accounts",
            "exploit",
            "txlogs",
            "report",
          ] as WorkspaceTab[])
        : (["code", "accounts", "exploit", "txlogs"] as WorkspaceTab[]),
    [reportUnlocked]
  );
  const resolvedActiveTab = availableTabs.includes(activeTab)
    ? activeTab
    : "code";

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
      setActiveTab("code");
      setConsoleOpen(false);
      setRevealedHints([]);
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
      setActiveTab("code");
      setConsoleOpen(false);
      setRevealedHints([]);
      setReport(null);
      setReportFields(emptyReportFields);
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
    setActiveTab("code");
    setConsoleOpen(false);
    setRevealedHints([]);
    setReport(null);
    setReportFields(emptyReportFields);
  };

  const revealHint = () => {
    if (!activeLab) return;
    const nextHint = activeLab.hints.find((hint) => !revealedHints.includes(hint.id));
    if (!nextHint) return;
    setRevealedHints([...revealedHints, nextHint.id]);
  };

  const executeTransaction = async (payloadText: string) => {
    if (!activeLab || !session || isRunning) return;
    try {
      const auth = activeBackendAuth ?? (await ensureLabAuth());
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(payloadText);
      } catch {
        throw new Error("Invalid JSON payload");
      }
      
      const beforeRunSequence = session.latestTerminalSequence;
      await submitResearchLabTransaction(auth.accessToken, session.sessionId, parsedPayload);
      
      toast.success("Transaction sent to sandbox");
      
      // Fetch latest logs if available
      const nextSession = await pollTerminal(auth, session, beforeRunSequence);
      if (nextSession.terminalLines.length > session.terminalLines.length) {
        setConsoleOpen(true);
        setActiveTab("txlogs");
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const proveImpact = async () => {
    if (!activeLab || !session || isRunning) return;
    setIsRunning(true);
    setActiveTab("txlogs");
    setConsoleOpen(true);
    try {
      const auth = activeBackendAuth ?? (await ensureLabAuth());
      const beforeRunSequence = session.latestTerminalSequence;
      const runningSession = { ...session, status: "running_tests" as const, stage: "report" as const };
      setSession(runningSession);

      let isVerifyResult = false;
      let result;
      try {
        result = await runResearchLabTests(auth.accessToken, runningSession.sessionId);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("exploit verification")) {
          result = await verifyResearchLabObjective(auth.accessToken, runningSession.sessionId);
          isVerifyResult = true;
        } else {
          throw err;
        }
      }

      if (isVerifyResult) {
        const passed = Boolean((result as Record<string, unknown>).passed);
        const nextSession = await pollTerminal(auth, { ...runningSession, status: "active" as const }, beforeRunSequence);
        if (passed) {
          await loadReport(auth, nextSession);
          setActiveTab("report");
          toast.success("Impact verified. Finding report unlocked.");
        } else {
          toast.error("Exploit proof did not verify", {
            description: "Review the runtime output and transaction evidence before trying again.",
          });
        }
      } else {
        const testedSession = applyRunResult(runningSession, result);
        const nextSession = await pollTerminal(auth, testedSession, beforeRunSequence);

        if (result.status === "passed" || nextSession.status === "passed") {
          const nextReport = await loadReport(auth, nextSession);
          if (result.lab_completed || nextReport.labCompleted) {
            setActiveTab("report");
            toast.success(`Research lab completed. ${result.xp_awarded ?? nextReport.xpAwarded ?? activeLab.xpReward} XP awarded.`);
          } else {
            setActiveTab("report");
            toast.success("Impact verified. Finding report unlocked.");
          }
        } else {
          toast.error("Exploit proof did not verify", {
            description: "Review the runtime output and transaction evidence before trying again.",
          });
        }
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
        toast.success(`Report accepted. ${submitted.xpAwarded ?? activeLab.xpReward} XP awarded.`);
      } else {
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
    <section className="relative min-h-[calc(100vh-88px)] overflow-hidden border-t border-white/10 bg-[#070808] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(153,69,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(20,241,149,0.04)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40" />
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_52%_8%,rgba(153,69,255,0.12),transparent_32%),radial-gradient(circle_at_78%_24%,rgba(20,241,149,0.08),transparent_34%)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-88px)] max-w-[1800px] flex-col px-5 py-5 2xl:px-7">
        <ResearchLabSessionHeader
          lab={activeLab}
          phase={phase}
          sandboxStatus={sandboxStatus}
          onBack={leaveLab}
          onReset={resetEnvironment}
          onLeave={leaveLab}
        />

        <LabScenarioBriefing lab={activeLab} phase={phase} />

        <div className="mt-4 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_380px] gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
          <ResearchLabWorkspace
            activeFile={activeFile}
            activeFileContent={activeFileContent}
            activeTab={resolvedActiveTab}
            accounts={buildAccountEvidence(session, reportUnlocked)}
            availableTabs={availableTabs}
            files={session.fileEntries}
            isRunning={isRunning}
            report={report}
            reportFields={reportFields}
            results={session.testResults}
            session={session}
            onChangeReportFields={setReportFields}
            onProveImpact={proveImpact}
            onExecuteTransaction={executeTransaction}
            onSaveReport={saveReportDraft}
            onSelectFile={setActiveFilePath}
            onSubmitReport={submitReport}
            onTabChange={setActiveTab}
            isReportSaving={isReportSaving}
            isReportSubmitting={isReportSubmitting}
          />

          <LabContextPanel
            activeFile={activeFile}
            lab={activeLab}
            phase={phase}
            report={report}
            revealedHints={revealedHints}
            session={session}
            onOpenReport={() => setActiveTab("report")}
            onRevealHint={revealHint}
            onProveImpact={proveImpact}
          />
        </div>

        <RuntimeConsoleDrawer
          isOpen={consoleOpen}
          isRunning={isRunning}
          lines={session.terminalLines}
          onToggle={() => setConsoleOpen((open) => !open)}
        />
      </div>
    </section>
  );
}

function ResearchLabCatalog({
  catalogError,
  isAuthenticated,
  isLoading,
  labs,
  onLoadCatalog,
  onOpenLab,
  walletStatus,
}: {
  catalogError: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  labs: ResearchLabManifest[];
  onLoadCatalog: () => void;
  onOpenLab: (lab: ResearchLabManifest) => void;
  walletStatus: string;
}) {
  const authCopy =
    walletStatus !== "connected"
      ? "Connect your wallet before loading authenticated labs."
      : isAuthenticated
        ? "Authenticated sandbox access is active."
        : "Sign a wallet auth message before loading sandbox labs.";

  return (
    <section className="relative min-h-[calc(100vh-88px)] overflow-hidden border-t border-white/10 bg-[#070808] px-6 py-16 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(153,69,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(20,241,149,0.045)_1px,transparent_1px)] bg-[size:48px_48px] opacity-35" />
      <div className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_26%_20%,rgba(153,69,255,0.14),transparent_32%),radial-gradient(circle_at_72%_30%,rgba(20,241,149,0.1),transparent_35%)]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.42em] text-zinc-500">
            Research Labs
          </p>
          <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-white md:text-6xl">
            Supported protocol investigations.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
            Inspect a focused Solana protocol scenario, prove impact inside an isolated sandbox, and submit a structured finding report.
          </p>
        </div>

        {catalogError ? (
          <div className="mt-8 max-w-2xl rounded-2xl border border-red-400/20 bg-red-500/8 p-4 text-sm text-red-200">
            {catalogError}
          </div>
        ) : null}

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={onLoadCatalog}
            disabled={isLoading}
            className="rounded-full border border-[#9945ff]/30 bg-[#9945ff]/10 px-4 py-2 text-sm font-semibold text-[#b892ff] transition hover:bg-[#9945ff]/16 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? "Loading labs"
              : walletStatus !== "connected"
                ? "Connect wallet"
                : isAuthenticated
                  ? "Refresh labs"
                  : "Authenticate wallet"}
          </button>
          <span className="text-sm text-zinc-500">{authCopy}</span>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {labs.map((lab) => (
            <button
              key={lab.id}
              type="button"
              onClick={() => onOpenLab(lab)}
              disabled={isLoading || !isAuthenticated}
              className="group rounded-[22px] border border-white/10 bg-white/[0.045] p-6 text-left shadow-2xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-[#9945ff]/45 hover:bg-white/[0.065] focus:outline-none focus:ring-2 focus:ring-[#9945ff]/50 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full border border-[#9945ff]/30 bg-[#9945ff]/10 px-3 py-1 text-xs font-semibold text-[#b892ff]">
                  {lab.id.toUpperCase()}
                </span>
                <span className="flex items-center gap-2 rounded-full border border-[#14f195]/20 bg-[#14f195]/10 px-3 py-1 text-xs font-medium text-[#8fffd0]">
                  <Wifi className="h-3.5 w-3.5" />
                  Available
                </span>
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white">
                {lab.title || labShellCopy.titleFallback}
              </h2>
              <p className="mt-3 min-h-20 text-sm leading-6 text-zinc-400">
                {lab.summary || labShellCopy.scenario}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-zinc-400">
                <Metric icon={<ShieldCheck />} label={lab.difficulty} />
                <Metric icon={<Clock3 />} label={lab.estimatedTime} />
              </div>
              <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5 text-sm">
                <span className="text-zinc-500">Sandbox investigation</span>
                <span className="font-medium text-[#b892ff] transition group-hover:text-white">
                  {isAuthenticated ? "Open lab" : "Auth required"}
                </span>
              </div>
            </button>
          ))}

          {LOCKED_LABS.map((lab) => (
            <div key={lab.id} className="rounded-[22px] border border-white/10 bg-white/[0.025] p-6 opacity-70">
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-zinc-500">
                  {lab.id}
                </span>
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-500">
                  Queued
                </span>
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-zinc-300">
                {lab.title}
              </h2>
              <p className="mt-3 min-h-20 text-sm leading-6 text-zinc-500">{lab.summary}</p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-zinc-500">
                <Metric icon={<ShieldCheck />} label={lab.difficulty} />
                <Metric icon={<Clock3 />} label={lab.estimatedTime} />
              </div>
              <div className="mt-7 border-t border-white/10 pt-5 text-sm text-zinc-600">
                Sandbox template pending
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ResearchLabSessionHeader({
  lab,
  phase,
  sandboxStatus,
  onBack,
  onReset,
  onLeave,
}: {
  lab: ResearchLabManifest;
  phase: LabPhase;
  sandboxStatus: SandboxStatus;
  onBack: () => void;
  onReset: () => void;
  onLeave: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex items-center justify-between gap-4 rounded-[20px] border border-white/10 bg-[#111212]/80 px-4 py-3 shadow-2xl shadow-black/25 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Labs
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <p className="truncate text-sm font-semibold text-white">
              {(lab.id || labShellCopy.labCode).toUpperCase()}: {lab.title || labShellCopy.titleFallback}
            </p>
            <PhaseBadge phase={phase} />
          </div>
          <p className="mt-1 truncate text-xs text-zinc-500">Supported sandbox investigation</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SandboxStatusPill status={sandboxStatus} />
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Session options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-12 z-20 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#101112] p-1 shadow-2xl shadow-black/50">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onReset();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/[0.06]"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset session
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onLeave();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-zinc-400 hover:bg-white/[0.06]"
              >
                Leave lab
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function LabScenarioBriefing({ lab, phase }: { lab: ResearchLabManifest; phase: LabPhase }) {
  return (
    <section className="mt-4 rounded-[22px] border border-white/10 bg-[#111212]/70 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_520px]">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500">
            Scenario Briefing
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white 2xl:text-4xl">
            Investigate the protocol behavior.
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400 2xl:text-base 2xl:leading-8">
            {lab.summary && !/arithmetic|oracle|health/i.test(lab.summary)
              ? lab.summary
              : labShellCopy.scenario}
          </p>
        </div>
        <InvestigationStepper phase={phase} />
      </div>
    </section>
  );
}

function ResearchLabWorkspace({
  activeFile,
  activeFileContent,
  activeTab,
  accounts,
  availableTabs,
  files,
  isRunning,
  report,
  reportFields,
  results,
  session,
  onChangeReportFields,
  onProveImpact,
  onExecuteTransaction,
  onSaveReport,
  onSelectFile,
  onSubmitReport,
  onTabChange,
  isReportSaving,
  isReportSubmitting,
}: {
  activeFile: ResearchLabFile | null;
  activeFileContent: string;
  activeTab: WorkspaceTab;
  accounts: AccountEvidence[];
  availableTabs: WorkspaceTab[];
  files: ResearchLabFile[];
  isRunning: boolean;
  report: ResearchLabReport | null;
  reportFields: ResearchLabReportFields;
  results: ResearchLabTestResult[];
  session: ResearchLabSession;
  onChangeReportFields: (fields: ResearchLabReportFields) => void;
  onProveImpact: () => void;
  onExecuteTransaction: (payload: string) => Promise<void>;
  onSaveReport: () => Promise<ResearchLabReport | null>;
  onSelectFile: (path: string) => void;
  onSubmitReport: () => void;
  onTabChange: (tab: WorkspaceTab) => void;
  isReportSaving: boolean;
  isReportSubmitting: boolean;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[22px] border border-white/10 bg-[#111212]/85 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <WorkspaceTabs activeTab={activeTab} availableTabs={availableTabs} onTabChange={onTabChange} />
      <div className="h-[min(70vh,820px)] min-h-[620px] overflow-hidden">
        {activeTab === "code" ? (
          <CodeTab
            activeFile={activeFile}
            activeFileContent={activeFileContent}
            files={files}
            onSelectFile={onSelectFile}
          />
        ) : null}
        {activeTab === "accounts" ? <AccountsTab accounts={accounts} /> : null}
        {activeTab === "exploit" ? (
          <ExploitTab isRunning={isRunning} session={session} onProveImpact={onProveImpact} onExecuteTransaction={onExecuteTransaction} />
        ) : null}
        {activeTab === "txlogs" ? <TransactionsLogsTab results={results} session={session} /> : null}
        {activeTab === "report" ? (
          <ReportTab
            fields={reportFields}
            isSaving={isReportSaving}
            isSubmitting={isReportSubmitting}
            report={report}
            onChange={onChangeReportFields}
            onSave={onSaveReport}
            onSubmit={onSubmitReport}
          />
        ) : null}
      </div>
    </div>
  );
}

function WorkspaceTabs({
  activeTab,
  availableTabs,
  onTabChange,
}: {
  activeTab: WorkspaceTab;
  availableTabs: WorkspaceTab[];
  onTabChange: (tab: WorkspaceTab) => void;
}) {
  const tabs: Array<{ id: WorkspaceTab; label: string; icon: ReactNode }> = [
    { id: "code", label: "Code", icon: <Code2 className="h-4 w-4" /> },
    { id: "accounts", label: "Accounts", icon: <Wallet className="h-4 w-4" /> },
    { id: "exploit", label: "Exploit", icon: <Play className="h-4 w-4" /> },
    { id: "txlogs", label: "Tx / Logs", icon: <TerminalSquare className="h-4 w-4" /> },
    { id: "report", label: "Report", icon: <ScrollText className="h-4 w-4" /> },
  ];

  return (
    <div className="flex items-center justify-between border-b border-white/10 px-4">
      <div className="flex min-w-0 overflow-x-auto">
        {tabs
          .filter((tab) => availableTabs.includes(tab.id))
          .map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex shrink-0 items-center gap-2 border-b px-4 py-4 text-sm transition ${
                activeTab === tab.id
                  ? "border-[#9945ff] text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
      </div>
      {!availableTabs.includes("report") ? (
        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs text-zinc-500">
          Report unlocks after verified impact
        </span>
      ) : null}
    </div>
  );
}

function CodeTab({
  activeFile,
  activeFileContent,
  files,
  onSelectFile,
}: {
  activeFile: ResearchLabFile | null;
  activeFileContent: string;
  files: ResearchLabFile[];
  onSelectFile: (path: string) => void;
}) {
  const shouldShowTree = files.length > 1;

  return (
    <div className={`grid h-full ${shouldShowTree ? "grid-cols-[280px_minmax(0,1fr)]" : "grid-cols-1"}`}>
      {shouldShowTree ? <FileTree activeFile={activeFile} files={files} onSelectFile={onSelectFile} /> : null}
      <div className="min-w-0 overflow-hidden">
        <div className="flex h-12 items-center justify-between border-b border-white/10 px-4">
          <div className="flex min-w-0 items-center gap-2 text-sm text-zinc-400">
            <FileCode2 className="h-4 w-4 text-[#b892ff]" />
            <span className="truncate">{activeFile?.path ?? "No file selected"}</span>
          </div>
          <div className="ml-4 flex shrink-0 items-center gap-2 text-xs text-zinc-500">
            Read-only protocol source
            <span className="h-1 w-1 rounded-full bg-zinc-700" />
            {activeFile?.language ?? "rust"}
          </div>
        </div>
        <div className="h-[calc(100%-48px)]">
          {activeFile ? (
            <MonacoEditor
              theme="vs-dark"
              language={activeFile.language}
              path={activeFile.path}
              value={activeFileContent}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                lineHeight: 22,
                scrollBeyondLastLine: false,
                wordWrap: "on",
                padding: { top: 18, bottom: 18 },
                renderLineHighlight: "line",
                overviewRulerBorder: false,
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              Select a protocol file to inspect.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileTree({
  activeFile,
  files,
  onSelectFile,
}: {
  activeFile: ResearchLabFile | null;
  files: ResearchLabFile[];
  onSelectFile: (path: string) => void;
}) {
  return (
    <div className="border-r border-white/10 bg-black/15 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">Visible Files</p>
      <div className="mt-4 space-y-1 text-sm">
        <TreeRow icon={<FolderOpen />} label="lab/" depth={0} />
        <TreeRow icon={<FolderOpen />} label="programs/" depth={1} />
        {files.map((file) => (
          <FileRow
            key={file.path}
            active={activeFile?.path === file.path}
            depth={file.path.includes("/") ? 2 : 1}
            file={file}
            onSelectFile={onSelectFile}
          />
        ))}
      </div>
    </div>
  );
}

function TreeRow({ icon, label, depth }: { icon: ReactNode; label: string; depth: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-zinc-500" style={{ paddingLeft: 8 + depth * 12 }}>
      <span className="h-4 w-4">{icon}</span>
      {label}
    </div>
  );
}

function FileRow({
  file,
  active,
  depth,
  onSelectFile,
}: {
  file: ResearchLabFile;
  active: boolean;
  depth: number;
  onSelectFile: (path: string) => void;
}) {
  const label = file.path.split("/").at(-1) ?? file.path;
  return (
    <button
      type="button"
      onClick={() => onSelectFile(file.path)}
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition ${
        active ? "bg-[#9945ff]/18 text-white" : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
      }`}
      style={{ paddingLeft: 8 + depth * 12 }}
    >
      <FileCode2 className="h-4 w-4" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function AccountsTab({ accounts }: { accounts: AccountEvidence[] }) {
  return (
    <div className="h-full overflow-auto p-5">
      <div className="mb-5 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">Accounts / State</p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Inspect the accounts involved in the current hypothesis. State changes appear here after an exploit attempt is verified by the sandbox.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {accounts.map((account) => (
          <div key={account.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{account.label}</p>
                <p className="mt-1 font-mono text-xs text-zinc-500">{account.address}</p>
              </div>
              <span className="rounded-full border border-[#14f195]/20 bg-[#14f195]/8 px-2.5 py-1 text-[11px] text-[#8fffd0]">
                Visible
              </span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <StateLine label="Owner" value={account.owner} />
              <StateLine label="Role" value={account.role} />
              {account.authority ? <StateLine label="Authority" value={account.authority} /> : null}
              {account.mint ? <StateLine label="Mint" value={account.mint} /> : null}
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
              {account.state.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 py-1 text-xs">
                  <span className="text-zinc-500">{item.label}</span>
                  <span className="font-mono text-zinc-300">{item.after ?? item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExploitTab({
  isRunning,
  session,
  onProveImpact,
  onExecuteTransaction,
}: {
  isRunning: boolean;
  session: ResearchLabSession;
  onProveImpact: () => void;
  onExecuteTransaction: (payload: string) => Promise<void>;
}) {
  const [txPayload, setTxPayload] = useState("{\n  \n}");
  const [isSendingTx, setIsSendingTx] = useState(false);
  const hasAttempt = session.status === "passed" || session.status === "failed" || session.status === "running_tests";

  const handleSendTx = async () => {
    setIsSendingTx(true);
    try {
      await onExecuteTransaction(txPayload);
    } finally {
      setIsSendingTx(false);
    }
  };

  return (
    <div className="grid h-full gap-5 overflow-auto p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-2xl border border-white/10 bg-black/15 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">Exploit Hypothesis</p>
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white">
          Test whether protocol state can transition outside its intended trust boundary.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
          Use the provided sandbox action to submit a controlled proof attempt. The frontend does not mark impact as verified locally; it waits for backend session evidence.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-sm font-semibold text-zinc-300">Transaction Payload (JSON)</p>
          <p className="mt-2 text-xs leading-6 text-zinc-500">
            Submit a raw transaction or instruction payload to the sandbox before verifying impact.
          </p>
          <textarea
            value={txPayload}
            onChange={(e) => setTxPayload(e.target.value)}
            disabled={isRunning || isSendingTx}
            className="mt-3 w-full h-32 resize-y rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm font-mono text-zinc-300 outline-none transition focus:border-[#14f195]/45 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSendTx}
            disabled={isRunning || isSendingTx}
            className="mt-3 rounded-xl border border-[#14f195]/20 bg-[#14f195]/10 px-4 py-2 text-sm font-medium text-[#8fffd0] transition hover:bg-[#14f195]/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSendingTx ? "Sending..." : "Send Transaction"}
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-[#9945ff]/20 bg-[#9945ff]/8 p-4">
          <p className="text-sm font-semibold text-[#c7a6ff]">Current attempt surface</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Submit a sandboxed transaction or proof action that attempts to demonstrate unauthorized protocol behavior.
          </p>
          <button
            type="button"
            onClick={onProveImpact}
            disabled={isRunning || isSendingTx}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9945ff] to-[#14f195] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {isRunning ? "Submitting proof" : "Submit exploit attempt"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">Attempt State</p>
        <div className="mt-5 space-y-4">
          <AttemptStep label="Hypothesis formed" active />
          <AttemptStep label="Proof submitted" active={hasAttempt} />
          <AttemptStep label="Impact verified by backend" active={session.status === "passed" || Boolean(session.labCompleted)} />
          <AttemptStep label="Report unlocked" active={Boolean(session.reportStatus)} />
        </div>
      </div>
    </div>
  );
}

function TransactionsLogsTab({
  results,
  session,
}: {
  results: ResearchLabTestResult[];
  session: ResearchLabSession;
}) {
  return (
    <div className="h-full overflow-auto p-5">
      <div className="rounded-2xl border border-white/10 bg-black/15 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">Transaction / Runtime Evidence</p>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Backend-controlled proof attempts, transaction results, and sandbox output are summarized here. Open the console drawer for raw runtime lines.
        </p>
      </div>
      <div className="mt-5 space-y-3">
        {results.length ? (
          results.map((result) => (
            <div key={result.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${result.passed ? "bg-[#14f195]/12 text-[#8fffd0]" : "bg-red-500/10 text-red-300"}`}>
                {result.passed ? <Check className="h-4 w-4" /> : "!"}
              </span>
              <span className="text-sm text-zinc-300">{result.label}</span>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5 text-sm text-zinc-500">
            No exploit attempt has been submitted yet.
          </div>
        )}
      </div>
      <pre className="mt-5 max-h-80 overflow-auto rounded-2xl border border-white/10 bg-black/25 p-4 font-mono text-xs leading-6 text-zinc-400">
        {session.terminalLines.length
          ? session.terminalLines.join("\n")
          : "Runtime output will appear after you submit an action or inspect transaction logs."}
      </pre>
    </div>
  );
}

function ReportTab(props: {
  report: ResearchLabReport | null;
  fields: ResearchLabReportFields;
  isSaving: boolean;
  isSubmitting: boolean;
  onChange: (fields: ResearchLabReportFields) => void;
  onSave: () => Promise<ResearchLabReport | null>;
  onSubmit: () => void;
}) {
  return (
    <div className="h-full overflow-auto p-5">
      <div className="mx-auto max-w-4xl">
        <ReportForm {...props} expanded />
      </div>
    </div>
  );
}

function LabContextPanel({
  activeFile,
  lab,
  phase,
  report,
  revealedHints,
  session,
  onOpenReport,
  onRevealHint,
  onProveImpact,
}: {
  activeFile: ResearchLabFile | null;
  lab: ResearchLabManifest;
  phase: LabPhase;
  report: ResearchLabReport | null;
  revealedHints: string[];
  session: ResearchLabSession;
  onOpenReport: () => void;
  onRevealHint: () => void;
  onProveImpact: () => void;
}) {
  const nextHint = lab.hints.find((hint) => !revealedHints.includes(hint.id));
  const verified = phase === "REPORT" || phase === "COMPLETED";

  return (
    <aside className="min-w-0 overflow-hidden rounded-[22px] border border-white/10 bg-[#111212]/85 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400">Context / Evidence</p>
      </div>
      <div className="h-[min(70vh,820px)] min-h-[620px] space-y-4 overflow-auto p-4">
        {verified ? (
          <div className="rounded-2xl border border-[#14f195]/25 bg-[#14f195]/8 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#8fffd0]">
              <Check className="h-4 w-4" />
              Impact Verified
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Your sandbox action demonstrated the protocol failure. You can now document the finding.
            </p>
            <button
              type="button"
              onClick={onOpenReport}
              className="mt-4 w-full rounded-xl border border-[#9945ff]/30 bg-[#9945ff]/12 px-4 py-2.5 text-sm font-semibold text-[#c7a6ff] transition hover:bg-[#9945ff]/18"
            >
              Open Finding Report
            </button>
          </div>
        ) : null}

        <ContextBlock title="Current Objective">
          <p className="text-sm leading-6 text-zinc-400">
            {phase === "PROVE_IMPACT"
              ? "Submit a controlled proof attempt and watch for backend-verified state evidence."
              : phase === "REPORT" || phase === "COMPLETED"
                ? "Document the vulnerability, impact, proof, and recommended remediation."
                : labShellCopy.objective}
          </p>
          {phase === "INSPECT" || phase === "BRIEFING" ? (
            <button
              type="button"
              onClick={onProveImpact}
              className="mt-4 w-full rounded-xl border border-[#14f195]/25 bg-[#14f195]/8 px-4 py-2.5 text-sm font-medium text-[#8fffd0] transition hover:bg-[#14f195]/12"
            >
              Move to proof attempt
            </button>
          ) : null}
        </ContextBlock>

        <ContextBlock title="Selected Evidence">
          <div className="space-y-3 text-sm">
            <EvidenceLine label="File" value={activeFile?.path ?? "No file selected"} />
            <EvidenceLine label="Session" value={abbreviate(session.sessionId)} />
            <EvidenceLine label="State" value={statusCopy(session.status)} />
            <EvidenceLine label="Report" value={report ? formatReportValue(report.status) : "Locked"} />
          </div>
        </ContextBlock>

        <ContextBlock title="Hints">
          <div className="space-y-4">
            {revealedHints.length ? (
              lab.hints
                .filter((hint) => revealedHints.includes(hint.id))
                .map((hint) => (
                  <div key={hint.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                    <p className="text-sm font-semibold text-[#8fffd0]">{hint.title}</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">{hint.body}</p>
                  </div>
                ))
            ) : (
              <p className="text-sm leading-6 text-zinc-500">Hints stay hidden until you ask for them.</p>
            )}
            <button
              type="button"
              onClick={onRevealHint}
              disabled={!nextHint}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {nextHint ? "Reveal Hint" : "All hints revealed"}
            </button>
          </div>
        </ContextBlock>
      </div>
    </aside>
  );
}

function RuntimeConsoleDrawer({
  isOpen,
  isRunning,
  lines,
  onToggle,
}: {
  isOpen: boolean;
  isRunning: boolean;
  lines: string[];
  onToggle: () => void;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-[20px] border border-white/10 bg-[#101112]/90 shadow-2xl shadow-black/25 backdrop-blur-xl">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
          <TerminalSquare className="h-4 w-4 text-[#14f195]" />
          Console / Runtime Output
        </span>
        <span className="flex items-center gap-3 text-xs text-zinc-500">
          {isRunning ? "Streaming" : isOpen ? "Collapse" : "Expand"}
          <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
        </span>
      </button>
      {isOpen ? (
        <div className="h-52 border-t border-white/10 p-4">
          <LabTerminal lines={lines.length ? lines : ["Runtime output will appear after you submit an action or inspect transaction logs."]} />
        </div>
      ) : null}
    </div>
  );
}

function LabTerminal({ lines }: { lines: string[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const linesRef = useRef(lines);
  const terminalRef = useRef<{
    clear: () => void;
    writeln: (line: string) => void;
    dispose: () => void;
  } | null>(null);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    async function bootTerminal() {
      if (!containerRef.current) return;
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
      if (disposed || !containerRef.current) return;

      const terminal = new Terminal({
        convertEol: true,
        cursorBlink: false,
        disableStdin: true,
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        lineHeight: 1.45,
        theme: {
          background: "#0c0d0e",
          foreground: "#d4d4d8",
          black: "#0a0a0a",
          blue: "#60a5fa",
          cyan: "#22d3ee",
          green: "#14f195",
          magenta: "#9945ff",
          red: "#fb7185",
          white: "#f4f4f5",
          yellow: "#f59e0b",
        },
      });
      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(containerRef.current);
      fitAddon.fit();
      terminalRef.current = terminal;
      linesRef.current.forEach((line) => terminal.writeln(line));
      terminal.writeln("$ ");

      resizeObserver = new ResizeObserver(() => fitAddon.fit());
      resizeObserver.observe(containerRef.current);
    }

    bootTerminal();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      terminalRef.current?.dispose();
      terminalRef.current = null;
    };
  }, []);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    terminal.clear();
    lines.forEach((line) => terminal.writeln(line));
    terminal.writeln("$ ");
  }, [lines]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden" />;
}

function ReportForm({
  report,
  fields,
  isSaving,
  isSubmitting,
  onChange,
  onSave,
  onSubmit,
  expanded = false,
}: {
  report: ResearchLabReport | null;
  fields: ResearchLabReportFields;
  isSaving: boolean;
  isSubmitting: boolean;
  onChange: (fields: ResearchLabReportFields) => void;
  onSave: () => Promise<ResearchLabReport | null>;
  onSubmit: () => void;
  expanded?: boolean;
}) {
  const status = report?.status ?? "locked";
  const isLocked = status === "locked";
  const isAccepted = status === "accepted";
  const isEditable = !isLocked && !isAccepted;
  const allowedValues = report?.allowedValues ?? {
    vulnerabilityCategory: ["missing_validation", "arithmetic_safety"],
    affectedArea: ["deposit_instruction", "vault_health_calculation"],
    severity: ["low", "medium", "high"],
  };

  if (isLocked) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <p className="text-sm font-semibold text-white">Report locked</p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          {report?.feedback ?? "Verify exploit impact before submitting a finding report."}
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-white/10 bg-black/15 p-5 ${expanded ? "" : "space-y-4"}`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">Finding Report</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">Document the verified protocol failure.</h2>
        {report?.feedback ? (
          <div className={`mt-4 rounded-xl border px-3 py-2 text-sm leading-6 ${status === "retry" ? "border-amber-300/25 bg-amber-300/8 text-amber-100" : "border-[#14f195]/20 bg-[#14f195]/8 text-[#8fffd0]"}`}>
            {report.feedback}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Explain what failed, why it matters, how you proved it, and what should change.
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <ReportSelect
          disabled={!isEditable}
          label="Category"
          value={fields.vulnerabilityCategory ?? ""}
          values={allowedValues.vulnerabilityCategory}
          onChange={(value) => onChange({ ...fields, vulnerabilityCategory: value || null })}
        />
        <ReportSelect
          disabled={!isEditable}
          label="Affected area"
          value={fields.affectedArea ?? ""}
          values={allowedValues.affectedArea}
          onChange={(value) => onChange({ ...fields, affectedArea: value || null })}
        />
        <ReportSelect
          disabled={!isEditable}
          label="Severity"
          value={fields.severity ?? ""}
          values={allowedValues.severity}
          onChange={(value) => onChange({ ...fields, severity: value || null })}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ReportTextarea disabled={!isEditable} label="Root cause" placeholder="Describe the broken trust or validation boundary." value={fields.rootCause} onChange={(value) => onChange({ ...fields, rootCause: value })} />
        <ReportTextarea disabled={!isEditable} label="Impact" placeholder="Describe what an attacker can cause or extract." value={fields.impact} onChange={(value) => onChange({ ...fields, impact: value })} />
        <ReportTextarea disabled={!isEditable} label="Proof" placeholder="Summarize the transaction/log/state evidence." value={fields.proof} onChange={(value) => onChange({ ...fields, proof: value })} />
        <ReportTextarea disabled={!isEditable} label="Recommended fix" placeholder="Describe the protocol-side remediation." value={fields.recommendedFix} onChange={(value) => onChange({ ...fields, recommendedFix: value })} />
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={!isEditable || isSaving || isSubmitting}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isSaving ? "Saving" : "Save Draft"}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!isEditable || !isReportComplete(fields) || isSaving || isSubmitting}
          className="rounded-xl border border-[#9945ff]/30 bg-[#9945ff]/12 px-4 py-2.5 text-sm font-semibold text-[#c7a6ff] transition hover:bg-[#9945ff]/18 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isSubmitting ? "Submitting" : "Submit Report"}
        </button>
      </div>
    </div>
  );
}

function ReportSelect({
  disabled,
  label,
  value,
  values,
  onChange,
}: {
  disabled: boolean;
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-zinc-200 outline-none transition focus:border-[#9945ff]/45 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">Select {label.toLowerCase()}</option>
        {values.map((item) => (
          <option key={item} value={item}>
            {formatReportValue(item)}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReportTextarea({
  disabled,
  label,
  placeholder,
  value,
  onChange,
}: {
  disabled: boolean;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600">{label}</span>
      <textarea
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm leading-6 text-zinc-200 outline-none transition placeholder:text-zinc-700 focus:border-[#9945ff]/45 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function ContextBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-600">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function EvidenceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-500">{label}</span>
      <span className="truncate text-right font-mono text-xs text-zinc-300">{value}</span>
    </div>
  );
}

function StateLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-500">{label}</span>
      <span className="truncate text-right font-mono text-xs text-zinc-300">{value}</span>
    </div>
  );
}

function AttemptStep({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${active ? "border-[#14f195]/35 bg-[#14f195]/12 text-[#8fffd0]" : "border-white/10 text-zinc-600"}`}>
        {active ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
      <span className={`text-sm ${active ? "text-zinc-300" : "text-zinc-600"}`}>{label}</span>
    </div>
  );
}

function InvestigationStepper({ phase }: { phase: LabPhase }) {
  const steps: Array<{ id: LabPhase; label: string }> = [
    { id: "BRIEFING", label: "Briefing" },
    { id: "INSPECT", label: "Inspect" },
    { id: "PROVE_IMPACT", label: "Prove Impact" },
    { id: "REPORT", label: "Report" },
  ];
  const currentIndex = phase === "COMPLETED" ? steps.length : steps.findIndex((step) => step.id === phase);

  return (
    <div className="self-end">
      <div className="grid grid-cols-4 items-center gap-3">
        {steps.map((step, index) => {
          const isComplete = phase === "COMPLETED" || index < currentIndex;
          const isActive = index === currentIndex;
          return (
            <div key={step.id} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs ${isComplete ? "border-[#14f195]/40 bg-[#14f195]/12 text-[#8fffd0]" : isActive ? "border-[#9945ff]/45 bg-[#9945ff]/12 text-[#c7a6ff]" : "border-white/10 bg-white/[0.04] text-zinc-600"}`}>
                {isComplete ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span className={`min-w-0 truncate text-xs ${isComplete || isActive ? "text-zinc-300" : "text-zinc-600"}`}>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhaseBadge({ phase }: { phase: LabPhase }) {
  return (
    <span className="rounded-full border border-[#9945ff]/30 bg-[#9945ff]/10 px-3 py-1 text-xs font-semibold text-[#c7a6ff]">
      Phase: {phaseLabel(phase)}
    </span>
  );
}

function SandboxStatusPill({ status }: { status: SandboxStatus }) {
  const live = status === "READY" || status === "RUNNING";
  return (
    <span className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${live ? "border-[#14f195]/20 bg-[#14f195]/10 text-[#8fffd0]" : "border-white/10 bg-white/[0.04] text-zinc-400"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-[#14f195]" : "bg-zinc-500"}`} />
      Sandbox {formatReportValue(status.toLowerCase())}
    </span>
  );
}

function Metric({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-center">
      <div className="mx-auto mb-2 h-4 w-4 text-zinc-500">{icon}</div>
      <p>{label}</p>
    </div>
  );
}

function deriveLabPhase(
  session: ResearchLabSession | null,
  report: ResearchLabReport | null,
  isRunning: boolean
): LabPhase {
  if (!session) return "BRIEFING";
  if (session.labCompleted || report?.status === "accepted") return "COMPLETED";
  if (report?.status === "draft" || report?.status === "retry" || session.reportStatus) return "REPORT";
  if (isRunning || session.status === "running_tests" || session.status === "failed") return "PROVE_IMPACT";
  if (session.status === "provisioning") return "BRIEFING";
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

function statusCopy(status: ResearchLabSession["status"]) {
  switch (status) {
    case "provisioning":
      return "Provisioning";
    case "active":
      return "Ready";
    case "dirty":
      return "Investigation updated";
    case "running_tests":
      return "Proof running";
    case "passed":
      return "Impact verified";
    case "failed":
      return "Proof failed";
    case "expired":
      return "Expired";
    case "destroyed":
      return "Destroyed";
    case "error":
      return "Runtime error";
  }
}

function phaseLabel(phase: LabPhase) {
  switch (phase) {
    case "BRIEFING":
      return "Briefing";
    case "INSPECT":
      return "Inspect";
    case "PROVE_IMPACT":
      return "Prove Impact";
    case "REPORT":
      return "Report";
    case "COMPLETED":
      return "Completed";
  }
}

function isReportComplete(fields: ResearchLabReportFields) {
  return Boolean(
    fields.vulnerabilityCategory &&
      fields.affectedArea &&
      fields.severity &&
      fields.rootCause.trim().length >= 24 &&
      fields.impact.trim().length >= 24 &&
      fields.proof.trim().length >= 16 &&
      fields.recommendedFix.trim().length >= 24
  );
}

function formatReportValue(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function abbreviate(value: string) {
  if (!value) return "Unavailable";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
