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

const rl3ReportConfig: ResearchLabReportConfig = {
  titleOptions: [
    {
      id: "arbitrary_cpi_target_bounty_drain",
      label: "Unbound CPI Target Drains Bounty Escrow",
    },
    {
      id: "delegated_payout_calls_attacker_program",
      label: "Delegated Payout Invokes Attacker Program",
    },
  ],
  categoryOptions: [
    {
      id: "arbitrary_cpi",
      label: "Arbitrary CPI",
      previewBody:
        "the payout flow allows a caller-controlled CPI target to replace the approved payout router.",
    },
    {
      id: "untrusted_program_target",
      label: "Untrusted Program Target",
      previewBody:
        "the protocol moves value through a program account supplied at execution time instead of trusted configuration.",
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
      id: "unbound_cpi_program_target",
      label: "Delegated CPI target is not bound to config",
      previewBody:
        "The delegated payout instruction accepts the CPI program target from caller-controlled accounts. That lets a compatible attacker program replace the approved payout router when escrowed value is moved.",
      snippet: {
        title: "Unbound delegated payout target",
        language: "rust",
        filePath: "programs/task_bounty/src/lib.rs",
        code: [
          "pub fn execute_delegated_payout(ctx: Context<Payout>) -> Result<()> {",
          "    invoke(",
          "        &ctx.accounts.delegate_program.to_instruction(),",
          "        ctx.remaining_accounts,",
          "    )",
          "}",
        ].join("\n"),
      },
    },
    {
      id: "caller_supplied_program_account",
      label: "Caller-supplied program account",
      previewBody:
        "The payout flow trusts a runtime-supplied program account for a value-moving CPI instead of deriving or checking the approved router.",
    },
  ],
  proofOfImpactOptions: [
    {
      id: "attacker_cpi_drains_task_escrow",
      label: "Attacker CPI drains task escrow",
      previewBody:
        "The verified sandbox evidence shows the attacker program deployed in the session, selected as the delegated CPI target, and the task escrow decrease matching the attacker reward-account increase.",
    },
    {
      id: "cpi_target_replaced_and_balance_delta",
      label: "CPI target replacement with matching balance delta",
      previewBody:
        "The transaction timeline shows the delegated target swap before escrowed bounty value moves to the attacker reward account.",
    },
  ],
  mitigationOptions: [
    {
      id: "bind_cpi_target_to_approved_router",
      label: "Bind CPI target to approved router",
      previewBody:
        "Resolve the payout program from trusted bounty configuration and reject any CPI target that does not match the approved payout router before moving escrowed value.",
      snippet: {
        title: "Validate CPI target before payout",
        language: "rust",
        filePath: "programs/task_bounty/src/lib.rs",
        code: [
          "pub fn execute_delegated_payout(ctx: Context<Payout>) -> Result<()> {",
          "    require_keys_eq!(",
          "        ctx.accounts.delegate_program.key(),",
          "        ctx.accounts.config.approved_payout_router,",
          "    );",
          "",
          "    invoke_signed(",
          "        &router_instruction(ctx)?,",
          "        ctx.accounts.router_accounts(),",
          "        ctx.seeds(),",
          "    )",
          "}",
        ].join("\n"),
      },
    },
    {
      id: "allowlist_value_moving_cpi_targets",
      label: "Allowlist value-moving CPI targets",
      previewBody:
        "Keep payout routing under protocol-owned configuration and validate every invoked program before constructing the CPI.",
    },
  ],
  suggestedDefaults: {
    titleOptionId: "arbitrary_cpi_target_bounty_drain",
    categoryOptionId: "arbitrary_cpi",
    severityOptionId: "high",
    likelihoodOptionId: "high",
    rootCauseOptionId: "unbound_cpi_program_target",
    proofOfImpactOptionId: "attacker_cpi_drains_task_escrow",
    recommendedMitigationOptionId: "bind_cpi_target_to_approved_router",
  },
  labLabel: "Research Lab 3",
  moduleLabel: "Arbitrary CPI",
  previewFallback: {
    title: "Unbound CPI Target Drains Bounty Escrow",
    severity: "High",
    likelihood: "High",
    category: "Arbitrary CPI",
    categoryBody:
      "the payout flow allows a caller-controlled CPI target to replace the approved payout router.",
  },
};

export function getResearchLabReportConfig(
  lab: Pick<ResearchLabManifest, "id" | "slug"> | null
) {
  if (lab?.slug === "arbitrary-cpi" || lab?.id === "rl3-arbitrary-cpi") {
    return rl3ReportConfig;
  }

  if (lab?.slug === "yield-hijack" || lab?.id === "rl2-yield-hijack") {
    return rl2ReportConfig;
  }

  return rl1ReportConfig;
}

export function buildReportDefaultsFromQuestionnaireAnswers(
  answers: QuestionnaireAnswer[],
  config: ResearchLabReportConfig
): Partial<ResearchLabReportFields> {
  const defaults = { ...config.suggestedDefaults };
  const singleAnswers = new Map<string, string>();
  const multiAnswers = new Map<string, string[]>();

  for (const answer of answers) {
    if ("selectedOptionId" in answer) {
      singleAnswers.set(answer.questionId, answer.selectedOptionId);
    }
    if ("selectedOptionIds" in answer) {
      multiAnswers.set(answer.questionId, answer.selectedOptionIds);
    }
  }

  if (config.labLabel === "Research Lab 3") {
    if (singleAnswers.get("q1_vulnerability_category") === "arbitrary_cpi_target") {
      defaults.titleOptionId = "arbitrary_cpi_target_bounty_drain";
      defaults.categoryOptionId = "arbitrary_cpi";
      defaults.rootCauseOptionId = "unbound_cpi_program_target";
    }

    if (
      singleAnswers.get("q3_exploit_sequence") ===
        "build_deploy_delegate_execute_attacker_cpi" ||
      singleAnswers.get("q5_impact") ===
        "task_escrow_drained_to_attacker_reward_account"
    ) {
      defaults.proofOfImpactOptionId = "attacker_cpi_drains_task_escrow";
    }

    if (singleAnswers.get("q7_severity") === "high") {
      defaults.severityOptionId = "high";
      defaults.likelihoodOptionId = "high";
    }

    if (
      singleAnswers.get("q8_recommended_fix") ===
      "bind_cpi_target_to_approved_router"
    ) {
      defaults.recommendedMitigationOptionId =
        "bind_cpi_target_to_approved_router";
    }
  } else if (config.labLabel === "Research Lab 2") {
    if (
      singleAnswers.get("q1_vulnerability_category") ===
      "static_pda_missing_user_identity"
    ) {
      defaults.titleOptionId = "static_staking_position_reward_hijack";
      defaults.categoryOptionId = "static_pda";
      defaults.rootCauseOptionId = "static_pda_missing_user_seed";
    }

    if (
      singleAnswers.get("q3_exploit_sequence") ===
        "existing_rewards_same_pda_stake_overwrite_claim" ||
      singleAnswers.get("q5_impact") === "unauthorized_preexisting_reward_claim"
    ) {
      defaults.proofOfImpactOptionId = "position_owner_overwrite_reward_claim";
    }

    if (singleAnswers.get("q7_severity") === "high") {
      defaults.severityOptionId = "high";
      defaults.likelihoodOptionId = "high";
    }

    if (
      singleAnswers.get("q8_recommended_fix") === "scope_pda_by_pool_and_user"
    ) {
      defaults.recommendedMitigationOptionId =
        "scope_position_pda_by_pool_and_user";
    }
  } else {
    if (singleAnswers.get("q1_vulnerability_category") === "account_substitution") {
      defaults.titleOptionId = "missing_constraints_counterfeit_credit";
      defaults.categoryOptionId = "account_substitution";
    }

    if (
      singleAnswers.get("q3_credit_origin") ===
        "invalid_account_relationship_created_credit" ||
      singleAnswers.get("q4_exploit_sequence") ===
        "invalid_deposit_then_treasury_withdrawal" ||
      singleAnswers.get("q5_treasury_impact") ===
        "real_protocol_value_left_treasury"
    ) {
      defaults.proofOfImpactOptionId = "counterfeit_credit_withdraws_treasury";
      defaults.rootCauseOptionId = "missing_account_binding";
    }

    if (
      singleAnswers.get("q8_recommended_fix") === "bind_accounts_to_approved_config"
    ) {
      defaults.recommendedMitigationOptionId =
        "bind_accounts_to_approved_config";
    }
  }

  const rl2Evidence = multiAnswers.get("q6_evidence") ?? [];
  if (
    config.labLabel === "Research Lab 2" &&
    rl2Evidence.includes("position_pda_collision") &&
    rl2Evidence.includes("owner_changed_after_stake") &&
    rl2Evidence.includes("reward_delta_matches")
  ) {
    defaults.proofOfImpactOptionId = "position_owner_overwrite_reward_claim";
  }

  const rl3Evidence = multiAnswers.get("q6_evidence") ?? [];
  if (
    config.labLabel === "Research Lab 3" &&
    rl3Evidence.includes("attacker_program_deployed") &&
    rl3Evidence.includes("cpi_target_replaced") &&
    rl3Evidence.includes("escrow_delta_matches")
  ) {
    defaults.proofOfImpactOptionId = "attacker_cpi_drains_task_escrow";
  }

  return pruneUnavailableReportDefaults(defaults, config);
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
  const topicBySection: Record<string, string> = (() => {
    if (questionnaire.labId === "rl3-arbitrary-cpi") {
      return {
        "Vulnerability Identification":
          "Recheck which program is invoked through CPI and whether that target is bound to protocol configuration.",
        "Exploit Path Understanding":
          "Rebuild the sequence from attacker program build and deployment through delegation and substituted CPI execution.",
        "State and Evidence":
          "Focus on attacker program deployment, CPI target replacement, task escrow loss, and attacker reward gain.",
        "Severity and Report Reasoning":
          "Tie severity to the escrow drain proven by the runtime without claiming broader platform loss.",
      };
    }

    if (questionnaire.labId === "rl2-yield-hijack") {
      return {
        "Vulnerability Identification":
          "Recheck which identities the staking position represents and which identities are present in its derivation.",
        "Exploit Path Understanding":
          "Rebuild the sequence from the small stake through the ownership change and unauthorized reward claim.",
        "State and Evidence":
          "Focus on the position collision, preserved value, ownership transition, and matching reward-token deltas.",
        "Severity and Report Reasoning":
          "Tie severity to the unauthorized reward capture proven by the runtime without claiming unverified principal theft.",
      };
    }

    return {
      "Vulnerability Identification":
        "Recheck which account relationship the protocol trusted and which Solana account-security concept applies.",
      "Exploit Path Understanding":
        "Rebuild the exploit chain from counterfeit deposit to illegitimate credit and real treasury withdrawal.",
      "State and Evidence":
        "Focus on state evidence, canonical account binding, and why a successful transaction log is not enough.",
      "Severity and Report Reasoning":
        "Tie severity and likelihood to the attacker-controlled account relationship and unauthorized treasury movement.",
    };
  })();

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

function pruneUnavailableReportDefaults(
  defaults: Partial<ResearchLabReportFields>,
  config: ResearchLabReportConfig
) {
  return {
    ...defaults,
    titleOptionId: hasReportOption(config.titleOptions, defaults.titleOptionId)
      ? defaults.titleOptionId
      : null,
    categoryOptionId: hasReportOption(
      config.categoryOptions,
      defaults.categoryOptionId
    )
      ? defaults.categoryOptionId
      : null,
    severityOptionId: hasReportOption(
      config.severityOptions,
      defaults.severityOptionId
    )
      ? defaults.severityOptionId
      : null,
    likelihoodOptionId: hasReportOption(
      config.likelihoodOptions,
      defaults.likelihoodOptionId
    )
      ? defaults.likelihoodOptionId
      : null,
    rootCauseOptionId: hasReportOption(
      config.rootCauseOptions,
      defaults.rootCauseOptionId
    )
      ? defaults.rootCauseOptionId
      : null,
    proofOfImpactOptionId: hasReportOption(
      config.proofOfImpactOptions,
      defaults.proofOfImpactOptionId
    )
      ? defaults.proofOfImpactOptionId
      : null,
    recommendedMitigationOptionId: hasReportOption(
      config.mitigationOptions,
      defaults.recommendedMitigationOptionId
    )
      ? defaults.recommendedMitigationOptionId
      : null,
  };
}

function hasReportOption(
  options: ReportOption[],
  id: string | null | undefined
) {
  return Boolean(id && options.some((option) => option.id === id));
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
