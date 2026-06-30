import {
  rl1FindingQuestionnaire,
  type QuestionnaireAnswer,
  type QuestionnaireQuestion,
  type QuestionnaireResult,
} from "../../lib/research-labs/rl1-questionnaire";
import type { ResearchLabReportFields } from "../../lib/research-labs/lab-state";
import type { AuditReportPreview, ReportCodeSnippet, ReviewMode } from "./types";

export type ReportOption = {
  id: string;
  label: string;
  helper?: string;
  previewBody?: string;
  snippet?: ReportCodeSnippet;
};

export const reportTitleOptions: ReportOption[] = [
  {
    id: "missing_constraints_counterfeit_credit",
    label: "Missing Constraints Allow Counterfeit Credit",
  },
  {
    id: "account_substitution_illegitimate_credit",
    label: "Account Substitution Creates Illegitimate Borrow Credit",
  },
  {
    id: "non_canonical_deposit_treasury_withdrawal",
    label: "Non-Canonical Deposit Path Enables Treasury Withdrawal",
  },
];

export const reportCategoryOptions: ReportOption[] = [
  {
    id: "account_substitution",
    label: "Account Substitution",
    previewBody:
      "caller-supplied accounts can bypass canonical vault binding and create borrow credit from a non-approved collateral route.",
  },
  {
    id: "missing_validation",
    label: "Missing Validation",
    previewBody:
      "the protocol accepts a caller-controlled account relationship without proving it matches the approved market configuration.",
  },
];

export const reportSeverityOptions: ReportOption[] = [
  { id: "high_treasury_loss", label: "High Treasury Loss" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

export const reportLikelihoodOptions: ReportOption[] = [
  { id: "medium_high_attacker_supplied_accounts", label: "Medium High" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

export const reportRootCauseOptions: ReportOption[] = [
  {
    id: "missing_account_binding",
    label: "Missing account binding",
    previewBody:
      "The deposit instruction accepts caller-supplied token and vault accounts without proving that they belong to the canonical collateral configuration. That missing account binding lets a non-approved route generate credit as if it were backed by real protocol collateral.",
    snippet: {
      title: "Vulnerable deposit path",
      language: "rust",
      filePath: "programs/treasury_mirage/src/lib.rs",
      startLine: 23,
      endLine: 28,
      code: [
        "// Vulnerable: this function trusts the caller-supplied collateral account amount",
        "// without proving that the token account mint equals ACCEPTED_COLLATERAL_MINT.",
        "pub fn deposit_collateral(position: &mut Position, collateral: &TokenAccount) {",
        "    position.credited_collateral = position",
        "        .credited_collateral",
        "        .saturating_add(collateral.amount);",
        "}",
      ].join("\n"),
    },
  },
  {
    id: "caller_controlled_vault_route",
    label: "Caller-controlled vault route",
    previewBody:
      "The program trusts the caller to supply a matching token source and vault without checking that both accounts belong to the approved collateral route.",
  },
  {
    id: "unbound_credit_assignment",
    label: "Unbound credit assignment",
    previewBody:
      "Credit assignment depends on account shape and instruction success, but the protocol never binds the provided accounts back to canonical market custody.",
  },
];

export const reportProofOfImpactOptions: ReportOption[] = [
  {
    id: "counterfeit_credit_withdraws_treasury",
    label: "Counterfeit credit withdrew treasury liquidity",
    previewBody:
      "The verified sandbox evidence shows a non-canonical deposit path changing position credit before a borrow action reduces treasury liquidity.",
  },
  {
    id: "non_canonical_path_position_credit",
    label: "Non-canonical path changed position credit",
    previewBody:
      "The transaction timeline shows the deposit path using a non-canonical account route before the borrow action changes treasury balance.",
  },
  {
    id: "backend_verified_trust_boundary_crossed",
    label: "Backend verified trust-boundary failure",
    previewBody:
      "Backend verification confirms that account substitution, not transaction success alone, crossed the trust boundary and enabled the withdrawal.",
  },
];

export const reportMitigationOptions: ReportOption[] = [
  {
    id: "bind_accounts_to_approved_config",
    label: "Bind accounts to approved config",
    previewBody:
      "Bind the provided token source and vault accounts to the approved market configuration before assigning credit, and reject any account path that is not canonical for the market.",
    snippet: {
      title: "Validate collateral before assigning credit",
      language: "rust",
      filePath: "programs/treasury_mirage/src/lib.rs",
      code: [
        "pub fn deposit_collateral(",
        "    position: &mut Position,",
        "    collateral: &TokenAccount,",
        ") -> Result<(), VaultError> {",
        "    if collateral.mint != ACCEPTED_COLLATERAL_MINT {",
        "        return Err(VaultError::InvalidCollateralMint);",
        "    }",
        "",
        "    position.credited_collateral = position",
        "        .credited_collateral",
        "        .checked_add(collateral.amount)",
        "        .ok_or(VaultError::MathOverflow)?;",
        "",
        "    Ok(())",
        "}",
      ].join("\n"),
    },
  },
  {
    id: "resolve_market_accounts_before_credit",
    label: "Resolve canonical accounts before credit",
    previewBody:
      "Resolve the approved vault and collateral configuration from market state, then compare every caller-supplied account against those canonical addresses before credit is assigned.",
  },
  {
    id: "reject_caller_controlled_custody",
    label: "Reject caller-controlled custody paths",
    previewBody:
      "Reject deposits when the token source, vault, or custody relationship is caller-controlled instead of program-approved.",
  },
];

export const emptyReportFields: ResearchLabReportFields = {
  titleOptionId: null,
  categoryOptionId: null,
  severityOptionId: null,
  likelihoodOptionId: null,
  rootCauseOptionId: null,
  proofOfImpactOptionId: null,
  recommendedMitigationOptionId: null,
  verifiedEvidenceRefs: [],
  optionalNotes: "",
};

export const suggestedReportFieldDefaults: Partial<ResearchLabReportFields> = {
  titleOptionId: "missing_constraints_counterfeit_credit",
  categoryOptionId: "account_substitution",
  severityOptionId: "high_treasury_loss",
  likelihoodOptionId: "medium_high_attacker_supplied_accounts",
  rootCauseOptionId: "missing_account_binding",
  proofOfImpactOptionId: "counterfeit_credit_withdraws_treasury",
  recommendedMitigationOptionId: "bind_accounts_to_approved_config",
};

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
    fields.titleOptionId &&
      fields.categoryOptionId &&
      fields.severityOptionId &&
      fields.likelihoodOptionId &&
      fields.rootCauseOptionId &&
      fields.proofOfImpactOptionId &&
      fields.recommendedMitigationOptionId &&
      fields.verifiedEvidenceRefs.length > 0
  );
}

export function formatReportValue(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getOptionLabel(
  options: ReportOption[],
  id: string | null | undefined,
  fallback = "Unavailable"
) {
  if (!id) return fallback;
  return options.find((option) => option.id === id)?.label ?? formatReportValue(id);
}

export function getOptionBody(
  options: ReportOption[],
  id: string | null | undefined,
  fallback = ""
) {
  if (!id) return fallback;
  return options.find((option) => option.id === id)?.previewBody ?? fallback;
}

export function getOptionSnippet(
  options: ReportOption[],
  id: string | null | undefined
) {
  if (!id) return null;
  return options.find((option) => option.id === id)?.snippet ?? null;
}

export function buildAuditReportPreview(
  fields: ResearchLabReportFields
): AuditReportPreview {
  const title = getOptionLabel(
    reportTitleOptions,
    fields.titleOptionId,
    "Missing Constraints Allow Counterfeit Credit"
  );
  const severity = getOptionLabel(
    reportSeverityOptions,
    fields.severityOptionId,
    "High"
  );
  const likelihood = getOptionLabel(
    reportLikelihoodOptions,
    fields.likelihoodOptionId,
    "Medium High"
  );
  const category = getOptionLabel(
    reportCategoryOptions,
    fields.categoryOptionId,
    "Account Substitution"
  );
  const categoryBody = getOptionBody(
    reportCategoryOptions,
    fields.categoryOptionId,
    "caller-supplied accounts can bypass canonical vault binding and create borrow credit from a non-approved collateral route."
  );

  return {
    title,
    severity,
    likelihood,
    category,
    description: `This audit report documents ${category.toLowerCase()} in Research Lab 1, where ${categoryBody}`,
    rootCause: getOptionBody(reportRootCauseOptions, fields.rootCauseOptionId),
    rootCauseSnippet: getOptionSnippet(
      reportRootCauseOptions,
      fields.rootCauseOptionId
    ),
    proofOfImpact: getOptionBody(
      reportProofOfImpactOptions,
      fields.proofOfImpactOptionId
    ),
    evidence:
      fields.verifiedEvidenceRefs.length > 0
        ? `Verified evidence references: ${fields.verifiedEvidenceRefs.join(", ")}`
        : "No verified evidence references recorded.",
    recommendedMitigation: getOptionBody(
      reportMitigationOptions,
      fields.recommendedMitigationOptionId
    ),
    recommendedMitigationSnippet: getOptionSnippet(
      reportMitigationOptions,
      fields.recommendedMitigationOptionId
    ),
  };
}
