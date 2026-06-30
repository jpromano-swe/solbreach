"use client";

import { Check, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";

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
  onStartReview,
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
          impactVerified={impactVerified}
          reportUnlocked={reportUnlocked}
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
          onOpenReport={onOpenReport}
          onRetryReview={onRetryReview}
          onStartReview={onStartReview}
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
      <aside className="h-full min-w-0">
        <div className="h-full min-h-0 space-y-4 overflow-auto">
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

  if (phase === "EXECUTE_EXPLOIT") {
    return (
      <aside className="h-full min-w-0">
        <div className="h-full min-h-0 space-y-4 overflow-auto">
          {panelContent}
        </div>
      </aside>
    );
  }

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

function ExecuteExploitContext({
  activeView,
  impactVerified,
  reportUnlocked,
  txResults,
}: {
  activeView: ExecuteExploitView;
  impactVerified: boolean;
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
      <ExploitCheckpointPanel
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

function ExploitCheckpointPanel({
  steps,
}: {
  steps: Array<{ label: string; active: boolean }>;
}) {
  return (
    <div className="h-fit rounded-[28px] border border-white/10 bg-[#0b0c0c]/80 p-5 shadow-2xl shadow-black/25">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-[#9945ff]" />
        <p className="text-2xl font-semibold tracking-[-0.03em] text-zinc-100">
          Exploit Checkpoint
        </p>
      </div>

      <div className="mt-5 border-t border-white/10 pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-600">
          Exploit Progress
        </p>
        <div className="mt-4 space-y-4">
          {steps.map((step) => (
            <ExploitCheckpointStep
              key={step.label}
              active={step.active}
              label={step.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EvidenceReviewContext() {
  return (
    <ContextBlock title="Scope">
      <p className="text-sm leading-6 text-zinc-400">
        Review transaction ordering, runtime evidence, and account state deltas here before deciding whether the backend has enough proof to unlock the finding workflow.
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
        <p className="mt-3 text-sm text-zinc-400">
          Report: Locked until review passed
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          Critical answered: {criticalAnsweredCount}/{criticalTotal}
        </p>
        <button
          type="button"
          onClick={onStartReview}
          className="mt-4 inline-flex min-h-10 items-center justify-center self-start rounded-xl border border-[#9945ff]/30 bg-[#9945ff]/12 px-4 py-2 text-sm font-semibold text-[#c7a6ff] transition hover:bg-[#9945ff]/18"
        >
          Continue Review
        </button>
      </div>
    );
  }

  return (
    <ReviewCheckpointPanel
      activeStep="review"
      criticalTotal={criticalTotal}
      unlockCopy="Available when you confirm this finding."
    />
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
    <div className="flex items-center gap-4">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${active ? "border-[#14f195]/40 bg-[#14f195]/12 text-[#8fffd0] shadow-[0_0_22px_rgba(20,241,149,0.16)]" : "border-white/10 bg-black/20 text-zinc-700"}`}>
        {active ? <Check className="h-[18px] w-[18px]" /> : null}
      </span>
      <span className={`text-base ${active ? "text-zinc-200" : "text-zinc-600"}`}>
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
