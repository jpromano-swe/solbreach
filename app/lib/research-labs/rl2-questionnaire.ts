import type {
  QuestionnaireDefinition,
  QuestionnaireQuestion,
} from "./rl1-questionnaire";

export const rl2FindingQuestionnaire: QuestionnaireDefinition = {
  id: "rl2-yield-hijack-finding-questionnaire",
  labId: "rl2-yield-hijack",
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
          id: "static_pda_missing_user_identity",
          label: "A user-specific position PDA omits the user identity",
        },
        {
          id: "excessive_apy",
          label: "The advertised APY is economically unsustainable",
        },
        {
          id: "reward_vault_overfunded",
          label: "The reward vault contains more tokens than pending rewards",
        },
        {
          id: "small_stakes_allowed",
          label: "The protocol permits deposits smaller than the existing position",
        },
      ],
      correctOptionId: "static_pda_missing_user_identity",
      explanation:
        "The position represents both a pool and a user, but its PDA seeds only represent the pool. Different stakers therefore resolve to the same mutable account.",
    },
    {
      id: "q2_derivation_identity",
      section: "Vulnerability Identification",
      type: "single_choice",
      prompt: "Which identity is missing from the staking-position derivation?",
      points: 10,
      options: [
        {
          id: "staker_public_key",
          label: "The staker public key",
        },
        {
          id: "reward_mint",
          label: "The reward mint",
        },
        {
          id: "token_program",
          label: "The token program",
        },
        {
          id: "clock_sysvar",
          label: "The clock sysvar",
        },
      ],
      correctOptionId: "staker_public_key",
      explanation:
        "Including the staker public key scopes each position to both its pool and its owner.",
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
          id: "existing_rewards_same_pda_stake_overwrite_claim",
          label:
            "Stake through the shared position PDA, become owner, then claim the rewards",
        },
        {
          id: "manipulate_apy_wait_claim",
          label:
            "Change the APY settings, wait for new accrual, then claim the rewards",
        },
        {
          id: "replace_reward_vault_claim",
          label:
            "Swap the reward vault account, redirect custody, then claim the balance",
        },
        {
          id: "unstake_victim_principal",
          label:
            "Unstake the existing principal, redirect stake custody, then claim rewards",
        },
      ],
      correctOptionId: "existing_rewards_same_pda_stake_overwrite_claim",
      explanation:
        "The small stake reuses the existing position account, changes its owner, preserves its accumulated rewards, and makes those rewards claimable by the attacker.",
    },
    {
      id: "q4_preserved_value",
      section: "State and Evidence",
      type: "single_choice",
      prompt: "Which unchanged state is important evidence after the attacker stakes?",
      points: 10,
      options: [
        {
          id: "pending_rewards_preserved",
          label: "The pre-existing pending rewards remain on the position",
        },
        {
          id: "attacker_balance_unchanged",
          label: "The attacker stake balance remains unchanged",
        },
        {
          id: "position_owner_unchanged",
          label: "The position owner remains the existing staker",
        },
        {
          id: "vault_balance_unchanged",
          label: "The protocol stake vault remains unchanged",
        },
      ],
      correctOptionId: "pending_rewards_preserved",
      explanation:
        "The ownership change is exploitable because value accumulated before the attacker interaction remains attached to the reused position.",
    },
    {
      id: "q5_impact",
      section: "Exploit Path Understanding",
      type: "single_choice",
      prompt: "What impact was proven by the runtime evidence?",
      points: 15,
      critical: true,
      options: [
        {
          id: "unauthorized_preexisting_reward_claim",
          label: "The attacker claimed rewards accumulated by another staker",
        },
        {
          id: "victim_principal_stolen",
          label: "The attacker withdrew the victim's staked principal",
        },
        {
          id: "reward_mint_authority_stolen",
          label: "The attacker took control of the reward mint authority",
        },
        {
          id: "pool_config_closed",
          label: "The attacker closed the pool configuration account",
        },
      ],
      correctOptionId: "unauthorized_preexisting_reward_claim",
      explanation:
        "RL2 V1 proves unauthorized reward theft. It does not prove that the existing principal can be withdrawn.",
    },
    {
      id: "q6_evidence",
      section: "State and Evidence",
      type: "multi_select",
      prompt: "Which evidence supports the final finding?",
      points: 15,
      options: [
        {
          id: "position_pda_collision",
          label: "Both participant derivations resolve to the same position",
        },
        {
          id: "owner_changed_after_stake",
          label: "Position ownership changed after the attacker stake",
        },
        {
          id: "reward_delta_matches",
          label: "Attacker reward gain matches the reward-vault decrease",
        },
        {
          id: "apy_is_high",
          label: "The advertised APY is unusually high",
        },
      ],
      correctOptionIds: [
        "position_pda_collision",
        "owner_changed_after_stake",
        "reward_delta_matches",
      ],
      explanation:
        "The finding needs derivation, ownership, and value-transfer evidence. The advertised APY is context, not proof of the vulnerability.",
    },
    {
      id: "q7_severity",
      section: "Severity and Report Reasoning",
      type: "single_choice",
      prompt: "Which severity best matches the verified RL2 impact?",
      points: 5,
      options: [
        { id: "high", label: "High" },
        { id: "critical", label: "Critical" },
        { id: "medium", label: "Medium" },
        { id: "informational", label: "Informational" },
      ],
      correctOptionId: "high",
      explanation:
        "The verified path enables unauthorized reward theft. Broader principal theft is possible in related designs but is not proven by this lab version.",
    },
    {
      id: "q8_recommended_fix",
      section: "State and Evidence",
      type: "single_choice",
      prompt: "Which remediation correctly isolates every staking position?",
      points: 10,
      critical: true,
      options: [
        {
          id: "scope_pda_by_pool_and_user",
          label:
            "Derive each position PDA from the pool and user, then validate both",
        },
        {
          id: "raise_minimum_stake",
          label:
            "Raise the minimum stake amount and reject small reward claim attempts",
        },
        {
          id: "reduce_apy",
          label:
            "Reduce the advertised APY so each reward claim has a smaller payout",
        },
        {
          id: "hide_claim_button",
          label:
            "Hide the claim action until rewards accrue for the connected wallet",
        },
      ],
      correctOptionId: "scope_pda_by_pool_and_user",
      explanation:
        "A user-specific position must be derived from both the pool and the user, with stored owner and pool values validated on every mutation.",
    },
  ] satisfies QuestionnaireQuestion[],
};
