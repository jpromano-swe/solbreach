"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  gradeQuestionnaire,
  rl1FindingQuestionnaire,
  type QuestionnaireAnswer,
  type QuestionnaireQuestion,
  type QuestionnaireResult,
} from "../../lib/research-labs/rl1-questionnaire";
import type { Level1AuthSession } from "../../lib/levels/level1-backend";
import {
  submitResearchLabFindingReview,
  type ResearchLabReport,
  type ResearchLabSession,
} from "../../lib/research-labs/lab-state";
import type { ReviewMode } from "./types";
import {
  getAnswerForQuestion,
  getIncorrectRequiredQuestionIds,
  getReviewQuestions,
  isQuestionAnswered,
  isRequiredQuestion,
} from "./report-utils";

type UseFindingReviewOptions = {
  getAuth: () => Promise<Level1AuthSession>;
  loadReport: (
    auth: Level1AuthSession,
    currentSession: ResearchLabSession
  ) => Promise<ResearchLabReport>;
  onOpenReportTab: () => void;
  onSessionChange: (session: ResearchLabSession) => void;
  onPopulateReportDefaults: () => void;
  onResetAuditReportStage: () => void;
  session: ResearchLabSession | null;
};

export function useFindingReview({
  getAuth,
  loadReport,
  onOpenReportTab,
  onSessionChange,
  onPopulateReportDefaults,
  onResetAuditReportStage,
  session,
}: UseFindingReviewOptions) {
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<QuestionnaireAnswer[]>([]);
  const [questionnaireResult, setQuestionnaireResult] = useState<QuestionnaireResult | null>(null);
  const [reviewStarted, setReviewStarted] = useState(false);
  const [reviewMode, setReviewMode] = useState<ReviewMode>("full");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [retryQuestionIds, setRetryQuestionIds] = useState<string[]>([]);
  const [reviewAttempts, setReviewAttempts] = useState(0);
  const [reportOpened, setReportOpened] = useState(false);
  const [reviewQuestionOrder, setReviewQuestionOrder] = useState<string[]>([]);
  const [reviewOptionOrder, setReviewOptionOrder] = useState<Record<string, string[]>>({});
  const resetReviewShuffle = useCallback((questions: QuestionnaireQuestion[]) => {
    setReviewQuestionOrder(shuffleItems(questions.map((question) => question.id)));
    setReviewOptionOrder(buildOptionOrder(questions));
  }, []);

  const baseReviewQuestions = useMemo(
    () => getReviewQuestions(reviewMode, retryQuestionIds),
    [reviewMode, retryQuestionIds]
  );
  const visibleReviewQuestions = useMemo(
    () => orderQuestionsById(baseReviewQuestions, reviewQuestionOrder),
    [baseReviewQuestions, reviewQuestionOrder]
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
    setReviewQuestionOrder([]);
    setReviewOptionOrder({});
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

    let nextMode: ReviewMode = "full";
    let nextRetryIds: string[] = [];
    if (questionnaireResult && !questionnaireResult.passed) {
      nextRetryIds = retryQuestionIds.length
        ? retryQuestionIds
        : getIncorrectRequiredQuestionIds(questionnaireResult);
      setRetryQuestionIds(nextRetryIds);
      nextMode = "retry";
    } else {
      setRetryQuestionIds([]);
    }

    setReviewMode(nextMode);
    resetReviewShuffle(getReviewQuestions(nextMode, nextRetryIds));
    setReviewIndex(0);
    if (!questionnaireResult?.passed) {
      setQuestionnaireResult(null);
    }
  }, [onOpenReportTab, questionnaireResult, resetReviewShuffle, retryQuestionIds, reviewStarted]);

  const openFindingReport = useCallback(() => {
    setReportOpened(true);
    onOpenReportTab();
  }, [onOpenReportTab]);

  const submitQuestionnaire = useCallback(async () => {
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

    if (!session) {
      toast.error("Open an active Research Lab session before submitting the review.");
      return;
    }

    const result = gradeQuestionnaire(
      rl1FindingQuestionnaire,
      questionnaireAnswers
    );
    const auth = await getAuth();
    const backendAnswers = serializeQuestionnaireAnswers(questionnaireAnswers);

    try {
      const review = await submitResearchLabFindingReview({
        accessToken: auth.accessToken,
        answers: backendAnswers,
        sessionId: session.sessionId,
      });
      const incorrectIds =
        review.failedQuestionIds ??
        review.failed_question_ids ??
        getIncorrectRequiredQuestionIds(result);
      const attempts =
        review.findingReviewAttempts ??
        review.finding_review_attempts ??
        reviewAttempts + 1;
      const passed = Boolean(
        review.findingReviewPassed ?? review.finding_review_passed
      );

      setQuestionnaireResult(result);
      setRetryQuestionIds(incorrectIds);
      setReviewAttempts(attempts);

      const nextSession = {
        ...session,
        certificateUnlockable:
          review.certificateUnlockable ??
          review.certificate_unlockable ??
          session.certificateUnlockable,
        findingReviewPassed: passed,
        reportUnlocked:
          review.reportUnlocked ??
          review.report_unlocked ??
          session.reportUnlocked,
      };
      onSessionChange(nextSession);

      if (passed) {
        await loadReport(auth, nextSession);
        onPopulateReportDefaults();
        setReviewMode("full");
        setReviewIndex(0);
        setReportOpened(false);
        toast.success(
          review.feedback ?? "Finding review passed. Final report unlocked."
        );
        return;
      }

      setReviewMode("retry");
      resetReviewShuffle(getReviewQuestions("retry", incorrectIds));
      setReviewIndex(0);
      setReportOpened(false);
      toast.error("Finding review needs revision", {
        description:
          review.feedback ?? "Retry only the missed required questions.",
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [
    getAuth,
    loadReport,
    onPopulateReportDefaults,
    onSessionChange,
    questionnaireAnswers,
    reviewAttempts,
    resetReviewShuffle,
    session,
    visibleReviewQuestions,
  ]);

  const retryQuestionnaire = useCallback(() => {
    const nextRetryIds =
      questionnaireResult && !retryQuestionIds.length
        ? getIncorrectRequiredQuestionIds(questionnaireResult)
        : retryQuestionIds;

    if (questionnaireResult && !retryQuestionIds.length) {
      setRetryQuestionIds(nextRetryIds);
    }
    setReviewStarted(true);
    setReviewMode("retry");
    resetReviewShuffle(getReviewQuestions("retry", nextRetryIds));
    setReviewIndex(0);
    setReportOpened(false);
    setQuestionnaireResult(null);
    onOpenReportTab();
  }, [onOpenReportTab, questionnaireResult, resetReviewShuffle, retryQuestionIds]);

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
    reviewOptionOrder,
    visibleReviewQuestions,
    reviewStarted,
    reviewStepCurrent,
    reviewStepTotal,
    setReviewIndex,
    startFindingReview,
    submitQuestionnaire,
    updateQuestionnaireAnswer,
  };
}

function buildOptionOrder(questions: QuestionnaireQuestion[]) {
  return Object.fromEntries(
    questions.map((question) => [
      question.id,
      question.options
        ? shuffleOptionIds(question)
        : [],
    ])
  );
}

function shuffleOptionIds(question: QuestionnaireQuestion) {
  const optionIds = shuffleItems(question.options?.map((option) => option.id) ?? []);
  if (
    question.correctOptionId &&
    optionIds.length > 1 &&
    optionIds[0] === question.correctOptionId
  ) {
    const replacementIndex = optionIds.findIndex(
      (optionId, index) => index > 0 && optionId !== question.correctOptionId
    );
    if (replacementIndex > 0) {
      [optionIds[0], optionIds[replacementIndex]] = [
        optionIds[replacementIndex],
        optionIds[0],
      ];
    }
  }

  return optionIds;
}

function orderQuestionsById(
  questions: QuestionnaireQuestion[],
  order: string[]
) {
  if (!order.length) return questions;

  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const orderedQuestions = order
    .map((questionId) => questionsById.get(questionId))
    .filter((question): question is QuestionnaireQuestion => Boolean(question));
  const orderedIds = new Set(order);
  const missingQuestions = questions.filter((question) => !orderedIds.has(question.id));

  return [...orderedQuestions, ...missingQuestions];
}

function shuffleItems<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

function serializeQuestionnaireAnswers(answers: QuestionnaireAnswer[]) {
  return Object.fromEntries(
    answers.flatMap((answer) => {
      if ("selectedOptionId" in answer) {
        return [[answer.questionId, answer.selectedOptionId]];
      }
      if ("selectedOptionIds" in answer) {
        return [[answer.questionId, [...answer.selectedOptionIds].sort().join(",")]];
      }
      return [];
    })
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "Finding review request failed.";
  }
}
