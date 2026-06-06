import {
  rl1FindingQuestionnaire,
  type QuestionnaireAnswer,
  type QuestionnaireQuestion,
  type QuestionnaireResult,
} from "../../lib/research-labs/rl1-questionnaire";
import type { ResearchLabReportFields } from "../../lib/research-labs/lab-state";
import type { AuditReportPreview, ReportMetaFields, ReviewMode } from "./types";

export const emptyReportFields: ResearchLabReportFields = {
  vulnerabilityCategory: null,
  affectedArea: null,
  rootCause: "",
  impact: "",
  proof: "",
  recommendedFix: "",
  severity: null,
};

export const defaultReportMetaFields: ReportMetaFields = {
  title: "",
  likelihood: "",
};

export const suggestedReportMetaFields: ReportMetaFields = {
  title:
    "Unchecked Vault Health Arithmetic Allows Collateral Distortion",
  likelihood: "medium_high",
};

export const suggestedReportText = {
  rootCause:
    "The vault health calculation performs unsafe arithmetic before scaling and comparison, allowing overflow or distorted collateral values before the protocol evaluates health.",
  impact:
    "An attacker can distort collateral value and health factor calculations, making an unhealthy or manipulated position appear acceptable to the protocol.",
  proof:
    "The sandbox evidence shows the vulnerable health calculation boundary and passes after the unsafe arithmetic path is replaced with checked arithmetic.",
  recommendedFix:
    "Use checked arithmetic before the health comparison and fail safely when multiplication, division, or scaling would overflow or produce invalid collateral values.",
};

export const reportTitleOptions = [
  suggestedReportMetaFields.title,
  "Arithmetic Safety Failure in Vault Health Calculation",
  "Vault Mirage Health Factor Can Be Distorted Before Validation",
];

export const reportRootCauseOptions = [
  suggestedReportText.rootCause,
  "The protocol calculates vault health with unchecked multiplication or division, so invalid intermediate values can affect the final health comparison.",
  "The health factor path trusts arithmetic output before proving that scaling and bounds checks completed safely.",
];

export const reportImpactOptions = [
  suggestedReportText.impact,
  "A manipulated health factor can make collateral appear safer than it is, weakening liquidation and solvency assumptions.",
  "Distorted collateral accounting can let protocol state accept an invalid vault health result as if it were healthy.",
];

export const reportProofOptions = [
  suggestedReportText.proof,
  "The passing lab evidence demonstrates that replacing unsafe arithmetic with checked operations prevents the distorted health calculation.",
  "The verification path confirms that the issue is the arithmetic trust boundary, not transaction success alone.",
];

export const reportFixOptions = [
  suggestedReportText.recommendedFix,
  "Replace unchecked arithmetic with checked_mul, checked_div, and checked_add style operations before using the value in health decisions.",
  "Reject the instruction when the vault health calculation cannot be completed safely within expected numeric bounds.",
];

export function isRequiredQuestion(question: QuestionnaireQuestion) {
  return question.type !== "free_text_optional";
}

export function getAnswerForQuestion(
  answers: QuestionnaireAnswer[],
  questionId: string
) {
  return answers.find((answer) => answer.questionId === questionId);
}

export function isQuestionAnswered(
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

export function getIncorrectRequiredQuestionIds(result: QuestionnaireResult) {
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

export function getReviewQuestions(mode: ReviewMode, retryQuestionIds: string[]) {
  if (mode === "retry" && retryQuestionIds.length) {
    const retrySet = new Set(retryQuestionIds);
    return rl1FindingQuestionnaire.questions.filter((question) =>
      retrySet.has(question.id)
    );
  }

  return rl1FindingQuestionnaire.questions;
}

export function getFeedbackTopics(questionIds: string[]) {
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

export function isReportComplete(fields: ResearchLabReportFields) {
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

export function formatReportValue(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildAuditReportPreview(
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
