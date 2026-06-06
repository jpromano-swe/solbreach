"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  gradeQuestionnaire,
  rl1FindingQuestionnaire,
  type QuestionnaireAnswer,
  type QuestionnaireResult,
} from "../../lib/research-labs/rl1-questionnaire";
import type { ReviewMode } from "./types";
import {
  getAnswerForQuestion,
  getIncorrectRequiredQuestionIds,
  getReviewQuestions,
  isQuestionAnswered,
  isRequiredQuestion,
} from "./report-utils";

type UseFindingReviewOptions = {
  onOpenReportTab: () => void;
  onPopulateReportDefaults: () => void;
  onResetAuditReportStage: () => void;
};

export function useFindingReview({
  onOpenReportTab,
  onPopulateReportDefaults,
  onResetAuditReportStage,
}: UseFindingReviewOptions) {
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<QuestionnaireAnswer[]>([]);
  const [questionnaireResult, setQuestionnaireResult] = useState<QuestionnaireResult | null>(null);
  const [reviewStarted, setReviewStarted] = useState(false);
  const [reviewMode, setReviewMode] = useState<ReviewMode>("full");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [retryQuestionIds, setRetryQuestionIds] = useState<string[]>([]);
  const [reviewAttempts, setReviewAttempts] = useState(0);
  const [reportOpened, setReportOpened] = useState(false);

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

  const resetFindingReview = useCallback(() => {
    setQuestionnaireAnswers([]);
    setQuestionnaireResult(null);
    setReviewStarted(false);
    setReviewMode("full");
    setReviewIndex(0);
    setRetryQuestionIds([]);
    setReviewAttempts(0);
    setReportOpened(false);
    onResetAuditReportStage();
  }, [onResetAuditReportStage]);

  const updateQuestionnaireAnswer = useCallback((answer: QuestionnaireAnswer) => {
    setQuestionnaireResult(null);
    setReportOpened(false);
    setQuestionnaireAnswers((current) => [
      ...current.filter((item) => item.questionId !== answer.questionId),
      answer,
    ]);
  }, []);

  const startFindingReview = useCallback(() => {
    if (reviewStarted && !questionnaireResult) {
      onOpenReportTab();
      return;
    }

    setReviewStarted(true);
    setReportOpened(false);
    onOpenReportTab();

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
  }, [onOpenReportTab, questionnaireResult, retryQuestionIds, reviewStarted]);

  const openFindingReport = useCallback(() => {
    setReportOpened(true);
    onOpenReportTab();
  }, [onOpenReportTab]);

  const submitQuestionnaire = useCallback(() => {
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
      onPopulateReportDefaults();
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
  }, [onPopulateReportDefaults, questionnaireAnswers, visibleReviewQuestions]);

  const retryQuestionnaire = useCallback(() => {
    if (questionnaireResult && !retryQuestionIds.length) {
      setRetryQuestionIds(getIncorrectRequiredQuestionIds(questionnaireResult));
    }
    setReviewStarted(true);
    setReviewMode("retry");
    setReviewIndex(0);
    setReportOpened(false);
    setQuestionnaireResult(null);
    onOpenReportTab();
  }, [onOpenReportTab, questionnaireResult, retryQuestionIds.length]);

  return {
    criticalAnsweredCount,
    criticalTotal: criticalQuestions.length,
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
  };
}
