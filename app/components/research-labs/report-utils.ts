import {
  rl1FindingQuestionnaire,
  type QuestionnaireAnswer,
  type QuestionnaireQuestion,
  type QuestionnaireResult,
} from "../../lib/research-labs/rl1-questionnaire";
import type { QuestionnaireDefinition } from "../../lib/research-labs/rl1-questionnaire";
import type {
  ResearchLabManifest,
  ResearchLabReportFields,
} from "../../lib/research-labs/lab-state";
import type { AuditReportPreview, ReportCodeSnippet, ReviewMode } from "./types";

export type ReportOption = {
  id: string;
  label: string;
  helper?: string;
  previewBody?: string;
  snippet?: ReportCodeSnippet;
};

export type ResearchLabReportConfig = {
  titleOptions: ReportOption[];
  categoryOptions: ReportOption[];
  severityOptions: ReportOption[];
  likelihoodOptions: ReportOption[];
  rootCauseOptions: ReportOption[];
  proofOfImpactOptions: ReportOption[];
  mitigationOptions: ReportOption[];
  suggestedDefaults: Partial<ResearchLabReportFields>;
  labLabel: string;
  moduleLabel: string;
  previewFallback: {
    title: string;
    severity: string;
    likelihood: string;
    category: string;
    categoryBody: string;
  };
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
      startLine: 25,
      endLine: 28,
      code: [
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

const rl1ReportConfig: ResearchLabReportConfig = {
  titleOptions: reportTitleOptions,
  categoryOptions: reportCategoryOptions,
  severityOptions: reportSeverityOptions,
  likelihoodOptions: reportLikelihoodOptions,
  rootCauseOptions: reportRootCauseOptions,
  proofOfImpactOptions: reportProofOfImpactOptions,
  mitigationOptions: reportMitigationOptions,
  suggestedDefaults: suggestedReportFieldDefaults,
  labLabel: "Research Lab 1",
  moduleLabel: "Account Substitution",
  previewFallback: {
    title: "Missing Constraints Allow Counterfeit Credit",
    severity: "High",
    likelihood: "Medium High",
    category: "Account Substitution",
    categoryBody:
      "caller-supplied accounts can bypass canonical vault binding and create borrow credit from a non-approved collateral route.",
  },
};

const rl2ReportConfig: ResearchLabReportConfig = {
  titleOptions: [
    {
      id: "static_staking_position_reward_hijack",
      label: "Static Staking Position PDA Enables Reward Hijacking",
    },
    {
      id: "unscoped_position_overwrites_owner",
      label: "Unscoped Staking Position Allows Owner Overwrite",
    },
  ],
  categoryOptions: [
    {
      id: "static_pda",
      label: "Static PDA",
      previewBody:
        "a user-specific staking position is derived without the user identity, causing multiple participants to resolve to the same mutable account.",
    },
    {
      id: "missing_identity_scope",
      label: "Missing Identity Scope",
      previewBody:
        "the account derivation represents the pool but does not isolate state for each staker.",
    },
  ],
  severityOptions: [
    { id: "high", label: "High" },
    { id: "medium", label: "Medium" },
    { id: "low", label: "Low" },
  ],
  likelihoodOptions: [
    { id: "high", label: "High" },
    { id: "medium_high", label: "Medium High" },
    { id: "medium", label: "Medium" },
  ],
  rootCauseOptions: [
    {
      id: "static_pda_missing_user_seed",
      label: "Staking position PDA omits the user identity",
      previewBody:
        "The protocol derives staking positions using only the static prefix and pool address. Because the user identity is not included in the PDA seeds, multiple participants resolve to the same mutable position account.",
      snippet: {
        title: "Unscoped staking-position derivation",
        language: "rust",
        filePath: "programs/yield_hijack/src/lib.rs",
        code: [
          "#[account(",
          "    seeds = [",
          '        b"stake_position",',
          "        pool.key().as_ref(),",
          "    ],",
          "    bump",
          ")]",
          "pub position: Account<'info, StakePosition>;",
        ].join("\n"),
      },
    },
    {
      id: "position_owner_reassigned_on_stake",
      label: "Existing position ownership is reassigned during staking",
      previewBody:
        "The staking flow mutates the owner on a position that may already contain another participant's principal and pending rewards.",
    },
  ],
  proofOfImpactOptions: [
    {
      id: "position_owner_overwrite_reward_claim",
      label: "Owner overwrite enabled a pre-existing reward claim",
      previewBody:
        "A minimal attacker stake changed ownership of the existing position while preserving its pending rewards. The attacker then claimed 12,500 REWARD, matching the protocol reward-vault decrease.",
    },
    {
      id: "pda_collision_and_reward_delta",
      label: "Position collision and matching reward deltas",
      previewBody:
        "Both participant derivations resolved to the same position, its owner changed after the attacker stake, and the attacker reward gain matched the reward-vault loss.",
    },
  ],
  mitigationOptions: [
    {
      id: "scope_position_pda_by_pool_and_user",
      label: "Scope the position PDA by pool and user",
      previewBody:
        "Derive every staking position from both the pool and the staker public key, then validate the stored owner and pool before any stake or reward mutation.",
      snippet: {
        title: "Identity-scoped staking-position derivation",
        language: "rust",
        filePath: "programs/yield_hijack/src/lib.rs",
        code: [
          "#[account(",
          "    seeds = [",
          '        b"stake_position",',
          "        pool.key().as_ref(),",
          "        user.key().as_ref(),",
          "    ],",
          "    bump",
          ")]",
          "pub position: Account<'info, StakePosition>;",
        ].join("\n"),
      },
    },
    {
      id: "validate_position_identity",
      label: "Validate stored position identity on every mutation",
      previewBody:
        "Require the position owner to match the signer, the stored pool to match the selected pool, and the account bump to match the expected derivation.",
    },
  ],
  suggestedDefaults: {
    titleOptionId: "static_staking_position_reward_hijack",
    categoryOptionId: "static_pda",
    severityOptionId: "high",
    likelihoodOptionId: "high",
    rootCauseOptionId: "static_pda_missing_user_seed",
    proofOfImpactOptionId: "position_owner_overwrite_reward_claim",
    recommendedMitigationOptionId: "scope_position_pda_by_pool_and_user",
  },
  labLabel: "Research Lab 2",
  moduleLabel: "Yield Hijack",
  previewFallback: {
    title: "Static Staking Position PDA Enables Reward Hijacking",
    severity: "High",
    likelihood: "High",
    category: "Static PDA",
    categoryBody:
      "a user-specific staking position is derived without the user identity, allowing multiple participants to resolve to the same mutable account.",
  },
};

export function getResearchLabReportConfig(
  lab: Pick<ResearchLabManifest, "id" | "slug"> | null
) {
  return lab?.slug === "yield-hijack" || lab?.id === "rl2-yield-hijack"
    ? rl2ReportConfig
    : rl1ReportConfig;
}

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

export function getIncorrectRequiredQuestionIds(
  result: QuestionnaireResult,
  questionnaire: QuestionnaireDefinition = rl1FindingQuestionnaire
) {
  const questionMap = new Map(
    questionnaire.questions.map((question) => [question.id, question])
  );

  return result.results
    .filter((item) => {
      const question = questionMap.get(item.questionId);
      return question && isRequiredQuestion(question) && !item.correct;
    })
    .map((item) => item.questionId);
}

export function getReviewQuestions(
  mode: ReviewMode,
  retryQuestionIds: string[],
  questionnaire: QuestionnaireDefinition = rl1FindingQuestionnaire
) {
  if (mode === "retry" && retryQuestionIds.length) {
    const retrySet = new Set(retryQuestionIds);
    return questionnaire.questions.filter((question) =>
      retrySet.has(question.id)
    );
  }

  return questionnaire.questions;
}

export function getFeedbackTopics(
  questionIds: string[],
  questionnaire: QuestionnaireDefinition = rl1FindingQuestionnaire
) {
  const topicBySection: Record<string, string> =
    questionnaire.labId === "rl2-yield-hijack"
      ? {
          "Vulnerability Identification":
            "Recheck which identities the staking position represents and which identities are present in its derivation.",
          "Exploit Path Understanding":
            "Rebuild the sequence from the small stake through the ownership change and unauthorized reward claim.",
          "State and Evidence":
            "Focus on the position collision, preserved value, ownership transition, and matching reward-token deltas.",
          "Severity and Report Reasoning":
            "Tie severity to the unauthorized reward capture proven by the runtime without claiming unverified principal theft.",
        }
      : {
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
          questionnaire.questions.find((question) => question.id === id)
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
  fields: ResearchLabReportFields,
  config: ResearchLabReportConfig = rl1ReportConfig
): AuditReportPreview {
  const title = getOptionLabel(
    config.titleOptions,
    fields.titleOptionId,
    config.previewFallback.title
  );
  const severity = getOptionLabel(
    config.severityOptions,
    fields.severityOptionId,
    config.previewFallback.severity
  );
  const likelihood = getOptionLabel(
    config.likelihoodOptions,
    fields.likelihoodOptionId,
    config.previewFallback.likelihood
  );
  const category = getOptionLabel(
    config.categoryOptions,
    fields.categoryOptionId,
    config.previewFallback.category
  );
  const categoryBody = getOptionBody(
    config.categoryOptions,
    fields.categoryOptionId,
    config.previewFallback.categoryBody
  );

  return {
    title,
    severity,
    likelihood,
    category,
    description: `This audit report documents ${category.toLowerCase()} in ${config.labLabel}, where ${categoryBody}`,
    rootCause: getOptionBody(config.rootCauseOptions, fields.rootCauseOptionId),
    rootCauseSnippet: getOptionSnippet(
      config.rootCauseOptions,
      fields.rootCauseOptionId
    ),
    proofOfImpact: getOptionBody(
      config.proofOfImpactOptions,
      fields.proofOfImpactOptionId
    ),
    evidence:
      fields.verifiedEvidenceRefs.length > 0
        ? `Verified evidence references: ${fields.verifiedEvidenceRefs.join(", ")}`
        : "No verified evidence references recorded.",
    recommendedMitigation: getOptionBody(
      config.mitigationOptions,
      fields.recommendedMitigationOptionId
    ),
    recommendedMitigationSnippet: getOptionSnippet(
      config.mitigationOptions,
      fields.recommendedMitigationOptionId
    ),
  };
}
