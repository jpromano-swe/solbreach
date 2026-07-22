import {
  rl1FindingQuestionnaire,
  type QuestionnaireDefinition,
} from "../../lib/research-labs/rl1-questionnaire";
import { rl2FindingQuestionnaire } from "../../lib/research-labs/rl2-questionnaire";
import type { ResearchLabManifest } from "../../lib/research-labs/lab-state";

export type ResearchLabFrontendAdapter = {
  slug: string;
  code: string;
  prerequisiteBadgeLevel: 1 | 2;
  questionnaire: QuestionnaireDefinition;
  inspectHintId: string;
  accountLabels: Record<string, string>;
  briefing: {
    heading: string;
    supportingLine: string;
    objective: string;
  };
  impactVerifiedCopy: string;
  inspectChecks: string[];
  verifiedEvidenceChecks: string[];
  exploitHints: string[];
  securePattern: {
    title: string;
    subtitle: string;
    whatFailed: string;
    principle: string;
    answerPrompt: string;
    correctAnswerId: string;
    answerOptions: Array<{ id: string; label: string }>;
    requiredChecksTitle: string;
    requiredChecks: Array<{ id: string; label: string }>;
    validationChecklist: string[];
    researcherChecklist: string[];
    contrastTitle: string;
    contrastCopy: string;
    badPatternTitle: string;
    badPatternCode: string;
    saferPatternTitle: string;
    saferPatternCode: string;
    completionLockedCopy: string;
    completionReadyCopy: string;
    toastId: string;
    toastDescription: string;
  };
  certificate: {
    labLabel: string;
    moduleLabel: string;
    credentialLabel: string;
    completionCopy: string;
  };
};

const rl1Adapter: ResearchLabFrontendAdapter = {
  slug: "account-substitution",
  code: "RL1",
  prerequisiteBadgeLevel: 1,
  questionnaire: rl1FindingQuestionnaire,
  inspectHintId: "account-binding",
  accountLabels: {},
  briefing: {
    heading: "Investigate the protocol behavior.",
    supportingLine:
      "Inspect the lending market, test its account assumptions, and document any behavior that can put protocol funds at risk.",
    objective:
      "Determine whether a counterfeit deposit path can create position credit and support a real treasury withdrawal.",
  },
  impactVerifiedCopy:
    "Deposit program was proven vulnerable through user and protocol balance status.",
  inspectChecks: [
    "Protocol source reviewed",
    "Account relationships inspected",
    "Collateral validation located",
    "Exploit path ready",
  ],
  verifiedEvidenceChecks: [
    "Deposit transaction",
    "Credit delta",
    "Withdraw transaction",
    "Liquidity delta",
  ],
  exploitHints: [
    "Start by comparing the token account you provide with the vault that receives it.",
    "After deposit, inspect whether position credit changed even though the account path was not canonical.",
    "If credit appears, use the protocol borrow surface and then review whether treasury state changed.",
  ],
  securePattern: {
    title: "Secure Pattern: Account Binding",
    subtitle:
      "How to prevent account substitution from becoming protocol credit.",
    whatFailed:
      "The protocol trusted caller-supplied accounts without proving they belonged to the approved collateral configuration.",
    principle:
      "Do not grant credit, authority, or value based on unbound account relationships.",
    answerPrompt: "Which validation would have prevented this issue?",
    correctAnswerId: "bind_accounts_to_config",
    answerOptions: [
      {
        id: "valid_balance",
        label: "Check that the user has a valid balance",
      },
      {
        id: "bind_accounts_to_config",
        label:
          "Bind collateral source and vault destination to the approved mint/config",
      },
      {
        id: "signed_by_user",
        label: "Verify the transaction is signed by the user",
      },
      {
        id: "initialized_token_account",
        label: "Ensure the token account is initialized",
      },
    ],
    requiredChecksTitle: "Required checks before credit is assigned",
    requiredChecks: [
      { id: "mint_matches", label: "Collateral mint matches accepted mint" },
      { id: "canonical_vault", label: "Vault is canonical protocol vault" },
      { id: "valid_authority", label: "Account owner / authority is valid" },
    ],
    validationChecklist: [
      "Validate the mint.",
      "Validate the token account owner.",
      "Validate the canonical vault.",
      "Validate PDA derivation.",
      "Validate authority.",
      "Validate the relationship between all accounts.",
    ],
    researcherChecklist: [
      "Who supplies this account?",
      "What proves it belongs to the protocol?",
      "Can an attacker substitute it with a compatible but unapproved account?",
      "Is value, credit, or authority assigned before validation?",
      "Are account relationships validated, or only individual accounts?",
    ],
    contrastTitle: "Credit assignment contrast",
    contrastCopy:
      "The issue is not the credit update itself. It is whether the account relationship is proven before value is assigned.",
    badPatternTitle: "Unbound account credit",
    badPatternCode: [
      "fn assign_credit(ctx) {",
      "    let collateral = ctx.accounts.collateral;",
      "    let amount = collateral.amount;",
      "",
      "    credit_user(ctx.accounts.user, amount);",
      "}",
    ].join("\n"),
    saferPatternTitle: "Bound account validation",
    saferPatternCode: [
      "fn assign_credit(ctx) {",
      "    validate_mint(ctx.accounts.collateral.mint)?;",
      "    validate_vault(ctx.accounts.vault)?;",
      "    validate_authority(ctx.accounts.authority)?;",
      "    validate_pda(ctx.accounts.vault, ctx.accounts.mint)?;",
      "",
      "    credit_user(ctx.accounts.user, ctx.accounts.vault.amount);",
      "}",
    ].join("\n"),
    completionLockedCopy:
      "Complete the Secure Pattern review to unlock your Account Substitution certificate.",
    completionReadyCopy:
      "Secure pattern completed. Continue to certify this knowledge on-chain.",
    toastId: "rl1-audit-report-submitted",
    toastDescription:
      "Review the secure pattern that prevents this vulnerability class before minting your certificate.",
  },
  certificate: {
    labLabel: "Research Lab 1",
    moduleLabel: "Account Substitution",
    credentialLabel: "Account Substitution — Verified Research Lab",
    completionCopy:
      "You verified impact, submitted the audit report, and reviewed the secure account-binding pattern.",
  },
};

const rl2Adapter: ResearchLabFrontendAdapter = {
  slug: "yield-hijack",
  code: "RL2",
  prerequisiteBadgeLevel: 2,
  questionnaire: rl2FindingQuestionnaire,
  inspectHintId: "position-derivation",
  accountLabels: {
    pool_config: "Pool Configuration",
    pool_authority: "Pool Authority",
    stake_mint: "Stake Token Mint",
    reward_mint: "Reward Token Mint",
    stake_vault: "Protocol Stake Vault",
    reward_vault: "Protocol Reward Vault",
    stake_position: "Staking Position",
    user_stake_account: "Your Stake Account",
    user_reward_account: "Your Reward Account",
    existing_staker_stake_account: "Existing Staker Account",
    existing_staker_reward_account: "Existing Staker Reward Account",
  },
  briefing: {
    heading: "Investigate a high-APY staking protocol.",
    supportingLine:
      "Determine whether staking positions and accumulated rewards are correctly isolated between users.",
    objective:
      "Identify an account-isolation failure, demonstrate unauthorized reward capture, and preserve evidence of the resulting state changes.",
  },
  impactVerifiedCopy:
    "A submitted stake changed ownership of a pre-existing staking position while preserving its accumulated value and enabling a different wallet to claim those rewards.",
  inspectChecks: [
    "Protocol source reviewed",
    "Staking position inspected",
    "Position derivations compared",
    "Exploit path ready",
  ],
  verifiedEvidenceChecks: [
    "Position derivation",
    "Ownership change",
    "Preserved position value",
    "Reward transfer",
  ],
  exploitHints: [
    "Stake a small amount from the Exploiter Interface, then compare the Current Position value before and after the transaction.",
    "Open SolBreach Explorer and investigate the public program interface and decoded accounts. You need both a callable instruction and a wallet whose position still has rewards.",
    "In Explorer, inspect Program Interface > Instructions to find the claim function. Then open Accounts > Staking Position and read its owner address. Those are the two values required by the claim form.",
  ],
  securePattern: {
    title: "Secure Pattern: Identity-Scoped PDAs",
    subtitle: "How to isolate staking positions by both pool and user.",
    whatFailed:
      "The staking position represented user-specific state, but its PDA derivation represented only the pool.",
    principle:
      "Every identity represented by an account must be included in its derivation or validated explicitly.",
    answerPrompt: "Which change isolates every staking position correctly?",
    correctAnswerId: "scope_position_by_pool_and_user",
    answerOptions: [
      {
        id: "increase_minimum_stake",
        label: "Increase the minimum stake amount",
      },
      {
        id: "scope_position_by_pool_and_user",
        label:
          "Include both the pool and user public keys in the staking-position PDA seeds",
      },
      {
        id: "reduce_reward_rate",
        label: "Reduce the advertised reward rate",
      },
      {
        id: "check_reward_vault_balance",
        label: "Check the reward vault balance before every claim",
      },
    ],
    requiredChecksTitle: "Required position checks",
    requiredChecks: [
      { id: "pool_seed", label: "Position derivation includes the pool" },
      { id: "user_seed", label: "Position derivation includes the user" },
      { id: "stored_owner", label: "Stored owner matches the signer" },
      { id: "stored_pool", label: "Stored pool matches the selected pool" },
    ],
    validationChecklist: [
      "Include the pool public key in the position seeds.",
      "Include the user public key in the position seeds.",
      "Validate the stored owner against the signer.",
      "Validate the stored pool against the selected pool.",
      "Verify the stored bump against the expected derivation.",
      "Prevent normal staking from reassigning an existing position.",
    ],
    researcherChecklist: [
      "Which identities does this account represent?",
      "Are all represented identities present in the PDA seeds?",
      "Can two participants derive the same mutable account?",
      "Can a normal instruction overwrite stored ownership?",
      "Does existing value remain after an ownership mutation?",
    ],
    contrastTitle: "Position derivation contrast",
    contrastCopy:
      "A pool-scoped address is appropriate for pool-wide state. A staking position needs a user identity as well.",
    badPatternTitle: "Pool-scoped position",
    badPatternCode: [
      "seeds = [",
      '    b"stake_position",',
      "    pool.key().as_ref(),",
      "]",
    ].join("\n"),
    saferPatternTitle: "User-scoped position",
    saferPatternCode: [
      "seeds = [",
      '    b"stake_position",',
      "    pool.key().as_ref(),",
      "    user.key().as_ref(),",
      "]",
    ].join("\n"),
    completionLockedCopy:
      "Complete the Secure Pattern review to unlock the Static PDA certificate.",
    completionReadyCopy:
      "Secure pattern completed. Continue to the certification checkpoint.",
    toastId: "rl2-audit-report-submitted",
    toastDescription:
      "Review the identity-scoped PDA pattern before claiming the Research Lab certificate.",
  },
  certificate: {
    labLabel: "Research Lab 2",
    moduleLabel: "Yield Hijack",
    credentialLabel: "Static PDA — Verified Research Lab",
    completionCopy:
      "You verified unauthorized reward capture, submitted the finding, and reviewed identity-scoped PDA derivation.",
  },
};

const adapters: Record<string, ResearchLabFrontendAdapter> = {
  [rl1Adapter.slug]: rl1Adapter,
  [rl2Adapter.slug]: rl2Adapter,
};

export function getResearchLabAdapter(
  lab: Pick<ResearchLabManifest, "id" | "slug"> | null
) {
  if (!lab) return rl1Adapter;
  if (lab.slug in adapters) return adapters[lab.slug];
  if (lab.id === "rl2-yield-hijack") return rl2Adapter;
  return rl1Adapter;
}

export function isYieldHijackLab(
  lab: Pick<ResearchLabManifest, "id" | "slug"> | null
) {
  return getResearchLabAdapter(lab).slug === "yield-hijack";
}
