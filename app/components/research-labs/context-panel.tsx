"use client";

import { Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { driver } from "driver.js";

import type { QuestionnaireResult } from "../../lib/research-labs/rl1-questionnaire";
import type { ResearchLabFile, ResearchLabManifest, ResearchLabReport, ResearchLabSession } from "../../lib/research-labs/lab-state";
import {
  deriveProtocolState,
} from "./execute-exploit-tab";
import { ReviewCheckpointPanel } from "./report-tab";
import type { EnrichedTransactionResult, ExecuteExploitView, LabPhase, ReviewMode } from "./types";

const contextObjective =
  "Determine whether an attacker can trigger an unauthorized state transition and collect enough evidence to report the finding.";

export function LabContextPanel({
  activeFile,
  executeExploitView,
  findingReviewPassed,
  impactVerified,
  lab,
  phase,
  questionnaireResult,
  report,
  reportUnlocked,
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
}: {
  activeFile: ResearchLabFile | null;
  executeExploitView: ExecuteExploitView;
  findingReviewPassed: boolean;
  impactVerified: boolean;
  lab: ResearchLabManifest;
  phase: LabPhase;
  questionnaireResult: QuestionnaireResult | null;
  report: ResearchLabReport | null;
  reportUnlocked: boolean;
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
          impactVerified={impactVerified}
          onOpenReport={onOpenReport}
          reportUnlocked={reportUnlocked}
          txResults={txResults}
        />
      ) : phase === "VERIFY_IMPACT" ? (
        <ExecuteExploitContext
          impactVerified={impactVerified}
          onOpenReport={onOpenReport}
          reportUnlocked={reportUnlocked}
          txResults={txResults}
        />
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
          onOpenReport={onOpenReport}
          onRetryReview={onRetryReview}
        />
      ) : null}

      {phase === "EXECUTE_EXPLOIT" || phase === "VERIFY_IMPACT" ? null : !impactVerified ? (
        <>
          <ContextBlock title="Current Objective">
            <p className="text-sm leading-6 text-zinc-400">
              {contextObjective}
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
              <EvidenceLine label="Report" value={report ? formatContextValue(report.status) : "Locked"} />
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
      ) : null}
    </>
  );

  if (phase === "INSPECT") {
    return (
      <aside className="h-fit min-w-0">
        <div className="space-y-4">
          <ReviewCheckpointPanel
            activeStep="review"
            criticalTotal={criticalTotal}
            evidenceTitle="Inspection Checks"
            evidenceItems={[
              "Protocol source reviewed",
              "Account relationships inspected",
              "Collateral validation located",
              "Exploit path ready",
            ]}
            showReviewRules={false}
            title="Inspect Checkpoint"
            unlockTitle="Exploit Interface"
            unlockCopy="Move from source review into the protocol attack flow."
            action={
              <button
                type="button"
                onClick={onOpenExploit}
                className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[#14f195]/25 bg-[#14f195]/8 px-4 py-2.5 text-sm font-medium text-[#8fffd0] transition hover:bg-[#14f195]/12 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
              >
                Try Exploit
              </button>
            }
          />
        </div>
      </aside>
    );
  }

  if (phase === "EXECUTE_EXPLOIT" || phase === "VERIFY_IMPACT") {
    return (
      <aside className="h-fit min-w-0">
        <div className="space-y-4">
          {panelContent}
        </div>
      </aside>
    );
  }

  if (isReportContext) {
    return (
      <aside className="h-fit min-w-0">
        <div className="space-y-4">
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

function ExecuteExploitContext({
  impactVerified,
  onOpenReport,
  reportUnlocked,
  txResults,
}: {
  impactVerified: boolean;
  onOpenReport: () => void;
  reportUnlocked: boolean;
  txResults: EnrichedTransactionResult[];
}) {
  const [revealedChainHints, setRevealedChainHints] = useState(0);
  const protocolState = deriveProtocolState(txResults);
  const depositSubmitted = protocolState.hasDeposit;
  const withdrawalSubmitted = protocolState.borrowedAmount > 0;
  const chainHints = [
    "Start by comparing the token account you provide with the vault that receives it.",
    "After deposit, inspect whether position credit changed even though the account path was not canonical.",
    "If credit appears, use the protocol borrow surface and then review whether treasury state changed.",
  ];
  const canRevealMoreHints = revealedChainHints < chainHints.length;
  const revealNextExploitHint = () => {
    const nextHintIndex = revealedChainHints;

    setRevealedChainHints((current) =>
      Math.min(current + 1, chainHints.length)
    );

    if (nextHintIndex === 0) {
      window.setTimeout(startExploitHypothesisTour, 80);
    }
  };

  return (
    <>
      <ExploitCheckpointPanel
        impactVerified={impactVerified}
        onOpenReport={onOpenReport}
        steps={[
          { label: "Hypothesis selected", active: true },
          {
            label: !depositSubmitted
              ? "Deposit not submitted"
              : protocolState.depositKind === "regular"
                ? "Canonical collateral deposited"
                : protocolState.depositKind === "exploit"
                  ? "Non-canonical credit route created"
                  : "Unsupported deposit path observed",
            active: depositSubmitted,
          },
          {
            label: !withdrawalSubmitted
              ? "Borrow not submitted"
              : protocolState.depositKind === "regular"
                ? "Canonical borrow executed"
                : protocolState.hasMaxDrain
                  ? "Treasury drain path executed"
                  : "Borrow executed against observed credit",
            active: withdrawalSubmitted,
          },
          { label: "Impact verified", active: impactVerified },
          { label: "Report unlocked", active: reportUnlocked },
        ]}
      />

      {!impactVerified ? (
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
              onClick={revealNextExploitHint}
              disabled={!canRevealMoreHints}
              className="w-full rounded-xl border border-[#9945ff]/25 bg-[#9945ff]/10 px-4 py-2.5 text-sm font-medium text-[#c7a6ff] transition hover:bg-[#9945ff]/15 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {canRevealMoreHints ? "Reveal next hint" : "All hints revealed"}
            </button>
          </div>
        </ContextBlock>
      ) : null}
    </>
  );
}

function startExploitHypothesisTour() {
  const requiredTargets = [
    "[data-tour='rl1-token-source']",
    "[data-tour='rl1-vault-destination']",
    "[data-tour='rl1-deposit-amount']",
  ];

  if (requiredTargets.some((selector) => !document.querySelector(selector))) {
    return;
  }

  driver({
    allowClose: true,
    animate: true,
    disableActiveInteraction: false,
    doneBtnText: "Done",
    nextBtnText: "Next",
    overlayColor: "#020404",
    overlayOpacity: 0.72,
    popoverClass: "solbreach-driver-popover",
    popoverOffset: 14,
    prevBtnText: "Back",
    showButtons: ["next", "previous", "close"],
    showProgress: true,
    stagePadding: 8,
    stageRadius: 14,
    steps: [
      {
        element: "[data-tour='rl1-token-source']",
        popover: {
          title: "Step 1: Choose token source",
          description: "Start by selecting the token account that will be credited as collateral.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "[data-tour='rl1-vault-destination']",
        popover: {
          title: "Step 2: Choose vault",
          description: "Pick the vault destination. This is where the protocol should validate whether the account path is legitimate.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "[data-tour='rl1-deposit-amount']",
        popover: {
          title: "Step 3: Set deposit amount",
          description: "Submit an amount to observe whether collateral credit and pool liquidity update as expected.",
          side: "right",
          align: "center",
        },
      },
    ],
  }).drive();
}

function ExploitCheckpointPanel({
  impactVerified,
  onOpenReport,
  steps,
}: {
  impactVerified: boolean;
  onOpenReport: () => void;
  steps: Array<{ label: string; active: boolean }>;
}) {
  return (
    <div className="h-fit rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-[#9945ff]" />
        <p className="text-xl font-semibold tracking-[-0.03em] text-white">
          Exploit Checkpoint
        </p>
      </div>

      <div className="mt-5 border-t border-white/10 pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-600">
          Exploit Progress
        </p>
        <div className="mt-4 space-y-3">
          {steps.map((step) => (
            <ExploitCheckpointStep
              key={step.label}
              active={step.active}
              label={step.label}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-600">
          Unlocks Next
        </p>
        <div className="mt-4 flex items-center gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
            impactVerified
              ? "border-[#9945ff]/30 bg-[#9945ff]/12 text-[#d7c0ff]"
              : "border-white/10 bg-white/[0.035] text-zinc-600"
          }`}>
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              Report Finding
            </p>
            <p className="mt-1 text-sm leading-5 text-zinc-500">
              Answer the questions and prepare your first Finding Report
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenReport}
          disabled={!impactVerified}
          className={`mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] ${
            impactVerified
              ? "border border-[#9945ff]/35 bg-[#9945ff]/18 text-[#d7c0ff] shadow-[0_0_24px_rgba(153,69,255,0.18)] hover:bg-[#9945ff]/24"
              : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-zinc-600"
          }`}
        >
          Fill Report
        </button>
      </div>
    </div>
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
}: {
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
}) {
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
      <div>
        <ReviewCheckpointPanel
          activeStep="report"
          criticalTotal={criticalTotal}
          unlockCopy="Audit Report Builder is available now."
        />
        <button
          type="button"
          onClick={onOpenReport}
          className="mt-4 w-full rounded-xl border border-[#9945ff]/30 bg-[#9945ff]/12 px-4 py-2.5 text-sm font-semibold text-[#c7a6ff] transition hover:bg-[#9945ff]/18 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
        >
          {reportOpened ? "Return to Audit Report" : "Build Audit Report"}
        </button>
      </div>
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

  return (
    <ReportCheckpointPanel
      criticalTotal={criticalTotal}
      reviewMode={reviewMode}
      reviewStarted={reviewStarted}
      reviewStepCurrent={reviewStepCurrent}
      reviewStepTotal={reviewStepTotal}
      criticalAnsweredCount={criticalAnsweredCount}
    />
  );
}

function ReportCheckpointPanel({
  criticalAnsweredCount,
  criticalTotal,
  reviewMode,
  reviewStarted,
  reviewStepCurrent,
  reviewStepTotal,
}: {
  criticalAnsweredCount: number;
  criticalTotal: number;
  reviewMode: ReviewMode;
  reviewStarted: boolean;
  reviewStepCurrent: number;
  reviewStepTotal: number;
}) {
  const progressCurrent = reviewStarted ? reviewStepCurrent : 0;
  const progressTotal = Math.max(1, reviewStepTotal);

  return (
    <aside className="h-fit rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-[#9945ff]" />
        <p className="text-xl font-semibold tracking-[-0.03em] text-white">
          Report Checkpoint
        </p>
      </div>

      <div className="mt-5 border-t border-white/10 pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
          Finding Review
        </p>
        <div className="mt-4 space-y-3 text-sm">
          <CheckpointRuleRow
            label="Questions"
            value={`${progressCurrent}/${progressTotal}`}
          />
          <CheckpointRuleRow
            label="Critical answered"
            value={`${criticalAnsweredCount}/${criticalTotal}`}
          />
          <CheckpointRuleRow
            label="Mode"
            value={reviewMode === "retry" ? "Missed only" : "Full review"}
          />
        </div>
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
          Unlocks Next
        </p>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#14f195]/20 bg-[#14f195]/6 text-[#8fffd0]">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              Audit Report Builder
            </p>
            <p className="mt-1 text-sm leading-5 text-zinc-500">
              Available when you confirm this finding.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function CheckpointRuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-400">{label}</span>
      <span className="font-medium text-zinc-100">{value}</span>
    </div>
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

function ExploitCheckpointStep({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${active ? "border-[#14f195]/40 bg-[#14f195]/12 text-[#8fffd0] shadow-[0_0_18px_rgba(20,241,149,0.14)]" : "border-white/10 bg-black/20 text-zinc-700"}`}>
        {active ? <Check className="h-4 w-4" /> : null}
      </span>
      <span className={`text-sm ${active ? "text-zinc-200" : "text-zinc-600"}`}>
        {label}
      </span>
    </div>
  );
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

function formatContextValue(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function abbreviate(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
