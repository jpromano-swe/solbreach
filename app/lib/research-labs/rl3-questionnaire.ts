import type {
  QuestionnaireDefinition,
  QuestionnaireQuestion,
} from "./rl1-questionnaire";

export const rl3FindingQuestionnaire: QuestionnaireDefinition = {
  id: "rl3-arbitrary-cpi-finding-questionnaire",
  labId: "rl3-arbitrary-cpi",
  title: "Finding Review",
  passingScore: 80,
  totalPoints: 100,
  requireCriticalCorrect: true,
  questions: [
    {
      id: "q1_vulnerability_category",
      section: "Vulnerability Identification",
      type: "single_choice",
      prompt:
        "What is the primary vulnerability demonstrated in this Research Lab?",
      points: 15,
      critical: true,
      options: [
        {
          id: "arbitrary_cpi_target",
          label: "A delegated payout accepts an unbound CPI target",
        },
        {
          id: "missing_signer",
          label: "A payout runs without a required worker signature",
        },
        {
          id: "bad_math",
          label: "The reward amount overflows during escrow accounting",
        },
        {
          id: "stale_oracle",
          label: "A stale price feed changes the bounty payout value",
        },
      ],
      correctOptionId: "arbitrary_cpi_target",
      explanation:
        "The payout flow moves value through CPI, but the invoked program can be selected by the caller instead of being bound to the approved router.",
    },
    {
      id: "q2_public_instruction",
      section: "Vulnerability Identification",
      type: "single_choice",
      prompt: "Which public instruction is used to trigger the payout path?",
      points: 10,
      options: [
        {
          id: "execute_delegated_payout",
          label: "execute_delegated_payout",
        },
        {
          id: "submit_task",
          label: "submit_task",
        },
        {
          id: "close_task",
          label: "close_task",
        },
        {
          id: "claim_refund",
          label: "claim_refund",
        },
      ],
      correctOptionId: "execute_delegated_payout",
      explanation:
        "The public interface exposes the delegated payout instruction. The exploit succeeds when that instruction invokes an attacker-controlled CPI target.",
    },
    {
      id: "q3_exploit_sequence",
      section: "Exploit Path Understanding",
      type: "single_choice",
      prompt: "Which sequence best describes the verified exploit?",
      points: 20,
      critical: true,
      options: [
        {
          id: "build_deploy_delegate_execute_attacker_cpi",
          label:
            "Build the CPI target, deploy it, submit a delegation, then execute payout through it",
        },
        {
          id: "delegate_then_official_router",
          label:
            "Submit a delegation, call the official router, then wait for payout approval",
        },
        {
          id: "change_reward_amount",
          label:
            "Increase the task reward amount, submit the task, then claim from escrow",
        },
        {
          id: "close_task_record",
          label:
            "Close the task record, reclaim rent, then reopen the payout route",
        },
      ],
      correctOptionId: "build_deploy_delegate_execute_attacker_cpi",
      explanation:
        "The runtime requires a built and deployed attacker program, a normal-looking delegation, and a canonical payout instruction that targets the attacker program.",
    },
    {
      id: "q4_attacker_vector",
      section: "Exploit Path Understanding",
      type: "single_choice",
      prompt:
        "Which attacker-controlled vector makes the delegated payout exploitable?",
      points: 10,
      options: [
        {
          id: "substitute_unbound_cpi_target",
          label:
            "Substitute the approved payout router with an attacker-controlled CPI program",
        },
        {
          id: "reuse_expired_delegation",
          label: "Reuse an expired payout delegation without a new signature",
        },
        {
          id: "overflow_reward_amount",
          label: "Overflow the reward amount stored in the task record",
        },
        {
          id: "close_escrow_early",
          label: "Close the task escrow before the payout instruction runs",
        },
      ],
      correctOptionId: "substitute_unbound_cpi_target",
      explanation:
        "The vulnerability is the unbound CPI target. A caller can replace the approved payout router with an attacker-controlled program regardless of whether the protocol runs in a sandbox, on devnet, or on mainnet.",
    },
    {
      id: "q5_impact",
      section: "State and Evidence",
      type: "single_choice",
      prompt: "What impact was proven by the runtime evidence?",
      points: 15,
      critical: true,
      options: [
        {
          id: "task_escrow_drained_to_attacker_reward_account",
          label: "Task escrow value moves into the attacker reward account",
        },
        {
          id: "bounty_config_closed",
          label: "The bounty configuration account is closed",
        },
        {
          id: "worker_account_frozen",
          label: "The approved worker account becomes frozen",
        },
        {
          id: "mint_authority_reassigned",
          label: "The reward mint authority is reassigned",
        },
      ],
      correctOptionId: "task_escrow_drained_to_attacker_reward_account",
      explanation:
        "The verified impact is escrow value leaving the task escrow and appearing in the attacker reward account through the substituted CPI target.",
    },
    {
      id: "q6_evidence",
      section: "State and Evidence",
      type: "multi_select",
      prompt: "Which evidence supports the final finding?",
      points: 15,
      options: [
        {
          id: "attacker_program_deployed",
          label: "The attacker CPI program was deployed in the session",
        },
        {
          id: "cpi_target_replaced",
          label: "The delegated CPI target was replaced during execution",
        },
        {
          id: "escrow_delta_matches",
          label: "The escrow decrease matches the attacker reward increase",
        },
        {
          id: "official_router_called",
          label: "The official router completed the payout successfully",
        },
      ],
      correctOptionIds: [
        "attacker_program_deployed",
        "cpi_target_replaced",
        "escrow_delta_matches",
      ],
      explanation:
        "The finding needs deployed-program, substituted-target, and balance-delta evidence. A successful official router call would not prove this exploit path.",
    },
    {
      id: "q7_severity",
      section: "Severity and Report Reasoning",
      type: "single_choice",
      prompt: "Which severity best matches the verified RL3 impact?",
      points: 5,
      options: [
        { id: "high", label: "High" },
        { id: "critical", label: "Critical" },
        { id: "medium", label: "Medium" },
        { id: "informational", label: "Informational" },
      ],
      correctOptionId: "high",
      explanation:
        "The verified path drains task escrow through an attacker-controlled CPI target. Broader platform-wide loss is not proven by this lab version.",
    },
    {
      id: "q8_recommended_fix",
      section: "State and Evidence",
      type: "single_choice",
      prompt: "Which remediation correctly prevents this CPI target swap?",
      points: 10,
      critical: true,
      options: [
        {
          id: "bind_cpi_target_to_approved_router",
          label: "Resolve the payout program from config and require the approved router",
        },
        {
          id: "increase_task_escrow_amount",
          label: "Increase the bounty escrow before every delegated payout",
        },
        {
          id: "hide_delegation_button",
          label: "Hide the delegation button from the public interface",
        },
        {
          id: "delay_reward_transfers",
          label: "Delay reward transfers until the next reward epoch",
        },
      ],
      correctOptionId: "bind_cpi_target_to_approved_router",
      explanation:
        "The fix is to bind the invoked program to trusted protocol configuration before value moves through CPI.",
    },
  ],
};

export type Rl3FindingQuestion = QuestionnaireQuestion;
