"use client";

import { Check, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { rl1FindingQuestionnaire, type QuestionnaireAnswer, type QuestionnaireQuestion, type QuestionnaireResult } from "../../lib/research-labs/rl1-questionnaire";
import type { ResearchLabReport, ResearchLabReportFields } from "../../lib/research-labs/lab-state";
import type { AuditReportPreview, AuditReportStage, ReportMetaFields, ReviewMode } from "./types";
import { AnimatedContentSwitch } from "./workspace-tabs";
import {
  buildAuditReportPreview,
  formatReportValue,
  getFeedbackTopics,
  getIncorrectRequiredQuestionIds,
  getReviewQuestions,
  isQuestionAnswered,
  isReportComplete,
  isRequiredQuestion,
  reportFixOptions,
  reportImpactOptions,
  reportProofOptions,
  reportRootCauseOptions,
  reportTitleOptions,
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
