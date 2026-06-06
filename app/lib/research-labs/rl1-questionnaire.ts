export type QuestionType =
  | "single_choice"
  | "multi_select"
  | "free_text_optional";

export type QuestionnaireOption = {
  id: string;
  label: string;
};

export type QuestionnaireQuestion = {
  id: string;
  section: string;
  type: QuestionType;
  prompt: string;
  points: number;
  critical?: boolean;
  options?: QuestionnaireOption[];
  correctOptionId?: string;
  correctOptionIds?: string[];
  explanation: string;
};

export type QuestionnaireAnswer =
  | {
      questionId: string;
      selectedOptionId: string;
    }
  | {
      questionId: string;
      selectedOptionIds: string[];
    }
  | {
      questionId: string;
      text: string;
    };

export type QuestionnaireResult = {
  score: number;
  totalPoints: number;
  passed: boolean;
  failedCriticalQuestions: string[];
  results: Array<{
    questionId: string;
    correct: boolean;
    pointsEarned: number;
  }>;
};

export const rl1FindingQuestionnaire = {
  id: "rl1-treasury-mirage-finding-questionnaire",
  labId: "research-lab-1-treasury-mirage",
  title: "Finding Review",
  passingScore: 80,
  totalPoints: 100,
  requireCriticalCorrect: true,
  questions: [
    {
      id: "q1_vulnerability_category",
      section: "Vulnerability Identification",
      type: "single_choice",
      prompt: "What is the primary vulnerability demonstrated in this Research Lab?",
      points: 15,
      critical: true,
      options: [
        {
          id: "oracle_price_manipulation",
          label: "Oracle price abuse inflates accepted collateral value",
        },
        {
          id: "failure_to_bind_accounts",
          label: "Missing account binding for supplied vault and collateral",
        },
        {
          id: "integer_overflow",
          label: "Withdrawal math overflow creates excess account credit",
        },
        {
          id: "arbitrary_cpi",
          label: "Arbitrary CPI path reaches attacker-controlled program",
        },
      ],
      correctOptionId: "failure_to_bind_accounts",
      explanation:
        "The exploit works because the protocol accepts caller-supplied token account relationships without proving that they match the approved collateral configuration.",
    },
    {
      id: "q2_attack_vector_name",
      section: "Vulnerability Identification",
      type: "single_choice",
      prompt: "Which common Solana security concept best describes the root issue?",
      points: 10,
      options: [
        {
          id: "account_substitution",
          label: "Account substitution from missing account constraint",
        },
        {
          id: "reentrancy",
          label: "Reentrancy through repeated callback-style execution",
        },
        {
          id: "signature_malleability",
          label: "Signature malleability in transaction authorization",
        },
        {
          id: "compute_budget_exhaustion",
          label: "Compute budget exhaustion during instruction routing",
        },
      ],
      correctOptionId: "account_substitution",
      explanation:
        "The attacker substitutes accounts that satisfy part of the instruction flow but are not the canonical accounts the protocol should trust.",
    },
    {
      id: "q3_incorrect_trust",
      section: "Vulnerability Identification",
      type: "multi_select",
      prompt: "What did the vulnerable deposit flow trust incorrectly?",
      points: 10,
      options: [
        {
          id: "caller_collateral_source",
          label: "Caller-provided collateral source token account",
        },
        {
          id: "caller_vault_destination",
          label: "Caller-provided destination vault token account",
        },
        {
          id: "current_slot",
          label: "Current Solana slot recorded during instruction flow",
        },
        {
          id: "collateral_credit_relationship",
          label: "Collateral-to-credit relationship used for accounting",
        },
        {
          id: "wallet_ui_theme",
          label: "Wallet adapter theme selected during reviewed action",
        },
      ],
      correctOptionIds: [
        "caller_collateral_source",
        "caller_vault_destination",
        "collateral_credit_relationship",
      ],
      explanation:
        "The vulnerable flow trusted caller-supplied token accounts and credited the position without proving the source and destination matched the approved protocol configuration.",
    },
    {
      id: "q4_exploit_sequence",
      section: "Exploit Path Understanding",
      type: "single_choice",
      prompt: "Which sequence best describes the exploit path?",
      points: 15,
      critical: true,
      options: [
        {
          id: "oracle_inflate_liquidate",
          label: "Oracle manipulation inflates collateral, then liquidates users",
        },
        {
          id: "counterfeit_deposit_then_withdraw",
          label: "Counterfeit deposit creates credit, then withdraws treasury",
        },
        {
          id: "arbitrary_cpi_steal_signer",
          label: "Attacker CPI steals signer rights, then closes the vault",
        },
        {
          id: "overflow_bypass_rent",
          label: "Amount overflow bypasses checks, then mints reward NFTs",
        },
      ],
      correctOptionId: "counterfeit_deposit_then_withdraw",
      explanation:
        "The exploit requires creating invalid credit from an unapproved collateral relationship, then withdrawing legitimate treasury value using that credit.",
    },
    {
      id: "q5_counterfeit_deposit_success",
      section: "Exploit Path Understanding",
      type: "single_choice",
      prompt: "Why could the counterfeit deposit transaction succeed?",
      points: 10,
      options: [
        {
          id: "fake_source_and_fake_vault_same_mint",
          label: "Fake source and fake vault shared one counterfeit mint",
        },
        {
          id: "spl_allows_any_mint",
          label: "SPL Token accepted different mints for the transfer",
        },
        {
          id: "disabled_spl_validation",
          label: "Attacker disabled SPL mint checks inside token code",
        },
        {
          id: "sol_direct_deposit",
          label: "Treasury accepted direct SOL payment from attacker",
        },
      ],
      correctOptionId: "fake_source_and_fake_vault_same_mint",
      explanation:
        "The SPL transfer can succeed if the source and destination token accounts use the same mint. The protocol bug is that it grants legitimate credit without proving that this mint is the approved collateral mint.",
    },
    {
      id: "q6_impact_proven",
      section: "Exploit Path Understanding",
      type: "single_choice",
      prompt: "At what point is the vulnerability impact proven?",
      points: 10,
      critical: true,
      options: [
        {
          id: "code_opened",
          label: "Opening the vulnerable code file confirms treasury loss",
        },
        {
          id: "any_deposit_success",
          label: "Any successful deposit transaction confirms full impact",
        },
        {
          id: "counterfeit_credit_withdraws_treasury",
          label: "Counterfeit credit is spent to withdraw real treasury value",
        },
        {
          id: "success_log_only",
          label: "Any log line showing success confirms treasury movement",
        },
      ],
      correctOptionId: "counterfeit_credit_withdraws_treasury",
      explanation:
        "A successful transaction alone does not prove impact. Impact is proven when illegitimate credit causes unauthorized treasury value movement.",
    },
    {
      id: "q7_supporting_evidence",
      section: "State and Evidence",
      type: "multi_select",
      prompt: "Which evidence best supports the finding?",
      points: 10,
      options: [
        {
          id: "unapproved_collateral_source",
          label: "Deposit source was outside approved collateral config",
        },
        {
          id: "noncanonical_vault_destination",
          label: "Destination vault was not the canonical protocol vault",
        },
        {
          id: "position_credit_increased",
          label: "Position credit increased after counterfeit deposit",
        },
        {
          id: "treasury_balance_decreased",
          label: "Treasury balance decreased after withdrawal action",
        },
        {
          id: "dark_mode",
          label: "Page interface used dark mode during reviewed action",
        },
      ],
      correctOptionIds: [
        "unapproved_collateral_source",
        "noncanonical_vault_destination",
        "position_credit_increased",
        "treasury_balance_decreased",
      ],
      explanation:
        "The report should connect account substitution, invalid credit assignment, and final treasury impact.",
    },
    {
      id: "q8_recommended_fix",
      section: "State and Evidence",
      type: "single_choice",
      prompt: "Which remediation best addresses the vulnerability?",
      points: 15,
      critical: true,
      options: [
        {
          id: "increase_compute_budget",
          label: "Increase compute budget before token transfer routing",
        },
        {
          id: "bind_accounts_to_approved_config",
          label: "Bind source and vault to approved mint and canonical vault",
        },
        {
          id: "hide_frontend_button",
          label: "Hide the deposit button until the UI validates accounts",
        },
        {
          id: "larger_collateral_amount",
          label: "Require larger collateral deposits before crediting flow",
        },
      ],
      correctOptionId: "bind_accounts_to_approved_config",
      explanation:
        "The protocol must verify account relationships before assigning credit. This can include approved mint checks, canonical vault checks, PDA constraints, and ownership/authority validation.",
    },
    {
      id: "q9_not_proof",
      section: "State and Evidence",
      type: "single_choice",
      prompt: "Which item alone is not sufficient proof that the vulnerability was exploited?",
      points: 5,
      options: [
        {
          id: "successful_log_alone",
          label: "A successful deposit transaction log by itself",
        },
        {
          id: "counterfeit_credit_assignment",
          label: "Counterfeit deposit followed by invalid credit",
        },
        {
          id: "invalid_credit_withdrawal",
          label: "Treasury withdrawal caused by invalid account credit",
        },
        {
          id: "noncanonical_vault_evidence",
          label: "Evidence that the vault destination was non-canonical",
        },
      ],
      correctOptionId: "successful_log_alone",
      explanation:
        "A transaction can succeed without proving unauthorized impact. The finding needs state evidence and exploit provenance.",
    },
    {
      id: "q10_severity",
      section: "Severity and Report Reasoning",
      type: "single_choice",
      prompt: "What severity best fits this finding in the simulated protocol?",
      points: 5,
      options: [
        {
          id: "informational_no_impact",
          label: "Informational - no funds or protocol state affected",
        },
        {
          id: "low_ui_only",
          label: "Low - only interface display values are affected",
        },
        {
          id: "high_treasury_loss",
          label: "High - invalid credit can withdraw treasury value",
        },
        {
          id: "none_expected_behavior",
          label: "None - expected behavior with no protocol issue found",
        },
      ],
      correctOptionId: "high_treasury_loss",
      explanation:
        "Because the exploit can lead to unauthorized treasury withdrawal, High severity is appropriate in this simulated environment.",
    },
    {
      id: "q11_likelihood",
      section: "Severity and Report Reasoning",
      type: "single_choice",
      prompt:
        "Assuming an attacker can freely choose instruction accounts, what is the most reasonable likelihood rating?",
      points: 5,
      options: [
        {
          id: "low_break_spl",
          label: "Low, because the attack requires breaking SPL Token",
        },
        {
          id: "medium_high_attacker_supplied_accounts",
          label: "Medium to High, using attacker-supplied account links",
        },
        {
          id: "impossible_anchor_prevents_all",
          label: "Impossible, because Anchor blocks all substitutions",
        },
        {
          id: "informational_no_transaction",
          label: "Informational, because no transaction is required",
        },
      ],
      correctOptionId: "medium_high_attacker_supplied_accounts",
      explanation:
        "The exploit does not require breaking SPL Token. It abuses missing validation in the vulnerable protocol's account constraints.",
    },
    {
      id: "q12_best_title",
      section: "Severity and Report Reasoning",
      type: "single_choice",
      prompt: "Which title best describes the finding?",
      points: 5,
      options: [
        {
          id: "missing_constraints_counterfeit_credit",
          label: "Missing Constraints Create Withdrawable Fake Credit",
        },
        {
          id: "button_click_too_fast",
          label: "Deposit Button Allows Repeated Fast Submission",
        },
        {
          id: "compute_budget_low",
          label: "Compute Budget Too Low During Vault Deposit Flow",
        },
        {
          id: "oracle_rounding_liquidation",
          label: "Oracle Rounding Error Allows Bad Liquidation Flow",
        },
      ],
      correctOptionId: "missing_constraints_counterfeit_credit",
      explanation:
        "A good finding title should clearly identify the vulnerable condition and the impact.",
    },
    {
      id: "q13_optional_reflection",
      section: "Optional Reflection",
      type: "free_text_optional",
      prompt:
        "In one or two sentences, explain why validating only that a token transfer succeeds is not enough for this protocol.",
      points: 0,
      explanation:
        "A strong answer should mention that SPL transfer success does not prove the asset is approved collateral or that the destination is the canonical protocol vault.",
    },
  ] satisfies QuestionnaireQuestion[],
};

export function gradeQuestionnaire(
  questionnaire: typeof rl1FindingQuestionnaire,
  answers: QuestionnaireAnswer[]
): QuestionnaireResult {
  const answerMap = new Map(
    answers.map((answer) => [answer.questionId, answer])
  );

  let score = 0;
  const failedCriticalQuestions: string[] = [];
  const results = questionnaire.questions.map((question) => {
    const answer = answerMap.get(question.id);

    if (question.type === "free_text_optional") {
      return {
        questionId: question.id,
        correct: true,
        pointsEarned: 0,
      };
    }

    if (!answer) {
      if (question.critical) failedCriticalQuestions.push(question.id);

      return {
        questionId: question.id,
        correct: false,
        pointsEarned: 0,
      };
    }

    let correct = false;

    if (question.type === "single_choice" && "selectedOptionId" in answer) {
      correct = answer.selectedOptionId === question.correctOptionId;
    }

    if (question.type === "multi_select" && "selectedOptionIds" in answer) {
      const expected = [...(question.correctOptionIds ?? [])].sort();
      const actual = [...answer.selectedOptionIds].sort();

      correct =
        expected.length === actual.length &&
        expected.every((value, index) => value === actual[index]);
    }

    const pointsEarned = correct ? question.points : 0;
    if (correct) score += pointsEarned;
    if (!correct && question.critical) failedCriticalQuestions.push(question.id);

    return {
      questionId: question.id,
      correct,
      pointsEarned,
    };
  });

  return {
    score,
    totalPoints: questionnaire.totalPoints,
    passed:
      score >= questionnaire.passingScore &&
      failedCriticalQuestions.length === 0,
    failedCriticalQuestions,
    results,
  };
}
