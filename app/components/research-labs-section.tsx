"use client";

import Image from "next/image";
import NumberFlow from "@number-flow/react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Play,
  ShieldCheck,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import {
  ensureBackendWalletAuth,
  type Level1AuthSession,
} from "../lib/levels/level1-backend";
import {
  gradeQuestionnaire,
  rl1FindingQuestionnaire,
  type QuestionnaireAnswer,
  type QuestionnaireQuestion,
  type QuestionnaireResult,
} from "../lib/research-labs/rl1-questionnaire";
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
  type ResearchLabFile,
  type ResearchLabManifest,
  type ResearchLabReport,
  type ResearchLabReportFields,
  type ResearchLabSession,
  type SandboxAccountSummary,
} from "../lib/research-labs/lab-state";
import { useWallet } from "../lib/wallet/context";
import { ResearchLabCatalog } from "./research-labs/catalog";
import {
  LabScenarioBriefing,
  ResearchLabSessionHeader,
} from "./research-labs/lab-shell";
import { InspectTab } from "./research-labs/inspect-tab";
import { RuntimeConsoleDrawer } from "./research-labs/runtime-console";
import {
  AnimatedContentSwitch,
  EXECUTE_EXPLOIT_VIEW_TRANSITION_ORDER,
  RESEARCH_LAB_TAB_TRANSITION_ORDER,
  WorkspaceTabs,
} from "./research-labs/workspace-tabs";
import type {
  AccountEvidence,
  AuditReportPreview,
  AuditReportStage,
  EnrichedTransactionResult,
  ExecuteExploitView,
  LabPhase,
  ReportMetaFields,
  ReviewMode,
  SandboxStatus,
  WorkspaceTab,
} from "./research-labs/types";

// Research lab motion storyboard:
//   000ms old section fades down/out while new section slides up/in
//   180ms previous section unmounts; new section owns the surface

const OFFICIAL_COLLATERAL_ACCOUNT_REF = "official_collateral_account";
const ATTACKER_COLLATERAL_ACCOUNT_REF = "attacker_collateral_account";
const OFFICIAL_VAULT_ACCOUNT_REF = "official_vault_account";
const COUNTERFEIT_VAULT_ACCOUNT_REF = "counterfeit_vault_account";

const NEUTRAL_LABELS: Record<string, string> = {
  [OFFICIAL_COLLATERAL_ACCOUNT_REF]: "Official USDC Source",
  [ATTACKER_COLLATERAL_ACCOUNT_REF]: "Injected IJC Source",
  [OFFICIAL_VAULT_ACCOUNT_REF]: "Protocol USDC Vault",
  [COUNTERFEIT_VAULT_ACCOUNT_REF]: "Attacker-Controlled Vault",
};

const emptyReportFields: ResearchLabReportFields = {
  vulnerabilityCategory: null,
  affectedArea: null,
  rootCause: "",
  impact: "",
  proof: "",
  recommendedFix: "",
  severity: null,
};

const defaultReportMetaFields: ReportMetaFields = {
  title: "",
  likelihood: "",
};

const suggestedReportMetaFields: ReportMetaFields = {
  title:
    "Unchecked Vault Health Arithmetic Allows Collateral Distortion",
  likelihood: "medium_high",
};

const suggestedReportText = {
  rootCause:
    "The vault health calculation performs unsafe arithmetic before scaling and comparison, allowing overflow or distorted collateral values before the protocol evaluates health.",
  impact:
    "An attacker can distort collateral value and health factor calculations, making an unhealthy or manipulated position appear acceptable to the protocol.",
  proof:
    "The sandbox evidence shows the vulnerable health calculation boundary and passes after the unsafe arithmetic path is replaced with checked arithmetic.",
  recommendedFix:
    "Use checked arithmetic before the health comparison and fail safely when multiplication, division, or scaling would overflow or produce invalid collateral values.",
};

const reportTitleOptions = [
  suggestedReportMetaFields.title,
  "Arithmetic Safety Failure in Vault Health Calculation",
  "Vault Mirage Health Factor Can Be Distorted Before Validation",
];

const reportRootCauseOptions = [
  suggestedReportText.rootCause,
  "The protocol calculates vault health with unchecked multiplication or division, so invalid intermediate values can affect the final health comparison.",
  "The health factor path trusts arithmetic output before proving that scaling and bounds checks completed safely.",
];

const reportImpactOptions = [
  suggestedReportText.impact,
  "A manipulated health factor can make collateral appear safer than it is, weakening liquidation and solvency assumptions.",
  "Distorted collateral accounting can let protocol state accept an invalid vault health result as if it were healthy.",
];

const reportProofOptions = [
  suggestedReportText.proof,
  "The passing lab evidence demonstrates that replacing unsafe arithmetic with checked operations prevents the distorted health calculation.",
  "The verification path confirms that the issue is the arithmetic trust boundary, not transaction success alone.",
];

const reportFixOptions = [
  suggestedReportText.recommendedFix,
  "Replace unchecked arithmetic with checked_mul, checked_div, and checked_add style operations before using the value in health decisions.",
  "Reject the instruction when the vault health calculation cannot be completed safely within expected numeric bounds.",
];

const labShellCopy = {
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

function isRequiredQuestion(question: QuestionnaireQuestion) {
  return question.type !== "free_text_optional";
}

function getAnswerForQuestion(
  answers: QuestionnaireAnswer[],
  questionId: string
) {
  return answers.find((answer) => answer.questionId === questionId);
}

function isQuestionAnswered(
  question: QuestionnaireQuestion,
  answer: QuestionnaireAnswer | undefined
) {
  if (!isRequiredQuestion(question)) return true;
  if (!answer) return false;

  if (question.type === "single_choice" && "selectedOptionId" in answer) {
    return Boolean(answer.selectedOptionId);
  }

  if (question.type === "multi_select" && "selectedOptionIds" in answer) {
    return answer.selectedOptionIds.length > 0;
  }

  return false;
}

function getIncorrectRequiredQuestionIds(result: QuestionnaireResult) {
  const questionMap = new Map(
    rl1FindingQuestionnaire.questions.map((question) => [question.id, question])
  );

  return result.results
    .filter((item) => {
      const question = questionMap.get(item.questionId);
      return question && isRequiredQuestion(question) && !item.correct;
    })
    .map((item) => item.questionId);
}

function getReviewQuestions(mode: ReviewMode, retryQuestionIds: string[]) {
  if (mode === "retry" && retryQuestionIds.length) {
    const retrySet = new Set(retryQuestionIds);
    return rl1FindingQuestionnaire.questions.filter((question) =>
      retrySet.has(question.id)
    );
  }

  return rl1FindingQuestionnaire.questions;
}

function getFeedbackTopics(questionIds: string[]) {
  const topicBySection: Record<string, string> = {
    "Vulnerability Identification":
      "Recheck which account relationship the protocol trusted and which Solana account-security concept applies.",
    "Exploit Path Understanding":
      "Rebuild the exploit chain from counterfeit deposit to illegitimate credit and real treasury withdrawal.",
    "State and Evidence":
      "Focus on state evidence, canonical account binding, and why a successful transaction log is not enough.",
    "Severity and Report Reasoning":
      "Tie severity and likelihood to the attacker-controlled account relationship and unauthorized treasury movement.",
  };

  const sections = new Set(
    questionIds
      .map(
        (id) =>
          rl1FindingQuestionnaire.questions.find((question) => question.id === id)
            ?.section
      )
      .filter((section): section is string => Boolean(section))
  );

  return Array.from(sections).map(
    (section) => topicBySection[section] ?? `Review ${section}.`
  );
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
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<QuestionnaireAnswer[]>([]);
  const [questionnaireResult, setQuestionnaireResult] = useState<QuestionnaireResult | null>(null);
  const [reviewStarted, setReviewStarted] = useState(false);
  const [reviewMode, setReviewMode] = useState<ReviewMode>("full");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [retryQuestionIds, setRetryQuestionIds] = useState<string[]>([]);
  const [reviewAttempts, setReviewAttempts] = useState(0);
  const [reportOpened, setReportOpened] = useState(false);

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
  const visibleReviewQuestions = useMemo(
    () => getReviewQuestions(reviewMode, retryQuestionIds),
    [reviewMode, retryQuestionIds]
  );
  const reviewStepTotal = visibleReviewQuestions.length + 1;
  const reviewStepCurrent = reviewStarted
    ? Math.min(reviewIndex + 1, reviewStepTotal)
    : 0;
  const criticalQuestions = rl1FindingQuestionnaire.questions.filter(
    (question) => question.critical
  );
  const criticalAnsweredCount = criticalQuestions.filter((question) =>
    isQuestionAnswered(
      question,
      getAnswerForQuestion(questionnaireAnswers, question.id)
    )
  ).length;
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

  const resetFindingReview = () => {
    setQuestionnaireAnswers([]);
    setQuestionnaireResult(null);
    setReviewStarted(false);
    setReviewMode("full");
    setReviewIndex(0);
    setRetryQuestionIds([]);
    setReviewAttempts(0);
    setReportOpened(false);
    setAuditReportStage("BUILDER");
  };

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

  const updateQuestionnaireAnswer = (answer: QuestionnaireAnswer) => {
    setQuestionnaireResult(null);
    setReportOpened(false);
    setQuestionnaireAnswers((current) => [
      ...current.filter((item) => item.questionId !== answer.questionId),
      answer,
    ]);
  };

  const startFindingReview = () => {
    if (reviewStarted && !questionnaireResult) {
      setActiveTab("report");
      return;
    }

    setReviewStarted(true);
    setReportOpened(false);
    setActiveTab("report");

    if (questionnaireResult && !questionnaireResult.passed) {
      const nextRetryIds = retryQuestionIds.length
        ? retryQuestionIds
        : getIncorrectRequiredQuestionIds(questionnaireResult);
      setRetryQuestionIds(nextRetryIds);
      setReviewMode("retry");
    } else {
      setReviewMode("full");
    }

    setReviewIndex(0);
    if (!questionnaireResult?.passed) {
      setQuestionnaireResult(null);
    }
  };

  const openFindingReport = () => {
    setReportOpened(true);
    setActiveTab("report");
  };

  const submitQuestionnaire = () => {
    const unansweredQuestions = visibleReviewQuestions.filter(
      (question) =>
        isRequiredQuestion(question) &&
        !isQuestionAnswered(
          question,
          getAnswerForQuestion(questionnaireAnswers, question.id)
        )
    );

    if (unansweredQuestions.length) {
      toast.error("Answer all required review questions before submitting.");
      return;
    }

    const result = gradeQuestionnaire(
      rl1FindingQuestionnaire,
      questionnaireAnswers
    );
    const incorrectIds = getIncorrectRequiredQuestionIds(result);

    setQuestionnaireResult(result);
    setRetryQuestionIds(incorrectIds);
    setReviewAttempts((attempts) => attempts + 1);

    if (result.passed) {
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
      setReviewMode("full");
      setReviewIndex(0);
      setReportOpened(false);
      toast.success("Finding review passed. Final report unlocked.");
      return;
    }

    setReviewMode("retry");
    setReviewIndex(0);
    setReportOpened(false);
    toast.error("Finding review needs revision", {
      description: "Retry only the missed required questions.",
    });
  };

  const retryQuestionnaire = () => {
    if (questionnaireResult && !retryQuestionIds.length) {
      setRetryQuestionIds(getIncorrectRequiredQuestionIds(questionnaireResult));
    }
    setReviewStarted(true);
    setReviewMode("retry");
    setReviewIndex(0);
    setReportOpened(false);
    setQuestionnaireResult(null);
    setActiveTab("report");
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
            criticalTotal={criticalQuestions.length}
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

function ResearchLabWorkspace({
  activeFile,
  activeFileContent,
  activeTab,
  accounts,
  auditReportStage,
  availableTabs,
  evidenceAccounts,
  executeExploitView,
  impactVerified,
  findingReviewPassed,
  files,
  isRunning,
  questionnaireAnswers,
  questionnaireResult,
  reportOpened,
  retryQuestionIds,
  reviewAttempts,
  reviewIndex,
  reviewMode,
  reviewStarted,
  report,
  reportFields,
  reportMetaFields,
  txResults,
  onChangeExecuteExploitView,
  onChangeReportFields,
  onChangeReportMetaFields,
  onChangeAuditReportStage,
  onProveImpact,
  onExecuteTransaction,
  onQuestionnaireAnswer,
  onQuestionnaireRetry,
  onQuestionnaireSubmit,
  onOpenFindingReport,
  onReviewIndexChange,
  onReviewStart,
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
  auditReportStage: AuditReportStage;
  availableTabs: WorkspaceTab[];
  evidenceAccounts: SandboxAccountSummary[];
  executeExploitView: ExecuteExploitView;
  impactVerified: boolean;
  findingReviewPassed: boolean;
  files: ResearchLabFile[];
  isRunning: boolean;
  questionnaireAnswers: QuestionnaireAnswer[];
  questionnaireResult: QuestionnaireResult | null;
  reportOpened: boolean;
  retryQuestionIds: string[];
  reviewAttempts: number;
  reviewIndex: number;
  reviewMode: ReviewMode;
  reviewStarted: boolean;
  report: ResearchLabReport | null;
  reportFields: ResearchLabReportFields;
  reportMetaFields: ReportMetaFields;
  txResults: EnrichedTransactionResult[];
  onChangeExecuteExploitView: (view: ExecuteExploitView) => void;
  onChangeReportFields: (fields: ResearchLabReportFields) => void;
  onChangeReportMetaFields: (fields: ReportMetaFields) => void;
  onChangeAuditReportStage: (stage: AuditReportStage) => void;
  onProveImpact: () => void;
  onExecuteTransaction: (payload: LabTransactionPayload) => Promise<void>;
  onQuestionnaireAnswer: (answer: QuestionnaireAnswer) => void;
  onQuestionnaireRetry: () => void;
  onQuestionnaireSubmit: () => void;
  onOpenFindingReport: () => void;
  onReviewIndexChange: (index: number) => void;
  onReviewStart: () => void;
  onSaveReport: () => Promise<ResearchLabReport | null>;
  onSelectFile: (path: string) => void;
  onSubmitReport: () => void;
  onTabChange: (tab: WorkspaceTab) => void;
  isReportSaving: boolean;
  isReportSubmitting: boolean;
}) {
  useEffect(() => {
    if (activeTab === "verify") {
      onChangeExecuteExploitView("EVIDENCE_REVIEW");
    }
  }, [activeTab, onChangeExecuteExploitView]);

  const activeTabContent =
    activeTab === "inspect" ? (
      <InspectTab
        accounts={accounts}
        activeFile={activeFile}
        activeFileContent={activeFileContent}
        files={files}
        onSelectFile={onSelectFile}
      />
    ) : activeTab === "exploit" || activeTab === "verify" ? (
      <ExploitTab
        activeView={executeExploitView}
        evidenceAccounts={evidenceAccounts}
        impactVerified={impactVerified}
        isRunning={isRunning}
        txResults={txResults}
        onChangeView={onChangeExecuteExploitView}
        onContinueFinding={() => onTabChange("report")}
        onExecuteTransaction={onExecuteTransaction}
        onOpenEvidenceReview={() => onChangeExecuteExploitView("EVIDENCE_REVIEW")}
        onProveImpact={onProveImpact}
      />
    ) : (
      <ReportTab
        fields={reportFields}
        findingReviewPassed={findingReviewPassed}
        impactVerified={impactVerified}
        isSaving={isReportSaving}
        isSubmitting={isReportSubmitting}
        auditReportStage={auditReportStage}
        questionnaireAnswers={questionnaireAnswers}
        questionnaireResult={questionnaireResult}
        reportOpened={reportOpened}
        retryQuestionIds={retryQuestionIds}
        reviewAttempts={reviewAttempts}
        reviewIndex={reviewIndex}
        reviewMode={reviewMode}
        reviewStarted={reviewStarted}
        report={report}
        reportMetaFields={reportMetaFields}
        onChange={onChangeReportFields}
        onChangeMeta={onChangeReportMetaFields}
        onChangeAuditReportStage={onChangeAuditReportStage}
        onQuestionnaireAnswer={onQuestionnaireAnswer}
        onQuestionnaireRetry={onQuestionnaireRetry}
        onQuestionnaireSubmit={onQuestionnaireSubmit}
        onOpenFindingReport={onOpenFindingReport}
        onReviewIndexChange={onReviewIndexChange}
        onReviewStart={onReviewStart}
        onSave={onSaveReport}
        onSubmit={onSubmitReport}
      />
    );

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#111212]/85 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <WorkspaceTabs activeTab={activeTab} availableTabs={availableTabs} onTabChange={onTabChange} />
      <div className="min-h-0 flex-1 overflow-hidden">
        <AnimatedContentSwitch
          transitionKey={activeTab}
          transitionOrder={RESEARCH_LAB_TAB_TRANSITION_ORDER}
        >
          {activeTabContent}
        </AnimatedContentSwitch>
      </div>
    </div>
  );
}

function ExploitTab({
  activeView,
  evidenceAccounts,
  impactVerified,
  isRunning,
  txResults,
  onChangeView,
  onContinueFinding,
  onExecuteTransaction,
  onOpenEvidenceReview,
  onProveImpact,
}: {
  activeView: ExecuteExploitView;
  evidenceAccounts: SandboxAccountSummary[];
  impactVerified: boolean;
  isRunning: boolean;
  txResults: EnrichedTransactionResult[];
  onChangeView: (view: ExecuteExploitView) => void;
  onContinueFinding: () => void;
  onExecuteTransaction: (payload: LabTransactionPayload) => Promise<void>;
  onOpenEvidenceReview: () => void;
  onProveImpact: () => void;
}) {
  const [collateralSource, setCollateralSource] = useState("");
  const [vaultDestination, setVaultDestination] = useState("");
  const [amount, setAmount] = useState("50000");
  const [isSendingTx, setIsSendingTx] = useState(false);

  const successfulDeposits = txResults.filter(
    (r) => r.instructionType.includes("DEPOSIT") && r.executionStatus === "success"
  );
  const hasSuccessfulRegularDeposit = successfulDeposits.some(
    (result) => getDepositPathKind(result) === "regular"
  );
  const hasSuccessfulExploitDeposit = successfulDeposits.some(
    (result) => getDepositPathKind(result) === "exploit"
  );
  const hasSuccessfulWithdrawal = txResults.some(
    (r) => r.instructionType.includes("WITHDRAW") && r.executionStatus === "success"
  );
  const parsedAmount = parseInt(amount, 10);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;
  const selectedDepositPathKind = getDepositPathKindFromRefs(collateralSource, vaultDestination);
  const selectedPathAlreadyDeposited =
    (selectedDepositPathKind === "regular" && hasSuccessfulRegularDeposit) ||
    (selectedDepositPathKind === "exploit" && hasSuccessfulExploitDeposit);
  const canDeposit =
    Boolean(collateralSource && vaultDestination && isValidAmount) &&
    !selectedPathAlreadyDeposited &&
    !isRunning &&
    !isSendingTx;
  const canWithdraw =
    isValidAmount &&
    hasSuccessfulExploitDeposit &&
    !hasSuccessfulWithdrawal &&
    !isRunning &&
    !isSendingTx;

  const collateralOptions = [
    { ref: OFFICIAL_COLLATERAL_ACCOUNT_REF, label: "Official USDC Source" },
    { ref: ATTACKER_COLLATERAL_ACCOUNT_REF, label: "Injected IJC Source" },
  ];

  const vaultOptions = [
    { ref: OFFICIAL_VAULT_ACCOUNT_REF, label: "Protocol USDC Vault" },
    { ref: COUNTERFEIT_VAULT_ACCOUNT_REF, label: "Attacker-Controlled Vault" },
  ];

  const handleDepositCollateral = async () => {
    if (!collateralSource || !vaultDestination || !isValidAmount) return;
    setIsSendingTx(true);
    try {
      await onExecuteTransaction({
        action_type: "DEPOSIT_COLLATERAL",
        amount: parsedAmount,
        collateral_account_ref: collateralSource,
        vault_account_ref: vaultDestination,
      });
    } finally {
      setIsSendingTx(false);
    }
  };

  const handleWithdraw = async () => {
    if (!isValidAmount) return;
    setIsSendingTx(true);
    try {
      await onExecuteTransaction({
        action_type: "WITHDRAW_AGAINST_CREDIT",
        amount: parsedAmount,
      });
    } finally {
      setIsSendingTx(false);
    }
  };

  const latestAction = txResults.find((result) => result.executionStatus === "success");

  const hypothesisView = (
    <>
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white">
          Test whether caller-supplied accounts can create unauthorized borrow credit.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
          Submit controlled deposit and borrow actions, then review the resulting SVM evidence before verifying impact.
        </p>

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px] 2xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-zinc-300">Sandbox Action</p>
                <p className="mt-2 text-xs leading-6 text-zinc-500">
                  Select the accounts for a controlled deposit, then observe how the protocol surface reacts.
                </p>
              </div>
              <span className="rounded-full border border-[#9945ff]/25 bg-[#9945ff]/10 px-2.5 py-1 text-[11px] text-[#c7a6ff]">
                Exploit builder
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SandboxSelect
                label="Token"
                value={collateralSource}
                options={collateralOptions}
                placeholder="Select token account"
                onChange={setCollateralSource}
                disabled={isRunning || isSendingTx}
              />
              <SandboxSelect
                label="Vault"
                value={vaultDestination}
                options={vaultOptions}
                placeholder="Select vault"
                onChange={setVaultDestination}
                disabled={isRunning || isSendingTx}
              />
            </div>

            <div className="mt-4 space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="block w-full sm:max-w-[180px]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600">Amount</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isRunning || isSendingTx}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm font-mono text-zinc-200 outline-none transition focus:border-[#14f195]/45 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleDepositCollateral}
                  disabled={!canDeposit}
                  className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[#14f195]/20 bg-[#14f195]/10 px-5 py-2.5 text-sm font-medium text-[#8fffd0] transition hover:bg-[#14f195]/15 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-zinc-500 disabled:opacity-70 sm:w-auto"
                >
                  {isSendingTx
                    ? "Processing..."
                    : selectedPathAlreadyDeposited
                      ? "Deposited"
                      : "Deposit"}
                </button>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600">
                      Latest Actions
                    </p>
                    <p className="mt-1 text-xs leading-5 text-zinc-400">
                      {latestAction
                        ? getObservedTransactionSummary(latestAction)
                        : "No sandbox actions submitted yet."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onOpenEvidenceReview}
                    disabled={txResults.length === 0}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 self-start rounded-lg border border-[#9945ff]/25 bg-[#9945ff]/10 px-4 text-xs font-medium text-[#c7a6ff] transition hover:bg-[#9945ff]/15 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] disabled:cursor-not-allowed disabled:opacity-45 lg:w-auto"
                  >
                    Review Evidence
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <ProtocolBorrowMock
            canBorrow={canWithdraw}
            depositMode={
              hasSuccessfulExploitDeposit
                ? "exploit"
                : hasSuccessfulRegularDeposit
                  ? "regular"
                  : "none"
            }
            hasSuccessfulWithdraw={hasSuccessfulWithdrawal}
            isBorrowing={isSendingTx && hasSuccessfulExploitDeposit}
            onBorrow={handleWithdraw}
          />
        </div>

    </>
  );

  return (
    <div className="h-full overflow-auto p-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">
            Execute Exploit
          </p>
          <div className="inline-flex rounded-xl border border-white/10 bg-black/20 p-1">
            {[
              { id: "HYPOTHESIS" as const, label: "Exploit Hypothesis" },
              { id: "EVIDENCE_REVIEW" as const, label: "Evidence Review" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeView(item.id)}
                className={`min-h-9 rounded-lg px-3 text-sm transition focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] ${
                  activeView === item.id
                    ? "bg-[#9945ff]/18 text-[#d7c0ff]"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <AnimatedContentSwitch
          transitionKey={activeView}
          transitionOrder={EXECUTE_EXPLOIT_VIEW_TRANSITION_ORDER}
        >
          {activeView === "HYPOTHESIS" ? (
            <div className="h-full min-h-0">{hypothesisView}</div>
          ) : (
            <VerifyImpactTab
              evidenceAccounts={evidenceAccounts}
              impactVerified={impactVerified}
              isRunning={isRunning}
              txResults={txResults}
              onContinueFinding={onContinueFinding}
              onProveImpact={onProveImpact}
            />
          )}
        </AnimatedContentSwitch>
      </div>
    </div>
  );
}

function SandboxSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: Array<{ ref: string; label: string }>;
  placeholder: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-zinc-200 outline-none transition focus:border-[#14f195]/45 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.ref} value={opt.ref}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProtocolBorrowMock({
  canBorrow,
  depositMode,
  hasSuccessfulWithdraw,
  isBorrowing,
  onBorrow,
}: {
  canBorrow: boolean;
  depositMode: "none" | "regular" | "exploit";
  hasSuccessfulWithdraw: boolean;
  isBorrowing: boolean;
  onBorrow: () => void;
}) {
  const protocolCollateral = 50000;
  const hasRegularDeposit = depositMode === "regular";
  const hasExploitDeposit = depositMode === "exploit";
  const hasAnyDeposit = hasRegularDeposit || hasExploitDeposit;
  const positionCredit = hasAnyDeposit ? protocolCollateral : 0;
  const borrowPreview = Math.floor(protocolCollateral * 0.72);
  const poolLiquidityBefore = 100000;
  const projectedPoolLiquidity = Math.max(poolLiquidityBefore - borrowPreview, 0);
  const regularDepositPoolLiquidity = poolLiquidityBefore + protocolCollateral;
  const poolLiquidity = hasSuccessfulWithdraw
    ? projectedPoolLiquidity
    : hasRegularDeposit
      ? regularDepositPoolLiquidity
      : poolLiquidityBefore;
  const healthValue = hasSuccessfulWithdraw ? 50 : positionCredit ? 100 : 0;
  const availableCollateral = hasSuccessfulWithdraw ? 0 : positionCredit;
  const collateralDisplay = availableCollateral;
  const totalBorrowed = hasSuccessfulWithdraw ? borrowPreview : 0;
  const healthDotsActive = hasSuccessfulWithdraw ? 5 : positionCredit ? 10 : 0;
  const healthTone = hasSuccessfulWithdraw ? "warning" : positionCredit ? "success" : "neutral";
  const borrowButtonLabel = isBorrowing
    ? "Processing..."
    : hasSuccessfulWithdraw
      ? "Borrowed"
      : hasExploitDeposit
        ? "Borrow"
        : hasRegularDeposit
          ? "Borrow Locked"
        : "Insufficient Funds";

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#07080d] shadow-2xl shadow-black/40">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(153,69,255,0.24),transparent_36%),radial-gradient(circle_at_85%_18%,rgba(20,241,149,0.12),transparent_28%)]" />
      <div className="relative border-b border-white/10 bg-white/[0.035] px-4 py-3">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-white/10" />
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                SolBreach Lend
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">
                USDC Borrow Market
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative space-y-4 p-4">
        <div className="rounded-2xl border border-white/10 bg-[#121318] p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
                <Image
                  src="/usdc.png"
                  alt="USDC"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full"
                />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-[-0.03em] text-white">
                  USDC
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl font-semibold text-white">
                {collateralDisplay.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                $50,000.00
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <ProtocolMetricRow
            label="Health"
            value={
              <AnimatedProtocolNumber
                decimals={2}
                suffix="%"
                value={healthValue}
              />
            }
            tone={healthTone}
          >
            <div className="ml-3 flex flex-1 items-center gap-1 overflow-hidden">
              {Array.from({ length: 10 }).map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    index < healthDotsActive
                      ? hasSuccessfulWithdraw
                        ? "bg-[#fcd34d]"
                        : "bg-[#14f195]"
                      : "bg-zinc-700"
                  }`}
                />
              ))}
            </div>
          </ProtocolMetricRow>
          <ProtocolMetricRow
            label="Pool Yield"
            value="-5.70%"
            tone="warning"
          />
          <ProtocolMetricRow
            label="Real USDC pool"
            value={
              <AnimatedProtocolNumber
                decimals={0}
                suffix=" USDC"
                value={poolLiquidity}
              />
            }
            tone={hasSuccessfulWithdraw ? "warning" : "neutral"}
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Info
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Amount exceeds your max USDC. Displaying hypothetical stats only. Reduce the amount to execute.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onBorrow}
          disabled={!canBorrow || hasSuccessfulWithdraw}
          className={`w-full rounded-xl px-4 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] transition ${
            hasExploitDeposit
              ? "bg-zinc-200 text-black hover:bg-white"
              : "bg-white/[0.08] text-zinc-500"
          } focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080d] disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {borrowButtonLabel}
        </button>

        <div className="space-y-3 px-1 pb-1">
          <ProtocolDeltaRow
            label="Total borrowed"
            value={totalBorrowed}
            suffix=" USDC"
            active={hasSuccessfulWithdraw}
            tone={hasSuccessfulWithdraw ? "warning" : "neutral"}
          />
          <ProtocolDeltaRow
            label="Health"
            value={healthValue}
            suffix="%"
            decimals={2}
            active={hasAnyDeposit}
            tone={hasSuccessfulWithdraw ? "warning" : positionCredit ? "success" : "neutral"}
          />
          <ProtocolDeltaRow
            label="Available collateral"
            value={availableCollateral}
            prefix="$"
            active={hasAnyDeposit}
            tone={hasSuccessfulWithdraw ? "warning" : positionCredit ? "success" : "neutral"}
          />
          <ProtocolDeltaRow
            label="Pool liquidity"
            value={poolLiquidity}
            suffix=" USDC"
            active={hasAnyDeposit || hasSuccessfulWithdraw}
            tone={hasSuccessfulWithdraw ? "warning" : hasRegularDeposit ? "success" : "neutral"}
          />
        </div>
      </div>
    </div>
  );
}

function ProtocolMetricRow({
  children,
  label,
  tone = "neutral",
  value,
}: {
  children?: ReactNode;
  label: string;
  tone?: "neutral" | "success" | "warning";
  value: ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "text-[#8fffd0]"
      : tone === "warning"
        ? "text-[#fcd34d]"
        : "text-zinc-300";

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#121318] px-3 py-3 text-sm">
      <div className="flex min-w-0 flex-1 items-center gap-2 text-zinc-500">
        <span className="h-1 w-1 rounded-full bg-zinc-600" />
        <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
        {children}
      </div>
      <span className={`shrink-0 font-mono font-semibold ${toneClass}`}>
        {value}
      </span>
    </div>
  );
}

function ProtocolDeltaRow({
  active,
  decimals = 0,
  label,
  prefix,
  suffix,
  tone = "neutral",
  value,
}: {
  active: boolean;
  decimals?: number;
  label: string;
  prefix?: string;
  suffix?: string;
  tone?: "neutral" | "success" | "warning";
  value: number;
}) {
  const valueClass =
    active && tone === "warning"
      ? "text-[#fcd34d]"
      : active && tone === "success"
        ? "text-[#8fffd0]"
      : active
        ? "text-white"
        : "text-zinc-500";

  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="font-semibold uppercase tracking-[0.16em] text-zinc-600">
        {label}
      </span>
      <AnimatedProtocolNumber
        className={`font-mono ${valueClass}`}
        decimals={decimals}
        prefix={prefix}
        suffix={suffix}
        value={value}
      />
    </div>
  );
}

function AnimatedProtocolNumber({
  className = "font-mono",
  decimals = 0,
  prefix,
  suffix,
  value,
}: {
  className?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  value: number;
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      {prefix ? <span className={className}>{prefix}</span> : null}
      <NumberFlow
        value={value}
        format={{
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }}
        className={className}
      />
      {suffix ? <span className={className}>{suffix}</span> : null}
    </span>
  );
}

function getObservedTransactionSummary(result: EnrichedTransactionResult) {
  if (result.instructionType.includes("DEPOSIT")) {
    if (result.executionStatus !== "success") {
      return "Deposit failed · No position change recorded";
    }

    const depositPathKind = getDepositPathKind(result);

    if (depositPathKind === "regular") {
      return "Regular deposit executed · Pool liquidity increased";
    }

    if (depositPathKind === "exploit") {
      return "Deposit executed · Position credit changed";
    }

    return "Deposit executed · Non-canonical path observed";
  }

  return result.executionStatus === "success"
    ? "Borrow action executed · Treasury balance changed"
    : "Borrow action failed · Treasury balance unchanged";
}

function getDepositPathKind(result: EnrichedTransactionResult) {
  return getDepositPathKindFromRefs(
    result.inputs.collateralSourceRef ?? "",
    result.inputs.vaultDestinationRef ?? ""
  );
}

function getDepositPathKindFromRefs(collateralSourceRef: string, vaultDestinationRef: string) {
  if (
    collateralSourceRef === OFFICIAL_COLLATERAL_ACCOUNT_REF &&
    vaultDestinationRef === OFFICIAL_VAULT_ACCOUNT_REF
  ) {
    return "regular";
  }

  if (
    collateralSourceRef === ATTACKER_COLLATERAL_ACCOUNT_REF &&
    vaultDestinationRef === COUNTERFEIT_VAULT_ACCOUNT_REF
  ) {
    return "exploit";
  }

  return "mixed";
}

function VerifyImpactTab({
  evidenceAccounts,
  impactVerified,
  isRunning,
  txResults,
  onContinueFinding,
  onProveImpact,
}: {
  evidenceAccounts: SandboxAccountSummary[];
  impactVerified: boolean;
  isRunning: boolean;
  txResults: EnrichedTransactionResult[];
  onContinueFinding: () => void;
  onProveImpact: () => void;
}) {
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const hasSuccessfulDeposit = txResults.some(
    (result) =>
      result.instructionType.includes("DEPOSIT") &&
      result.executionStatus === "success"
  );
  const hasSuccessfulWithdrawal = txResults.some(
    (result) =>
      result.instructionType.includes("WITHDRAW") &&
      result.executionStatus === "success"
  );
  const orderedTransactions = [...txResults].reverse();

  return (
    <div className="h-full overflow-auto p-5">
      <div className="min-w-0">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
          Prove what changed.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
          Review transaction execution, account deltas, and runtime logs before
          asking the backend to verify impact.
        </p>

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <EvidenceSection title="Transaction Timeline">
              {orderedTransactions.length ? (
                <div className="space-y-3">
                  {orderedTransactions.map((result, index) => {
                    const txKey = result.transactionRef || result.transaction_ref || `tx-${index}`;
                    const isExpanded = expandedTx === txKey;
                    const isSuccess = result.executionStatus === "success";

                    return (
                      <div
                        key={txKey}
                        className={`rounded-xl border ${
                          isSuccess
                            ? "border-[#14f195]/18 bg-[#14f195]/7"
                            : "border-red-400/20 bg-red-500/8"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 p-4">
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-semibold ${isSuccess ? "text-zinc-200" : "text-red-200"}`}>
                              {getObservedTransactionSummary(result)}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                              <span>Amount: {result.inputs.amount.toLocaleString()}</span>
                              {result.inputs.collateralSourceLabel || result.inputs.vaultDestinationLabel ? (
                                <span className="truncate">
                                  {[result.inputs.collateralSourceLabel, result.inputs.vaultDestinationLabel]
                                    .filter(Boolean)
                                    .join(" -> ")}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          {result.logs?.length ? (
                            <button
                              type="button"
                              onClick={() => setExpandedTx(isExpanded ? null : txKey)}
                              className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
                              aria-label={isExpanded ? "Collapse transaction logs" : "Expand transaction logs"}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          ) : null}
                        </div>
                        {isExpanded && result.logs?.length ? (
                          <div className="border-t border-white/10 bg-black/25 px-4 py-3">
                            <pre className="max-h-56 overflow-auto font-mono text-[11px] leading-5 text-zinc-400">
                              {result.logs.join("\n")}
                            </pre>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm leading-6 text-zinc-500">
                  Execute the deposit and borrow actions first. Transaction
                  evidence appears here after the sandbox returns results.
                </p>
              )}
            </EvidenceSection>

            <EvidenceSection title="Account State Deltas">
              <AccountStateDeltas
                evidenceAccounts={evidenceAccounts}
                hasSuccessfulDeposit={hasSuccessfulDeposit}
                hasSuccessfulWithdrawal={hasSuccessfulWithdrawal}
                impactVerified={impactVerified}
              />
            </EvidenceSection>
          </div>

          <div className="space-y-5">
            <EvidenceSection title="Verified Evidence">
              <div className="space-y-3">
                <EvidenceCheck
                  label={impactVerified ? "Illegitimate credit confirmed" : "Position credit changed"}
                  active={hasSuccessfulDeposit}
                />
                <EvidenceCheck
                  label={impactVerified ? "Unauthorized treasury withdrawal confirmed" : "Borrow action executed"}
                  active={hasSuccessfulWithdrawal}
                />
                <EvidenceCheck
                  label="Treasury balance changed"
                  active={hasSuccessfulWithdrawal}
                />
                <EvidenceCheck
                  label="Backend impact verification"
                  active={impactVerified}
                />
              </div>
            </EvidenceSection>

            <div className="rounded-2xl border border-[#9945ff]/20 bg-[#9945ff]/8 p-4">
              <p className="text-sm font-semibold text-[#c7a6ff]">
                {impactVerified ? "Impact verified" : "Verify Impact"}
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {impactVerified
                  ? "Backend verification confirmed the observed account transitions."
                  : "Ask the backend to verify whether the observed transitions crossed the intended trust boundary."}
              </p>
              {impactVerified ? (
                <button
                  type="button"
                  onClick={onContinueFinding}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#9945ff] to-[#14f195] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
                >
                  Continue to Submit Finding
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onProveImpact}
                  disabled={isRunning || !hasSuccessfulDeposit || !hasSuccessfulWithdrawal}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#9945ff] to-[#14f195] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  {isRunning ? "Verifying..." : "Verify Impact"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidenceSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">
        {title}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AccountStateDeltas({
  evidenceAccounts,
  hasSuccessfulDeposit,
  hasSuccessfulWithdrawal,
  impactVerified,
}: {
  evidenceAccounts: SandboxAccountSummary[];
  hasSuccessfulDeposit: boolean;
  hasSuccessfulWithdrawal: boolean;
  impactVerified: boolean;
}) {
  const credit = evidenceAccounts.find((a) =>
    a.data?.credit_position !== undefined || a.ref.includes("credit")
  );

  return (
    <div className="space-y-3">
      <EvidenceBalanceDelta
        title={impactVerified ? "Illegitimate Credit" : "Position Balance"}
        initialLabel="Initial Balance"
        initialValue="0"
        currentLabel="Current Balance"
        currentValue={hasSuccessfulDeposit ? String(credit?.data?.credit_position ?? "50,000") : "0"}
        active={hasSuccessfulDeposit}
      />
      <EvidenceBalanceDelta
        title="Treasury Balance"
        initialLabel="Initial Balance"
        initialValue="100.00k USDC"
        currentLabel="Current Balance"
        currentValue={hasSuccessfulWithdrawal ? "64.00k USDC" : "100.00k USDC"}
        active={hasSuccessfulWithdrawal}
      />
    </div>
  );
}

function EvidenceBalanceDelta({
  active,
  currentLabel,
  currentValue,
  initialLabel,
  initialValue,
  title,
}: {
  active: boolean;
  currentLabel: string;
  currentValue: string;
  initialLabel: string;
  initialValue: string;
  title: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-4">
        <span className="font-semibold uppercase tracking-[0.16em] text-zinc-600">
          {title}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] ${
            active
              ? "border-[#14f195]/20 bg-[#14f195]/8 text-[#8fffd0]"
              : "border-white/10 bg-white/[0.035] text-zinc-600"
          }`}
        >
          {active ? "Changed" : "No change"}
        </span>
      </div>
      <div className="mt-4 grid items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)]">
        <EvidenceBalanceCard
          label={initialLabel}
          value={initialValue}
        />
        <div className="hidden items-center justify-center md:flex">
          <div className="relative h-px w-full border-t border-dashed border-zinc-700">
            <ArrowRight className="absolute right-[-2px] top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          </div>
        </div>
        <EvidenceBalanceCard
          label={currentLabel}
          value={currentValue}
          active={active}
        />
      </div>
    </div>
  );
}

function EvidenceBalanceCard({
  active = false,
  label,
  value,
}: {
  active?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        active
          ? "border-[#14f195]/18 bg-[#14f195]/7"
          : "border-white/10 bg-white/[0.025]"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
        {label}
      </p>
      <p className={`mt-2 font-mono text-sm ${active ? "text-zinc-100" : "text-zinc-500"}`}>
        {value}
      </p>
    </div>
  );
}

function EvidenceCheck({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className={active ? "text-zinc-300" : "text-zinc-600"}>{label}</span>
      <span
        className={`rounded-full border px-2 py-0.5 text-[11px] ${
          active
            ? "border-[#14f195]/25 bg-[#14f195]/8 text-[#8fffd0]"
            : "border-white/10 bg-white/[0.035] text-zinc-600"
        }`}
      >
        {active ? "Confirmed" : "Pending"}
      </span>
    </div>
  );
}

function ReportTab({
  fields,
  findingReviewPassed,
  impactVerified,
  isSaving,
  isSubmitting,
  auditReportStage,
  questionnaireAnswers,
  questionnaireResult,
  reportOpened,
  retryQuestionIds,
  reviewAttempts,
  reviewIndex,
  reviewMode,
  reviewStarted,
  report,
  reportMetaFields,
  onChange,
  onChangeMeta,
  onChangeAuditReportStage,
  onQuestionnaireAnswer,
  onQuestionnaireRetry,
  onQuestionnaireSubmit,
  onOpenFindingReport,
  onReviewIndexChange,
  onReviewStart,
  onSave,
  onSubmit,
}: {
  report: ResearchLabReport | null;
  reportMetaFields: ReportMetaFields;
  fields: ResearchLabReportFields;
  findingReviewPassed: boolean;
  impactVerified: boolean;
  isSaving: boolean;
  isSubmitting: boolean;
  auditReportStage: AuditReportStage;
  questionnaireAnswers: QuestionnaireAnswer[];
  questionnaireResult: QuestionnaireResult | null;
  reportOpened: boolean;
  retryQuestionIds: string[];
  reviewAttempts: number;
  reviewIndex: number;
  reviewMode: ReviewMode;
  reviewStarted: boolean;
  onChange: (fields: ResearchLabReportFields) => void;
  onChangeMeta: (fields: ReportMetaFields) => void;
  onChangeAuditReportStage: (stage: AuditReportStage) => void;
  onQuestionnaireAnswer: (answer: QuestionnaireAnswer) => void;
  onQuestionnaireRetry: () => void;
  onQuestionnaireSubmit: () => void;
  onOpenFindingReport: () => void;
  onReviewIndexChange: (index: number) => void;
  onReviewStart: () => void;
  onSave: () => Promise<ResearchLabReport | null>;
  onSubmit: () => void;
}) {
  const [showCriticalAnswers, setShowCriticalAnswers] = useState(false);

  if (!impactVerified) {
    return (
      <div className="h-full overflow-auto p-5">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-black/15 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-zinc-500">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm font-semibold text-white">Finding review locked</p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-400">
            Verify impact before submitting the final finding. The questionnaire appears after backend state confirms unauthorized treasury movement.
          </p>
        </div>
      </div>
    );
  }

  if (!findingReviewPassed) {
    return (
      <div className="h-full overflow-auto p-5">
        <QuestionnairePanel
          answers={questionnaireAnswers}
          result={questionnaireResult}
          retryQuestionIds={retryQuestionIds}
          reviewAttempts={reviewAttempts}
          reviewIndex={reviewIndex}
          reviewMode={reviewMode}
          reviewStarted={reviewStarted}
          onAnswer={onQuestionnaireAnswer}
          onIndexChange={onReviewIndexChange}
          onRetry={onQuestionnaireRetry}
          onStart={onReviewStart}
          onSubmit={onQuestionnaireSubmit}
        />
      </div>
    );
  }

  const criticalTotal = rl1FindingQuestionnaire.questions.filter(
    (question) => question.critical
  ).length;
  const criticalMisses = questionnaireResult?.failedCriticalQuestions.length ?? 0;
  const scoreCopy = questionnaireResult
    ? `${questionnaireResult.score} / ${questionnaireResult.totalPoints}`
    : "Passed";

  if (!reportOpened && report?.status !== "accepted") {
    return (
      <div className="h-full overflow-auto p-5">
        <div className="w-full">
          <div className="flex min-h-[430px] items-center justify-center">
            <div className="w-full max-w-2xl text-center">
              <p className="flex items-center justify-center gap-2 text-2xl font-semibold text-white">
                <Check className="h-4 w-4" />
                Review Passed
              </p>
              <p className="mt-4 text-base leading-7 text-zinc-400">
                You can now build your Audit Report.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-zinc-400">
                <span>
                  Score <span className="font-mono text-zinc-100">{scoreCopy}</span>
                </span>
                <span>
                  Critical questions{" "}
                  <span className="font-mono text-zinc-100">
                    {criticalTotal - criticalMisses} / {criticalTotal}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowCriticalAnswers((visible) => !visible)}
                  className="min-h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
                >
                  {showCriticalAnswers ? "Hide Answers" : "View Answers"}
                </button>
              </div>
              {showCriticalAnswers ? <CriticalAnswersPanel /> : null}
              <button
                type="button"
                onClick={onOpenFindingReport}
                className="mt-7 min-h-11 rounded-xl border border-[#9945ff]/35 bg-[#9945ff] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#8a35f0] focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
              >
                Build Audit Report
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-5">
      <div className="w-full">
        <ReportForm
          expanded
          auditReportStage={auditReportStage}
          fields={fields}
          isSaving={isSaving}
          isSubmitting={isSubmitting}
          report={report}
          reportMetaFields={reportMetaFields}
          onChange={onChange}
          onChangeMeta={onChangeMeta}
          onChangeAuditReportStage={onChangeAuditReportStage}
          onSave={onSave}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}

function QuestionnairePanel({
  answers,
  result,
  retryQuestionIds,
  reviewAttempts,
  reviewIndex,
  reviewMode,
  reviewStarted,
  onAnswer,
  onIndexChange,
  onRetry,
  onStart,
  onSubmit,
}: {
  answers: QuestionnaireAnswer[];
  result: QuestionnaireResult | null;
  retryQuestionIds: string[];
  reviewAttempts: number;
  reviewIndex: number;
  reviewMode: ReviewMode;
  reviewStarted: boolean;
  onAnswer: (answer: QuestionnaireAnswer) => void;
  onIndexChange: (index: number) => void;
  onRetry: () => void;
  onStart: () => void;
  onSubmit: () => void;
}) {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer]));
  const incorrectIds =
    result && !result.passed
      ? getIncorrectRequiredQuestionIds(result)
      : retryQuestionIds;
  const criticalMissCount =
    result && !result.passed ? result.failedCriticalQuestions.length : 0;
  const visibleQuestions = getReviewQuestions(reviewMode, incorrectIds);
  const requiredQuestions = visibleQuestions.filter(isRequiredQuestion);
  const answeredRequiredCount = requiredQuestions.filter((question) =>
    isQuestionAnswered(question, answerMap.get(question.id))
  ).length;
  const allRequiredAnswered = answeredRequiredCount === requiredQuestions.length;
  const isSummaryStep = reviewIndex >= visibleQuestions.length;
  const currentQuestion = visibleQuestions[Math.min(reviewIndex, visibleQuestions.length - 1)];
  const currentAnswer = currentQuestion ? answerMap.get(currentQuestion.id) : undefined;
  const canAdvance =
    !currentQuestion || isQuestionAnswered(currentQuestion, currentAnswer);
  const progressTotal = visibleQuestions.length + 1;
  const progressCurrent = Math.min(reviewIndex + 1, progressTotal);
  const progressPercent = Math.max(
    8,
    Math.round((progressCurrent / progressTotal) * 100)
  );

  return (
    <div className="w-full">
      {!reviewStarted ? (
        <div className="p-1">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">
              Submit Finding
            </p>
            <span className="rounded-full border border-[#14f195]/20 bg-[#14f195]/8 px-2.5 py-1 text-xs text-[#8fffd0]">
              Impact verified
            </span>
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white">
            Confirm the finding.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Validate root cause, exploit path, impact, and remediation before the Audit Report unlocks.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-400">
            <span>Passing score: {rl1FindingQuestionnaire.passingScore}</span>
            <span>Critical questions: {rl1FindingQuestionnaire.questions.filter((question) => question.critical).length}</span>
            <span>Retry: missed questions only</span>
          </div>
          <button
            type="button"
            onClick={onStart}
            className="mt-6 rounded-xl border border-[#9945ff]/35 bg-[#9945ff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8a35f0] focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
          >
            Start Finding Review
          </button>
        </div>
      ) : null}

      {reviewStarted && result && !result.passed ? (
        <div className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/8 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-100/75">
                Review failed
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                Retry incorrect answers
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-50/80">
                Score: {result.score}/{result.totalPoints}. Missed questions: {incorrectIds.length}. Critical missed: {criticalMissCount}.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-300/25 bg-black/20 px-4 py-3 text-right">
              <p className="font-mono text-2xl font-semibold text-white">{incorrectIds.length}</p>
              <p className="text-xs text-amber-100">to retry</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {getFeedbackTopics(incorrectIds).map((topic) => (
              <p key={topic} className="rounded-xl border border-amber-300/15 bg-black/20 px-3 py-2 text-sm leading-6 text-amber-50/80">
                {topic}
              </p>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onRetry}
              className="min-h-10 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/15 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
            >
              Retry Incorrect Answers
            </button>
          </div>
        </div>
      ) : null}

      {reviewStarted && !result ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-600">
                Submit Finding
                <span className="rounded-full border border-[#14f195]/20 bg-[#14f195]/8 px-2 py-0.5 tracking-normal text-[#8fffd0]">
                  Impact verified
                </span>
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                {isSummaryStep ? "Review summary" : "Finding Review"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                {reviewMode === "retry"
                  ? "Only missed required questions are included in this retry."
                  : "Answer the required evidence and remediation checks."}
              </p>
            </div>
            <p className="text-sm text-zinc-400">
              Question {progressCurrent} of {progressTotal} · Attempt {reviewAttempts ? reviewAttempts + 1 : 1}
            </p>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-[#9945ff]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <AnimatedContentSwitch
            className="mt-6"
            transitionKey={`question-${reviewMode}-${isSummaryStep ? "summary" : currentQuestion?.id ?? "empty"}`}
          >
            {isSummaryStep ? (
              <div className="border-y border-white/10 py-5">
                <p className="text-sm font-semibold text-white">Ready to submit review</p>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400">
                  <span>
                    Required answered{" "}
                    <span className="font-mono text-zinc-100">
                      {answeredRequiredCount}/{requiredQuestions.length}
                    </span>
                  </span>
                  <span>
                    Critical required{" "}
                    <span className="font-mono text-zinc-100">
                      {visibleQuestions.filter((question) => question.critical).length}
                    </span>
                  </span>
                  <span>
                    Audit Report <span className="font-mono text-zinc-100">Locked</span>
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-400">
                  Missed required questions are queued for retry.
                </p>
              </div>
            ) : currentQuestion ? (
              <QuestionBlock
                answer={currentAnswer}
                disabled={false}
                index={reviewIndex}
                question={currentQuestion}
                onAnswer={onAnswer}
              />
            ) : null}
          </AnimatedContentSwitch>

          <div className="flex flex-wrap justify-between gap-3">
            <button
              type="button"
              onClick={() => onIndexChange(Math.max(0, reviewIndex - 1))}
              disabled={reviewIndex === 0}
              className="min-h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Back
            </button>
            <div className="flex gap-3">
              {!isSummaryStep ? (
                <button
                  type="button"
                  onClick={() =>
                    onIndexChange(Math.min(reviewIndex + 1, visibleQuestions.length))
                  }
                  disabled={!canAdvance}
                  className="min-h-10 rounded-xl border border-[#9945ff]/30 bg-[#9945ff]/12 px-5 py-2.5 text-sm font-semibold text-[#c7a6ff] transition hover:bg-[#9945ff]/18 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={!allRequiredAnswered}
                  className="min-h-10 rounded-xl border border-[#9945ff]/35 bg-[#9945ff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8a35f0] focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Submit Review
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CriticalAnswersPanel() {
  const criticalQuestionIds = [
    "q1_vulnerability_category",
    "q4_exploit_sequence",
    "q6_impact_proven",
    "q8_recommended_fix",
  ];
  const criticalQuestions = criticalQuestionIds
    .map((id) =>
      rl1FindingQuestionnaire.questions.find((question) => question.id === id)
    )
    .filter(Boolean) as QuestionnaireQuestion[];

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-sm font-semibold text-white">Critical exploit answers</p>
      <div className="mt-4 space-y-4">
        {criticalQuestions.map((question) => {
          const answerId = question.correctOptionId;
          const answerLabel =
            question.options?.find((option) => option.id === answerId)?.label ??
            "Configured correct answer";

          return (
            <div key={question.id}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">
                {question.section}
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-zinc-100">
                {answerLabel}
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                {question.explanation}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestionBlock({
  answer,
  disabled,
  index,
  question,
  result,
  onAnswer,
}: {
  answer: QuestionnaireAnswer | undefined;
  disabled: boolean;
  index: number;
  question: QuestionnaireQuestion;
  result?: { correct: boolean; pointsEarned: number };
  onAnswer: (answer: QuestionnaireAnswer) => void;
}) {
  const questionNumber = index + 1;
  const fieldName = `question-${question.id}`;
  const selectedOptionId =
    answer && "selectedOptionId" in answer ? answer.selectedOptionId : "";
  const selectedOptionIds =
    answer && "selectedOptionIds" in answer ? answer.selectedOptionIds : [];
  const text = answer && "text" in answer ? answer.text : "";

  const toggleMultiSelect = (optionId: string) => {
    const next = selectedOptionIds.includes(optionId)
      ? selectedOptionIds.filter((id) => id !== optionId)
      : [...selectedOptionIds, optionId];
    onAnswer({ questionId: question.id, selectedOptionIds: next });
  };

  return (
    <fieldset
      className={`rounded-2xl border p-4 ${
        result
          ? result.correct
            ? "border-[#14f195]/20 bg-[#14f195]/8"
            : "border-amber-300/25 bg-amber-300/8"
          : "border-white/10 bg-white/[0.035]"
      }`}
    >
      <legend className="sr-only">{question.prompt}</legend>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-600">
            {question.section}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white">
            {questionNumber}. {question.prompt}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {question.critical ? (
            <span className="rounded-full border border-[#9945ff]/25 bg-[#9945ff]/10 px-2.5 py-1 text-[11px] text-[#c7a6ff]">
              Critical
            </span>
          ) : null}
          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-zinc-500">
            {question.points} pts
          </span>
        </div>
      </div>

      {question.options ? (
        <div className="mt-4 grid gap-2">
          {question.options.map((option) => {
            const selected =
              question.type === "single_choice"
                ? selectedOptionId === option.id
                : selectedOptionIds.includes(option.id);
            return (
              <label
                key={option.id}
                className={`flex min-h-10 cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm leading-6 transition ${
                  selected
                    ? "border-[#9945ff]/40 bg-[#9945ff]/12 text-zinc-100"
                    : "border-white/10 bg-black/20 text-zinc-400 hover:bg-white/[0.04]"
                } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
              >
                <input
                  checked={selected}
                  disabled={disabled}
                  name={fieldName}
                  type={question.type === "single_choice" ? "radio" : "checkbox"}
                  onChange={() => {
                    if (question.type === "single_choice") {
                      onAnswer({
                        questionId: question.id,
                        selectedOptionId: option.id,
                      });
                      return;
                    }
                    toggleMultiSelect(option.id);
                  }}
                  className="mt-1 h-4 w-4 accent-[#9945ff]"
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <label className="mt-4 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600">
            Optional reflection
          </span>
          <textarea
            value={text}
            rows={3}
            disabled={disabled}
            placeholder="SPL transfer success proves token-account compatibility, not protocol-approved collateral configuration."
            spellCheck
            onChange={(event) =>
              onAnswer({ questionId: question.id, text: event.target.value })
            }
            className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm leading-6 text-zinc-200 outline-none transition placeholder:text-zinc-700 focus:border-[#9945ff]/45 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
      )}

      {result ? (
        <p
          className={`mt-3 text-sm leading-6 ${
            result.correct ? "text-[#8fffd0]" : "text-amber-100"
          }`}
        >
          {result.correct
            ? question.explanation
            : "Review this topic and retry. Focus on the exploit cause, evidence, and remediation rather than transaction success alone."}
        </p>
      ) : null}
    </fieldset>
  );
}

function LabContextPanel({
  activeFile,
  auditReportStage,
  executeExploitView,
  findingReviewPassed,
  impactVerified,
  lab,
  phase,
  questionnaireResult,
  report,
  reportOpened,
  retryQuestionIds,
  reviewMode,
  reviewStarted,
  reviewStepCurrent,
  reviewStepTotal,
  criticalAnsweredCount,
  criticalTotal,
  revealedHints,
  session,
  txResults,
  onOpenExploit,
  onOpenReport,
  onRevealHint,
  onRetryReview,
  onStartReview,
}: {
  activeFile: ResearchLabFile | null;
  auditReportStage: AuditReportStage;
  executeExploitView: ExecuteExploitView;
  findingReviewPassed: boolean;
  impactVerified: boolean;
  lab: ResearchLabManifest;
  phase: LabPhase;
  questionnaireResult: QuestionnaireResult | null;
  report: ResearchLabReport | null;
  reportOpened: boolean;
  retryQuestionIds: string[];
  reviewMode: ReviewMode;
  reviewStarted: boolean;
  reviewStepCurrent: number;
  reviewStepTotal: number;
  criticalAnsweredCount: number;
  criticalTotal: number;
  revealedHints: string[];
  session: ResearchLabSession;
  txResults: EnrichedTransactionResult[];
  onOpenExploit: () => void;
  onOpenReport: () => void;
  onRevealHint: () => void;
  onRetryReview: () => void;
  onStartReview: () => void;
}) {
  const nextHint = lab.hints.find((hint) => !revealedHints.includes(hint.id));
  const reportAccepted = Boolean(report?.status === "accepted" || session.labCompleted);
  const isReportContext = phase === "SUBMIT_FINDING" || phase === "COMPLETED";
  const isInternalEvidenceReview =
    phase === "EXECUTE_EXPLOIT" && executeExploitView === "EVIDENCE_REVIEW";
  const panelTitle =
    isInternalEvidenceReview
      ? "Evidence Status"
    : phase === "EXECUTE_EXPLOIT"
      ? "Attempt State"
    : phase === "VERIFY_IMPACT"
        ? "Evidence Review"
        : isReportContext
          ? "Report Context"
          : "Inspection Context";
  const panelContent = (
    <>
      {phase === "EXECUTE_EXPLOIT" ? (
        <ExecuteExploitContext
          activeView={executeExploitView}
          reportUnlocked={Boolean(session.reportStatus) || impactVerified}
          session={session}
          txResults={txResults}
        />
      ) : phase === "VERIFY_IMPACT" ? (
        <EvidenceReviewContext />
      ) : impactVerified ? (
        <ReviewContextCard
          findingReviewPassed={findingReviewPassed}
          questionnaireResult={questionnaireResult}
          reportAccepted={reportAccepted}
          reportOpened={reportOpened}
          retryQuestionIds={retryQuestionIds}
          reviewMode={reviewMode}
          reviewStarted={reviewStarted}
          reviewStepCurrent={reviewStepCurrent}
          reviewStepTotal={reviewStepTotal}
          criticalAnsweredCount={criticalAnsweredCount}
          criticalTotal={criticalTotal}
          auditReportStage={auditReportStage}
          onOpenReport={onOpenReport}
          onRetryReview={onRetryReview}
          onStartReview={onStartReview}
        />
      ) : null}

      {phase === "EXECUTE_EXPLOIT" || phase === "VERIFY_IMPACT" ? null : impactVerified ? (
        <SubmitFindingContextSupport
          findingReviewPassed={findingReviewPassed}
        />
      ) : (
        <>
          <ContextBlock title="Current Objective">
            <p className="text-sm leading-6 text-zinc-400">
              {labShellCopy.objective}
            </p>
            {phase === "INSPECT" ? (
              <button
                type="button"
                onClick={onOpenExploit}
                className="mt-4 w-full rounded-xl border border-[#14f195]/25 bg-[#14f195]/8 px-4 py-2.5 text-sm font-medium text-[#8fffd0] transition hover:bg-[#14f195]/12"
              >
                Open exploit builder
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
            <HintList
              lab={lab}
              nextHintAvailable={Boolean(nextHint)}
              revealedHints={revealedHints}
              onRevealHint={onRevealHint}
            />
          </ContextBlock>
        </>
      )}
    </>
  );

  if (isReportContext) {
    return (
      <aside className="h-full min-w-0">
        <div className="h-full min-h-0 space-y-4 overflow-auto">
          {panelContent}
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-w-0 flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#111212]/85 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400">{panelTitle}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
        {panelContent}
      </div>
    </aside>
  );
}

function SubmitFindingContextSupport({
  findingReviewPassed,
}: {
  findingReviewPassed: boolean;
}) {
  return (
    <>
      <ContextBlock title={findingReviewPassed ? "Verified Evidence" : "Impact Status"}>
        <div className="space-y-3 text-sm">
          <EvidenceCheck label="Impact verified" active />
          {findingReviewPassed ? (
            <>
              <EvidenceCheck label="Counterfeit deposit transaction" active />
              <EvidenceCheck label="Withdrawal transaction" active />
              <EvidenceCheck label="Position credit changed" active />
              <EvidenceCheck label="Treasury balance decreased" active />
            </>
          ) : null}
        </div>
      </ContextBlock>
    </>
  );
}

function ExecuteExploitContext({
  activeView,
  reportUnlocked,
  session,
  txResults,
}: {
  activeView: ExecuteExploitView;
  reportUnlocked: boolean;
  session: ResearchLabSession;
  txResults: EnrichedTransactionResult[];
}) {
  const [revealedChainHints, setRevealedChainHints] = useState(0);
  const depositSubmitted = txResults.some(
    (result) =>
      result.instructionType.includes("DEPOSIT") &&
      result.executionStatus === "success"
  );
  const withdrawalSubmitted = txResults.some(
    (result) =>
      result.instructionType.includes("WITHDRAW") &&
      result.executionStatus === "success"
  );
  const impactVerified = session.status === "passed" || Boolean(session.labCompleted);
  const chainHints = [
    "Start by comparing the token account you provide with the vault that receives it.",
    "After deposit, inspect whether position credit changed even though the account path was not canonical.",
    "If credit appears, use the protocol borrow surface and then review whether treasury state changed.",
  ];
  const canRevealMoreHints = revealedChainHints < chainHints.length;

  if (activeView === "EVIDENCE_REVIEW") {
    return (
      <ContextBlock title="Evidence Status">
        <div className="space-y-3 text-sm">
          <EvidenceLine label="Transactions" value={`${txResults.length}`} />
          <EvidenceLine label="Deposit" value={depositSubmitted ? "Success" : "Not submitted"} />
          <EvidenceLine label="Borrow" value={withdrawalSubmitted ? "Success" : "Not submitted"} />
          <EvidenceLine label="State deltas" value={txResults.length ? "Available" : "Pending"} />
          <EvidenceLine label="Impact" value={impactVerified ? "Verified" : "Not verified"} />
        </div>
      </ContextBlock>
    );
  }

  return (
    <>
      <ContextBlock title="Attempt State">
        <div className="space-y-3">
          <AttemptStep label="Hypothesis selected" active />
          <AttemptStep label="Deposit submitted" active={depositSubmitted} />
          <AttemptStep label="Withdrawal submitted" active={withdrawalSubmitted} />
          <AttemptStep label="Impact verified" active={impactVerified} />
          <AttemptStep label="Report unlocked" active={reportUnlocked} />
        </div>
      </ContextBlock>

      <ContextBlock title="Exploit Hints">
        <div className="space-y-3">
          {revealedChainHints === 0 ? (
            <p className="text-sm leading-6 text-zinc-500">
              Reveal hints only if you want guidance on the exploit sequence.
            </p>
          ) : (
            <div className="space-y-2">
              {chainHints.slice(0, revealedChainHints).map((hint, index) => (
                <div
                  key={hint}
                  className="rounded-xl border border-white/10 bg-white/[0.035] p-3"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                    Hint {index + 1}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{hint}</p>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() =>
              setRevealedChainHints((current) =>
                Math.min(current + 1, chainHints.length)
              )
            }
            disabled={!canRevealMoreHints}
            className="w-full rounded-xl border border-[#9945ff]/25 bg-[#9945ff]/10 px-4 py-2.5 text-sm font-medium text-[#c7a6ff] transition hover:bg-[#9945ff]/15 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {canRevealMoreHints ? "Reveal next hint" : "All hints revealed"}
          </button>
        </div>
      </ContextBlock>
    </>
  );
}

function EvidenceReviewContext() {
  return (
    <ContextBlock title="Scope">
      <p className="text-sm leading-6 text-zinc-400">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
        protocol evidence, account relationships, and impact notes will be
        reviewed here.
      </p>
    </ContextBlock>
  );
}

function HintList({
  compact = false,
  lab,
  nextHintAvailable,
  revealedHints,
  onRevealHint,
}: {
  compact?: boolean;
  lab: ResearchLabManifest;
  nextHintAvailable: boolean;
  revealedHints: string[];
  onRevealHint: () => void;
}) {
  return (
    <div className="space-y-4">
      {!compact && revealedHints.length ? (
        lab.hints
          .filter((hint) => revealedHints.includes(hint.id))
          .map((hint) => (
            <div key={hint.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <p className="text-sm font-semibold text-[#8fffd0]">{hint.title}</p>
              <p className="mt-1 text-sm leading-6 text-zinc-400">{hint.body}</p>
            </div>
          ))
      ) : (
        <p className="text-sm leading-6 text-zinc-500">
          {compact ? "Use a hint only if you are stuck." : "Hints stay hidden until you ask for them."}
        </p>
      )}
      <button
        type="button"
        onClick={onRevealHint}
        disabled={!nextHintAvailable}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {nextHintAvailable ? "Reveal Hint" : "All hints revealed"}
      </button>
    </div>
  );
}

function ReviewContextCard({
  auditReportStage,
  findingReviewPassed,
  questionnaireResult,
  reportAccepted,
  reportOpened,
  retryQuestionIds,
  reviewMode,
  reviewStarted,
  reviewStepCurrent,
  reviewStepTotal,
  criticalAnsweredCount,
  criticalTotal,
  onOpenReport,
  onRetryReview,
  onStartReview,
}: {
  auditReportStage: AuditReportStage;
  findingReviewPassed: boolean;
  questionnaireResult: QuestionnaireResult | null;
  reportAccepted: boolean;
  reportOpened: boolean;
  retryQuestionIds: string[];
  reviewMode: ReviewMode;
  reviewStarted: boolean;
  reviewStepCurrent: number;
  reviewStepTotal: number;
  criticalAnsweredCount: number;
  criticalTotal: number;
  onOpenReport: () => void;
  onRetryReview: () => void;
  onStartReview: () => void;
}) {
  const auditStatus =
    auditReportStage === "SUBMITTED"
      ? "Submitted"
      : auditReportStage === "PREVIEW"
        ? "Ready to Submit"
        : "Draft";

  if (reportAccepted) {
    return (
      <ContextBlock title="Status">
        <div className="space-y-3 text-sm">
          <EvidenceLine label="Review" value="Passed" />
          <EvidenceLine label="Audit Report" value="Submitted" />
          <EvidenceLine label="Completion" value="Recorded" />
        </div>
      </ContextBlock>
    );
  }

  if (findingReviewPassed) {
    return (
      <ContextBlock title="Status">
        <div className="space-y-3 text-sm">
          <EvidenceLine label="Review" value="Passed" />
          <EvidenceLine label="Audit Report" value={auditStatus} />
        </div>
        <button
          type="button"
          onClick={onOpenReport}
          className="mt-4 w-full rounded-xl border border-[#9945ff]/30 bg-[#9945ff]/12 px-4 py-2.5 text-sm font-semibold text-[#c7a6ff] transition hover:bg-[#9945ff]/18"
        >
          {reportOpened ? "Return to Audit Report" : "Build Audit Report"}
        </button>
      </ContextBlock>
    );
  }

  if (questionnaireResult && !questionnaireResult.passed) {
    return (
      <div className="rounded-2xl border border-amber-300/25 bg-amber-300/8 p-4">
        <p className="text-sm font-semibold text-amber-100">
          Review needs correction
        </p>
        <p className="mt-2 text-sm leading-6 text-amber-50/80">
          Score {questionnaireResult.score}/{questionnaireResult.totalPoints}. Retry only the missed required questions.
        </p>
        <div className="mt-3 rounded-xl border border-amber-300/15 bg-black/20 px-3 py-2 text-sm text-amber-50/80">
          {retryQuestionIds.length} incorrect required item{retryQuestionIds.length === 1 ? "" : "s"}
        </div>
        <button
          type="button"
          onClick={onRetryReview}
          className="mt-4 w-full rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/15"
        >
          Retry Incorrect Answers
        </button>
      </div>
    );
  }

  if (reviewStarted) {
    const percent = Math.max(
      8,
      Math.round((reviewStepCurrent / Math.max(1, reviewStepTotal)) * 100)
    );

    return (
      <div className="rounded-2xl border border-[#9945ff]/25 bg-[#9945ff]/8 p-4">
        <p className="text-sm font-semibold text-[#c7a6ff]">Finding Review</p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          {reviewMode === "retry"
            ? "Retrying missed required questions. Report remains locked."
            : "Answer the deterministic review before the report unlocks."}
        </p>
        <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
          <span>Progress</span>
          <span>{reviewStepCurrent}/{reviewStepTotal}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-[#9945ff]" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-400">
          Report: Locked until review passed
        </div>
        <div className="mt-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-400">
          Critical answered: {criticalAnsweredCount}/{criticalTotal}
        </div>
        <button
          type="button"
          onClick={onStartReview}
          className="mt-4 w-full rounded-xl border border-[#9945ff]/30 bg-[#9945ff]/12 px-4 py-2.5 text-sm font-semibold text-[#c7a6ff] transition hover:bg-[#9945ff]/18"
        >
          Continue Review
        </button>
      </div>
    );
  }

  return (
    <ContextBlock title="Status">
      <div className="space-y-3 text-sm">
        <EvidenceLine label="Impact" value="Verified" />
        <EvidenceLine label="Review" value="Required" />
        <EvidenceLine label="Audit Report" value="Locked" />
      </div>
      <button
        type="button"
        onClick={onStartReview}
        className="mt-4 w-full rounded-xl border border-[#9945ff]/30 bg-[#9945ff]/12 px-4 py-2.5 text-sm font-semibold text-[#c7a6ff] transition hover:bg-[#9945ff]/18"
      >
        Start Finding Review
      </button>
    </ContextBlock>
  );
}

function ReportForm({
  auditReportStage,
  report,
  fields,
  reportMetaFields,
  isSaving,
  isSubmitting,
  onChange,
  onChangeAuditReportStage,
  onChangeMeta,
  onSave,
  onSubmit,
  expanded = false,
}: {
  auditReportStage: AuditReportStage;
  report: ResearchLabReport | null;
  fields: ResearchLabReportFields;
  reportMetaFields: ReportMetaFields;
  isSaving: boolean;
  isSubmitting: boolean;
  onChange: (fields: ResearchLabReportFields) => void;
  onChangeAuditReportStage: (stage: AuditReportStage) => void;
  onChangeMeta: (fields: ReportMetaFields) => void;
  onSave: () => Promise<ResearchLabReport | null>;
  onSubmit: () => void;
  expanded?: boolean;
}) {
  const [auditReportPreview, setAuditReportPreview] =
    useState<AuditReportPreview | null>(null);
  const status = report?.status ?? "draft";
  const isLocked = status === "locked";
  const isAccepted = status === "accepted";
  const isEditable = !isLocked && !isAccepted;
  const isMetaComplete = Boolean(
    reportMetaFields.title.trim() && reportMetaFields.likelihood
  );
  const allowedValues = report?.allowedValues ?? {
    vulnerabilityCategory: ["missing_validation", "arithmetic_safety"],
    affectedArea: ["deposit_instruction", "vault_health_calculation"],
    severity: ["low", "medium", "high"],
  };
  const updateFields = (nextFields: ResearchLabReportFields) => {
    setAuditReportPreview(null);
    onChangeAuditReportStage("BUILDER");
    onChange(nextFields);
  };
  const updateMeta = (nextFields: ReportMetaFields) => {
    setAuditReportPreview(null);
    onChangeAuditReportStage("BUILDER");
    onChangeMeta(nextFields);
  };
  const reportComplete = isReportComplete(fields) && isMetaComplete;

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

  if (isAccepted || auditReportStage === "SUBMITTED") {
    return <AuditReportSubmitted />;
  }

  if (auditReportStage === "PREVIEW") {
    const preview =
      auditReportPreview ?? buildAuditReportPreview(reportMetaFields, fields);

    return (
      <AuditReportPreviewScreen
        isSubmitting={isSubmitting}
        report={preview}
        onEdit={() => onChangeAuditReportStage("BUILDER")}
        onSubmit={() => {
          onChangeAuditReportStage("SUBMITTED");
          onSubmit();
        }}
      />
    );
  }

  return (
    <div className={expanded ? "" : "space-y-4"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">Audit Report</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">Build Audit Report</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Choose the statements that match the verified exploit evidence.
          </p>
        </div>
      </div>

      {report?.feedback ? (
        <div className={`mt-4 rounded-xl border px-3 py-2 text-sm leading-6 ${status === "retry" ? "border-amber-300/25 bg-amber-300/8 text-amber-100" : "border-[#14f195]/20 bg-[#14f195]/8 text-[#8fffd0]"}`}>
          {report.feedback}
        </div>
      ) : null}

      <div className="mt-7 space-y-7">
          <section className="border-b border-white/10 pb-7">
            <h3 className="text-sm font-semibold text-white">1. Finding Summary</h3>
            <div className="mt-4 grid gap-5">
              <ReportChoiceGroup
                disabled={!isEditable}
                helper="Name the arithmetic boundary and impact."
                label="Title"
                options={reportTitleOptions}
                value={reportMetaFields.title}
                onChange={(value) => updateMeta({ ...reportMetaFields, title: value })}
              />
              <ReportSelect
                disabled={!isEditable}
                label="Category"
                value={fields.vulnerabilityCategory ?? ""}
                values={allowedValues.vulnerabilityCategory}
                onChange={(value) => updateFields({ ...fields, vulnerabilityCategory: value || null })}
              />
            </div>
          </section>

          <section className="border-b border-white/10 pb-7">
            <h3 className="text-sm font-semibold text-white">2. Severity & Likelihood</h3>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <ReportSelect
                disabled={!isEditable}
                label="Severity"
                value={fields.severity ?? ""}
                values={allowedValues.severity}
                onChange={(value) => updateFields({ ...fields, severity: value || null })}
              />
              <ReportSelect
                disabled={!isEditable}
                label="Likelihood"
                value={reportMetaFields.likelihood}
                values={["low", "medium", "medium_high", "high"]}
                onChange={(value) => updateMeta({ ...reportMetaFields, likelihood: value })}
              />
            </div>
          </section>

          <ReportChoiceGroup
            disabled={!isEditable}
            helper="Explain where unsafe arithmetic affects the health calculation."
            label="3. Root Cause"
            options={reportRootCauseOptions}
            value={fields.rootCause}
            onChange={(value) => updateFields({ ...fields, rootCause: value })}
          />
          <ReportChoiceGroup
            disabled={!isEditable}
            helper="Describe how distorted health accounting affects protocol safety."
            label="4. Proof of Impact"
            options={reportImpactOptions}
            value={fields.impact}
            onChange={(value) => updateFields({ ...fields, impact: value })}
          />
          <ReportChoiceGroup
            disabled={!isEditable}
            helper="These notes sit alongside evidence captured from your verified sandbox execution."
            label="5. Evidence Notes"
            options={reportProofOptions}
            value={fields.proof}
            onChange={(value) => updateFields({ ...fields, proof: value })}
          />
          <ReportChoiceGroup
            disabled={!isEditable}
            helper="Describe how arithmetic should fail safely before health decisions."
            label="6. Recommended Fix"
            options={reportFixOptions}
            value={fields.recommendedFix}
            onChange={(value) => updateFields({ ...fields, recommendedFix: value })}
          />

        <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-2">
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={!isEditable || isSaving || isSubmitting}
            className="min-h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSaving ? "Saving" : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuditReportPreview(
                buildAuditReportPreview(reportMetaFields, fields)
              );
              onChangeAuditReportStage("PREVIEW");
            }}
            disabled={!isEditable || !reportComplete || isSaving || isSubmitting}
            className="min-h-10 rounded-xl border border-[#9945ff]/30 bg-[#9945ff] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8a35f0] focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Create Audit Report
          </button>
        </div>
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
        className="mt-2 min-h-10 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-zinc-200 outline-none transition focus:border-[#9945ff]/45 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] disabled:cursor-not-allowed disabled:opacity-60"
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

function buildAuditReportPreview(
  metaFields: ReportMetaFields,
  fields: ResearchLabReportFields
): AuditReportPreview {
  const severity = fields.severity ? formatReportValue(fields.severity) : "High";
  const likelihood = metaFields.likelihood
    ? formatReportValue(metaFields.likelihood)
    : "Medium High";
  const title = metaFields.title.trim() || suggestedReportMetaFields.title;

  return {
    title,
    severity,
    likelihood,
    category: fields.vulnerabilityCategory
      ? formatReportValue(fields.vulnerabilityCategory)
      : "Arithmetic Safety",
    description: `This audit report documents ${fields.vulnerabilityCategory ? formatReportValue(fields.vulnerabilityCategory) : "arithmetic safety"} in RL-007, where unsafe vault health arithmetic can distort collateral accounting before the protocol evaluates health.`,
    rootCause: fields.rootCause.trim(),
    proofOfImpact: fields.impact.trim(),
    evidence: fields.proof.trim(),
    recommendedMitigation: fields.recommendedFix.trim(),
  };
}

function AuditReportPreviewScreen({
  isSubmitting,
  report,
  onEdit,
  onSubmit,
}: {
  isSubmitting: boolean;
  report: AuditReportPreview;
  onEdit: () => void;
  onSubmit: () => void;
}) {
  return (
    <section className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-600">
            Audit Report
          </p>
          <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
            Audit Report
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Review the generated report before final submission.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onEdit}
            className="min-h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
          >
            Edit Report
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="min-h-10 rounded-xl border border-[#9945ff]/30 bg-[#9945ff] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8a35f0] focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSubmitting ? "Submitting" : "Submit Audit Report"}
          </button>
        </div>
      </div>
      <article className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-6">
        <h4 className="text-2xl font-semibold tracking-[-0.03em] text-white">
          {report.title}
        </h4>
        <div className="mt-5 grid gap-4 border-y border-white/10 py-4 sm:grid-cols-3">
          <ReportFact label="Severity" value={report.severity} />
          <ReportFact label="Likelihood" value={report.likelihood} />
          <ReportFact label="Category" value={report.category} />
        </div>
        <div className="mt-6 space-y-6">
          <AuditReportSection title="Description" body={report.description} />
          <AuditReportSection title="Root Cause" body={report.rootCause} />
          <AuditReportSection title="Proof of Impact" body={report.proofOfImpact} />
          <AuditReportSection title="Evidence" body={report.evidence} />
          <AuditReportSection
            title="Recommended Mitigation"
            body={report.recommendedMitigation}
          />
        </div>
      </article>
    </section>
  );
}

function AuditReportSubmitted() {
  return (
    <section className="flex min-h-[440px] items-center justify-center text-center">
      <div className="max-w-xl">
        <p className="flex items-center justify-center gap-2 text-2xl font-semibold text-white">
          <Check className="h-5 w-5 text-[#14f195]" />
          Audit Report Submitted
        </p>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          RL-001 completion is recorded. The final audit report has been submitted.
        </p>
      </div>
    </section>
  );
}

function ReportFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function AuditReportSection({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h5 className="text-sm font-semibold text-white">{title}</h5>
      <p className="mt-2 text-sm leading-7 text-zinc-300">{body}</p>
    </section>
  );
}

function ReportChoiceGroup({
  disabled,
  helper,
  label,
  options,
  value,
  onChange,
}: {
  disabled: boolean;
  helper?: string;
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const fieldName = `report-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <fieldset className="border-b border-white/10 pb-7">
      <legend className="text-sm font-semibold text-white">
        {label}
      </legend>
      {helper ? <p className="mt-1.5 text-sm leading-6 text-zinc-500">{helper}</p> : null}
      <div className="mt-4 grid gap-2">
        {options.map((option) => {
          const selected = value === option;
          return (
            <label
              key={option}
              className={`flex min-h-10 cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm leading-6 transition ${
                selected
                  ? "border-[#9945ff]/40 bg-[#9945ff]/12 text-zinc-100"
                  : "border-white/10 bg-black/20 text-zinc-400 hover:bg-white/[0.04]"
              } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <input
                checked={selected}
                disabled={disabled}
                name={fieldName}
                type="radio"
                onChange={() => onChange(option)}
                className="mt-1 h-4 w-4 accent-[#9945ff]"
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
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
