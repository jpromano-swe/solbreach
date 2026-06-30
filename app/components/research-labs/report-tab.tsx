"use client";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { rl1FindingQuestionnaire, type QuestionnaireAnswer, type QuestionnaireQuestion, type QuestionnaireResult } from "../../lib/research-labs/rl1-questionnaire";
import type { ResearchLabReport, ResearchLabReportFields } from "../../lib/research-labs/lab-state";
import type {
  AuditReportPreview,
  AuditReportStage,
  ReportCodeSnippet,
  ReviewMode,
} from "./types";
import { AnimatedContentSwitch } from "./workspace-tabs";
import {
  buildAuditReportPreview,
  getFeedbackTopics,
  getIncorrectRequiredQuestionIds,
  getReviewQuestions,
  isQuestionAnswered,
  isReportComplete,
  isRequiredQuestion,
  reportCategoryOptions,
  reportLikelihoodOptions,
  reportMitigationOptions,
  reportProofOfImpactOptions,
  reportRootCauseOptions,
  reportSeverityOptions,
  reportTitleOptions,
  type ReportOption,
} from "./report-utils";

export function ReportTab({
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
  onChange,
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
      <div className="overflow-auto p-5">
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
      <div className="overflow-auto p-5">
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
      <div className="overflow-auto p-5">
        <div className="w-full">
          <div className="flex py-6">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-[#14f195]">
                <Check className="h-4 w-4" />
                Review passed
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                Audit report unlocked<span className="text-[#9945ff]">.</span>
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-zinc-400">
                Your Finding Review passed. Build the audit report from the confirmed root cause, exploit path, evidence, impact, and mitigation.
              </p>

              <ReportProgressStepper activeStep={3} />

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onOpenFindingReport}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#9945ff]/35 bg-[#9945ff] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#8a35f0] focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
                >
                  Build Audit Report
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowCriticalAnswers((visible) => !visible)}
                  className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
                >
                  {showCriticalAnswers ? "Hide answers" : "View answers"}
                </button>
              </div>

              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400">
                <span>
                  Score <span className="font-mono text-zinc-100">{scoreCopy}</span>
                </span>
                <span>
                  Critical questions{" "}
                  <span className="font-mono text-zinc-100">
                    {criticalTotal - criticalMisses} / {criticalTotal}
                  </span>
                </span>
              </div>

              {showCriticalAnswers ? <CriticalAnswersPanel /> : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-auto p-5">
      <div className="w-full">
        <ReportForm
          expanded
          auditReportStage={auditReportStage}
          fields={fields}
          isSaving={isSaving}
          isSubmitting={isSubmitting}
          report={report}
          onChange={onChange}
          onChangeAuditReportStage={onChangeAuditReportStage}
          onSave={onSave}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}

function ReportProgressStepper({ activeStep }: { activeStep: 2 | 3 }) {
  const steps = [
    { id: 1, label: "Impact verified", state: "complete" as const },
    {
      id: 2,
      label: "Finding Review",
      state: activeStep === 2 ? ("active" as const) : ("complete" as const),
    },
    {
      id: 3,
      label: "Audit Report",
      state: activeStep === 3 ? ("active" as const) : ("pending" as const),
    },
    { id: 4, label: "Certificate", state: "pending" as const },
  ];

  return (
    <div className="mt-8 grid max-w-[620px] grid-cols-4 gap-0">
      {steps.map((step, index) => {
        const isComplete = step.state === "complete";
        const isActive = step.state === "active";

        return (
          <div key={step.id} className="relative min-w-0">
            {index < steps.length - 1 ? (
              <div
                className={`absolute left-[calc(50%+20px)] right-[calc(-50%+20px)] top-5 h-px ${
                  isComplete ? "bg-[#14f195]/70" : "bg-white/14"
                }`}
              />
            ) : null}
            <div className="relative flex flex-col items-center gap-2.5 text-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition ${
                  isComplete
                    ? "border-[#14f195]/60 bg-[#14f195]/12 text-[#8fffd0] shadow-[0_0_24px_rgba(20,241,149,0.28)]"
                    : isActive
                      ? "border-[#9945ff] bg-[#9945ff]/14 text-white shadow-[0_0_28px_rgba(153,69,255,0.34)]"
                      : "border-white/25 bg-black/20 text-zinc-500"
                }`}
              >
                {isComplete ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <span
                className={`text-xs font-semibold leading-4 ${
                  isComplete
                    ? "text-zinc-200"
                    : isActive
                      ? "text-white"
                      : "text-zinc-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ReviewCheckpointPanel({
  activeStep,
  action,
  criticalTotal,
  evidenceItems = [
    "Deposit transaction",
    "Credit delta",
    "Withdraw transaction",
    "Liquidity delta",
  ],
  evidenceTitle = "Verified Evidence",
  showReviewRules = true,
  title = "Review checkpoint",
  unlockTitle = "Audit Report Builder",
  unlockCopy,
}: {
  activeStep: "review" | "report";
  action?: ReactNode;
  criticalTotal: number;
  evidenceItems?: string[];
  evidenceTitle?: string;
  showReviewRules?: boolean;
  title?: string;
  unlockTitle?: string;
  unlockCopy: string;
}) {
  const reportUnlocked = activeStep === "report";

  return (
    <aside className="h-fit rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-[#9945ff]" />
        <p className="text-xl font-semibold tracking-[-0.03em] text-white">
          {title}
        </p>
      </div>

      <div className="mt-5 border-t border-white/10 pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
          {evidenceTitle}
        </p>
        <div className="mt-4 space-y-4">
          {evidenceItems.map((label) => (
            <CheckpointRow key={label} label={label} />
          ))}
        </div>
      </div>

      {showReviewRules ? (
        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
            Review Rules
          </p>
          <div className="mt-4 space-y-3 text-sm">
            <RuleRow label="Passing score" value={String(rl1FindingQuestionnaire.passingScore)} />
            <RuleRow label="Critical questions" value={String(criticalTotal)} />
            <RuleRow label="Retry mode" value="Missed only" />
          </div>
        </div>
      ) : null}

      <div className="mt-6 border-t border-white/10 pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
          Unlocks Next
        </p>
        <div className="mt-4 flex items-center gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
              reportUnlocked
                ? "border-[#14f195]/35 bg-[#14f195]/10 text-[#8fffd0]"
                : "border-[#14f195]/20 bg-[#14f195]/6 text-[#8fffd0]"
            }`}
          >
            {reportUnlocked ? (
              <FileText className="h-5 w-5" />
            ) : (
              <LockKeyhole className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {unlockTitle}
            </p>
            <p className="mt-1 text-sm leading-5 text-zinc-500">
              {unlockCopy}
            </p>
          </div>
        </div>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </aside>
  );
}

function CheckpointRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-zinc-200">
      <CheckCircle2 className="h-5 w-5 text-[#14f195]" />
      <span>{label}</span>
    </div>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-400">{label}</span>
      <span className="font-medium text-zinc-100">{value}</span>
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
        <div className="max-w-3xl py-6">
          <h2 className="text-4xl font-semibold tracking-[-0.045em] text-white md:text-5xl">
            Confirm the finding<span className="text-[#9945ff]">.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">
            Congratulations! Impact has been verified.
          </p>
          <p className="mt-3 max-w-2xl text-base leading-8 text-zinc-400">
            The finding review questionnaire is meant to confirm the root cause, exploit path, evidence, impact, and recommended mitigation to confirm the audit report.
          </p>

          <ReportProgressStepper activeStep={2} />

          <button
            type="button"
            onClick={onStart}
            className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#9945ff]/35 bg-[#9945ff] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#9945ff]/20 transition hover:bg-[#8a35f0] focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
          >
            Start Finding Review
            <ArrowRight className="h-4 w-4" />
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
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
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


function ReportForm({
  auditReportStage,
  report,
  fields,
  isSaving,
  isSubmitting,
  onChange,
  onChangeAuditReportStage,
  onSave,
  onSubmit,
  expanded = false,
}: {
  auditReportStage: AuditReportStage;
  report: ResearchLabReport | null;
  fields: ResearchLabReportFields;
  isSaving: boolean;
  isSubmitting: boolean;
  onChange: (fields: ResearchLabReportFields) => void;
  onChangeAuditReportStage: (stage: AuditReportStage) => void;
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
  const allowedValues = report?.allowedValues ?? {
    titleOptionId: reportTitleOptions.map((option) => option.id),
    categoryOptionId: reportCategoryOptions.map((option) => option.id),
    severityOptionId: reportSeverityOptions.map((option) => option.id),
    likelihoodOptionId: reportLikelihoodOptions.map((option) => option.id),
    rootCauseOptionId: reportRootCauseOptions.map((option) => option.id),
    proofOfImpactOptionId: reportProofOfImpactOptions.map((option) => option.id),
    recommendedMitigationOptionId: reportMitigationOptions.map(
      (option) => option.id
    ),
  };
  const updateFields = (nextFields: ResearchLabReportFields) => {
    setAuditReportPreview(null);
    onChangeAuditReportStage("BUILDER");
    onChange(nextFields);
  };
  const reportComplete = isReportComplete(fields);

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
    const submittedPreview = buildAuditReportPreview(fields);

    return (
      <AuditReportSubmitted
        report={submittedPreview}
        feedback={report?.feedback ?? null}
      />
    );
  }

  if (auditReportStage === "PREVIEW") {
    const preview = auditReportPreview ?? buildAuditReportPreview(fields);

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
              helper="Name the problem and what it caused in one line."
              label="Title"
              options={filterReportOptions(
                reportTitleOptions,
                allowedValues.titleOptionId
              )}
              value={fields.titleOptionId ?? ""}
              onChange={(value) =>
                updateFields({ ...fields, titleOptionId: value || null })
              }
            />
            <ReportChoiceGroup
              disabled={!isEditable}
              helper="Choose the vulnerability family that best describes the issue."
              label="Category"
              options={filterReportOptions(
                reportCategoryOptions,
                allowedValues.categoryOptionId
              )}
              value={fields.categoryOptionId ?? ""}
              onChange={(value) =>
                updateFields({ ...fields, categoryOptionId: value || null })
              }
            />
          </div>
        </section>

        <section className="border-b border-white/10 pb-7">
          <h3 className="text-sm font-semibold text-white">2. Severity & Likelihood</h3>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <ReportSelect
              disabled={!isEditable}
              label="Severity"
              value={fields.severityOptionId ?? ""}
              options={filterReportOptions(
                reportSeverityOptions,
                allowedValues.severityOptionId
              )}
              onChange={(value) =>
                updateFields({ ...fields, severityOptionId: value || null })
              }
            />
            <ReportSelect
              disabled={!isEditable}
              label="Likelihood"
              value={fields.likelihoodOptionId ?? ""}
              options={filterReportOptions(
                reportLikelihoodOptions,
                allowedValues.likelihoodOptionId
              )}
              onChange={(value) =>
                updateFields({ ...fields, likelihoodOptionId: value || null })
              }
            />
          </div>
        </section>

        <ReportChoiceGroup
          disabled={!isEditable}
          helper="Explain the broken assumption or missing check that made the issue possible."
          label="3. Root Cause"
          options={filterReportOptions(
            reportRootCauseOptions,
            allowedValues.rootCauseOptionId
          )}
          value={fields.rootCauseOptionId ?? ""}
          onChange={(value) =>
            updateFields({ ...fields, rootCauseOptionId: value || null })
          }
        />
        <ReportChoiceGroup
          disabled={!isEditable}
          helper="Describe the concrete state change or value movement that proves impact."
          label="4. Proof of Impact"
          options={filterReportOptions(
            reportProofOfImpactOptions,
            allowedValues.proofOfImpactOptionId
          )}
          value={fields.proofOfImpactOptionId ?? ""}
          onChange={(value) =>
            updateFields({ ...fields, proofOfImpactOptionId: value || null })
          }
        />
        <ReportChoiceGroup
          disabled={!isEditable}
          helper="Describe the control or validation that would prevent this class of issue."
          label="5. Recommended Fix"
          options={filterReportOptions(
            reportMitigationOptions,
            allowedValues.recommendedMitigationOptionId
          )}
          value={fields.recommendedMitigationOptionId ?? ""}
          onChange={(value) =>
            updateFields({
              ...fields,
              recommendedMitigationOptionId: value || null,
            })
          }
        />
        <section className="border-b border-white/10 pb-7">
          <h3 className="text-sm font-semibold text-white">6. Verified Evidence</h3>
          <p className="mt-1.5 text-sm leading-6 text-zinc-500">
            These references come from backend-verified evidence after impact review.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {fields.verifiedEvidenceRefs.length ? (
              fields.verifiedEvidenceRefs.map((ref) => (
                <span
                  key={ref}
                  className="rounded-full border border-[#14f195]/20 bg-[#14f195]/8 px-3 py-1 text-xs font-medium text-[#8fffd0]"
                >
                  {ref}
                </span>
              ))
            ) : (
              <span className="text-sm text-zinc-500">
                No verified evidence references recorded yet.
              </span>
            )}
          </div>
          <label className="mt-5 block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600">
              Optional Notes
            </span>
            <textarea
              value={fields.optionalNotes}
              rows={4}
              disabled={!isEditable}
              placeholder="Add concise auditor notes that complement the verified evidence."
              spellCheck
              onChange={(event) =>
                updateFields({ ...fields, optionalNotes: event.target.value })
              }
              className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm leading-6 text-zinc-200 outline-none transition placeholder:text-zinc-700 focus:border-[#9945ff]/45 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
        </section>

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
              setAuditReportPreview(buildAuditReportPreview(fields));
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
  options,
  onChange,
}: {
  disabled: boolean;
  label: string;
  value: string;
  options: ReportOption[];
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
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
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
          <AuditReportSection
            body={report.rootCause}
            snippet={report.rootCauseSnippet}
            title="Root Cause"
          />
          <AuditReportSection title="Proof of Impact" body={report.proofOfImpact} />
          <AuditReportSection title="Evidence" body={report.evidence} />
          <AuditReportSection
            title="Recommended Mitigation"
            body={report.recommendedMitigation}
            snippet={report.recommendedMitigationSnippet}
          />
        </div>
      </article>
    </section>
  );
}

function AuditReportSubmitted({
  feedback,
  report,
}: {
  feedback: string | null;
  report: AuditReportPreview;
}) {
  return (
    <section className="w-full">
      <div className="rounded-2xl border border-[#14f195]/20 bg-[#14f195]/8 p-5">
        <p className="flex items-center gap-2 text-lg font-semibold text-white">
          <Check className="h-5 w-5 text-[#14f195]" />
          Audit Report Submitted
        </p>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          Research Lab 1 completion is recorded. The final audit report has been submitted.
        </p>
        {feedback ? (
          <p className="mt-2 text-sm leading-6 text-[#8fffd0]">{feedback}</p>
        ) : null}
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
          <AuditReportSection
            body={report.rootCause}
            snippet={report.rootCauseSnippet}
            title="Root Cause"
          />
          <AuditReportSection title="Proof of Impact" body={report.proofOfImpact} />
          <AuditReportSection title="Evidence" body={report.evidence} />
          <AuditReportSection
            title="Recommended Mitigation"
            body={report.recommendedMitigation}
            snippet={report.recommendedMitigationSnippet}
          />
        </div>
      </article>
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

function AuditReportSection({
  body,
  snippet,
  title,
}: {
  body: string;
  snippet?: ReportCodeSnippet | null;
  title: string;
}) {
  return (
    <section>
      <h5 className="text-sm font-semibold text-white">{title}</h5>
      <p className="mt-2 text-sm leading-7 text-zinc-300">{body}</p>
      {snippet ? <ReportCodeBlock snippet={snippet} /> : null}
    </section>
  );
}

function ReportCodeBlock({ snippet }: { snippet: ReportCodeSnippet }) {
  const location =
    snippet.filePath && snippet.startLine
      ? `${snippet.filePath}:${snippet.startLine}${
          snippet.endLine ? `-${snippet.endLine}` : ""
        }`
      : snippet.filePath;

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/30">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <div>
          <p className="text-xs font-semibold text-zinc-200">{snippet.title}</p>
          {location ? (
            <p className="mt-0.5 font-mono text-[11px] text-zinc-600">
              {location}
            </p>
          ) : null}
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          {snippet.language}
        </span>
      </div>
      <pre className="max-h-72 overflow-auto p-3 font-mono text-[11px] leading-5 text-zinc-400">
        <code>{snippet.code}</code>
      </pre>
    </div>
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
  options: ReportOption[];
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
          const selected = value === option.id;
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
                type="radio"
                onChange={() => onChange(option.id)}
                className="mt-1 h-4 w-4 accent-[#9945ff]"
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function filterReportOptions(options: ReportOption[], allowedIds: string[]) {
  const allowed = new Set(allowedIds);
  return options.filter((option) => allowed.has(option.id));
}
