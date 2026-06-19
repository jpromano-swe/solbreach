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

export type QuestionnaireDefinition = {
  id: string;
  labId: string;
  title: string;
  passingScore: number;
  totalPoints: number;
  requireCriticalCorrect: boolean;
  questions: QuestionnaireQuestion[];
};

export const rl1FindingQuestionnaire: QuestionnaireDefinition = {
  id: "rl1-account-substitution-finding-questionnaire",
  labId: "rl1-account-substitution",
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
          id: "account_substitution",
          label: "Account substitution caused by missing account binding",
        },
        {
          id: "oracle_price_manipulation",
          label: "Oracle price abuse inflates accepted collateral value",
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
      correctOptionId: "account_substitution",
      explanation:
        "The exploit is an account-substitution problem. The protocol trusts caller-supplied accounts without binding them to the approved collateral route.",
    },
    {
      id: "q2_invalid_inputs",
      section: "Vulnerability Identification",
      type: "single_choice",
      prompt: "Which attacker-controlled inputs made the invalid deposit path possible?",
      points: 10,
      options: [
        {
          id: "candidate_collateral_and_external_vault",
          label: "A candidate collateral account and an external vault path",
        },
        {
          id: "oracle_price_and_liquidation_queue",
          label: "An oracle price account and a liquidation queue",
        },
        {
          id: "treasury_authority_and_fee_receiver",
          label: "The treasury authority and the fee receiver",
        },
        {
          id: "rent_sysvar_and_clock",
          label: "The rent sysvar and the clock account",
        },
      ],
      correctOptionId: "candidate_collateral_and_external_vault",
      explanation:
        "The exploit depends on supplying a collateral account and vault route that satisfy the token transfer but are not the canonical protocol accounts.",
    },
    {
      id: "q3_credit_origin",
      section: "Vulnerability Identification",
      type: "single_choice",
      prompt: "Where did the illegitimate borrow credit come from?",
      points: 10,
      options: [
        {
          id: "invalid_account_relationship_created_credit",
          label: "An invalid account relationship was treated as approved collateral",
        },
        {
          id: "oracle_price_feed_changed_credit",
          label: "An oracle price feed directly inflated user credit",
        },
        {
          id: "rounding_error_minted_credit",
          label: "A rounding error minted protocol credit",
        },
        {
          id: "reward_pool_rebate_created_credit",
          label: "A reward-pool rebate created the extra credit",
        },
      ],
      correctOptionId: "invalid_account_relationship_created_credit",
      explanation:
        "The position received credit because the protocol never proved that the supplied accounts belonged to the approved collateral configuration.",
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
          id: "invalid_deposit_then_treasury_withdrawal",
          label: "Invalid deposit creates credit, then real treasury funds are borrowed out",
        },
        {
          id: "oracle_inflate_liquidate",
          label: "Oracle manipulation inflates collateral, then liquidates users",
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
      correctOptionId: "invalid_deposit_then_treasury_withdrawal",
      explanation:
        "The exploit path is invalid deposit first, treasury withdrawal second. Credit is created before the real protocol value leaves the treasury.",
    },
    {
      id: "q5_treasury_impact",
      section: "Exploit Path Understanding",
      type: "single_choice",
      prompt: "What proves the protocol impact is real rather than cosmetic?",
      points: 10,
      options: [
        {
          id: "real_protocol_value_left_treasury",
          label: "Real protocol value left the treasury after invalid credit was used",
        },
        {
          id: "frontend_showed_success_toast",
          label: "The frontend showed a success toast after the transaction",
        },
        {
          id: "position_credit_changed_only",
          label: "Only the position credit changed, with no treasury movement",
        },
        {
          id: "logs_contained_program_success",
          label: "The runtime logs contained a program success line",
        },
      ],
      correctOptionId: "real_protocol_value_left_treasury",
      explanation:
        "The impact is real only when invalid credit results in actual treasury value leaving protocol custody.",
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
          id: "only_after_invalid_credit_enables_real_withdrawal",
          label: "Only after invalid credit enables a real treasury withdrawal",
        },
        {
          id: "when_code_is_inspected",
          label: "As soon as the vulnerable instruction is identified in code",
        },
        {
          id: "after_any_deposit_succeeds",
          label: "As soon as any deposit transaction succeeds",
        },
        {
          id: "when_ui_renders_verified_state",
          label: "When the UI renders the verified state badge",
        },
      ],
      correctOptionId: "only_after_invalid_credit_enables_real_withdrawal",
      explanation:
        "Impact is not proven by code inspection or a successful transaction alone. It is proven when invalid credit is used to move real treasury value.",
    },
    {
      id: "q7_evidence_source",
      section: "State and Evidence",
      type: "single_choice",
      prompt: "What evidence should support the final finding?",
      points: 10,
      options: [
        {
          id: "transaction_and_account_evidence",
          label: "Transaction timeline and account state evidence together",
        },
        {
          id: "frontend_toasts_only",
          label: "Frontend notifications and local UI state only",
        },
        {
          id: "source_code_only",
          label: "Source code review alone without runtime evidence",
        },
        {
          id: "wallet_signature_only",
          label: "A wallet signature proving the attacker sent a transaction",
        },
      ],
      correctOptionId: "transaction_and_account_evidence",
      explanation:
        "The backend expects the finding to be supported by runtime transaction evidence plus account-state changes, not by UI state alone.",
    },
    {
      id: "q8_recommended_fix",
      section: "State and Evidence",
      type: "single_choice",
      prompt: "Which remediation best addresses the vulnerability?",
      points: 20,
      critical: true,
      options: [
        {
          id: "bind_accounts_to_approved_config",
          label: "Bind source and vault to approved mint and canonical vault",
        },
        {
          id: "increase_compute_budget",
          label: "Increase compute budget before token transfer routing",
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
  ] satisfies QuestionnaireQuestion[],
};

export function gradeQuestionnaire(
  questionnaire: QuestionnaireDefinition,
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
