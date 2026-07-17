"use client";

import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Play,
} from "lucide-react";
import { useMemo, useState } from "react";

import type {
  LabTransactionPayload,
  SandboxAccountSummary,
} from "../../lib/research-labs/lab-state";
import type {
  EnrichedTransactionResult,
  ExecuteExploitView,
} from "./types";
import {
  AnimatedContentSwitch,
  EXECUTE_EXPLOIT_VIEW_TRANSITION_ORDER,
} from "./workspace-tabs";

const BASELINE = {
  attackerRewardBalance: 0,
  attackerStakeBalance: 100,
  pendingRewards: 12_500,
  positionStakedAmount: 50_000,
  rewardVaultBalance: 500_000,
  stakeVaultBalance: 50_000,
};

export function YieldHijackExecuteTab({
  activeView,
  evidenceAccounts,
  impactVerified,
  isRunning,
  txResults,
  onChangeView,
  onExecuteTransaction,
  onOpenEvidenceReview,
  onProveImpact,
}: {
  activeView: ExecuteExploitView;
  evidenceAccounts: SandboxAccountSummary[];
  impactVerified: boolean;
  isRunning: boolean;
  txResults: EnrichedTransactionResult[];
  onChangeView: (view: ExecuteExploitView) => void;
  onExecuteTransaction: (payload: LabTransactionPayload) => Promise<void>;
  onOpenEvidenceReview: () => void;
  onProveImpact: () => void;
}) {
  const [stakeAmount, setStakeAmount] = useState("1");
  const [pendingAction, setPendingAction] = useState<"stake" | "claim" | null>(
    null
  );
  const state = useMemo(
    () => deriveYieldHijackState(txResults, evidenceAccounts),
    [evidenceAccounts, txResults]
  );
  const parsedAmount = parseStakeAmount(stakeAmount);
  const canStake =
    parsedAmount >= 1 &&
    parsedAmount <= Math.min(100, state.attackerStakeBalance) &&
    !isRunning &&
    pendingAction === null;
  const canClaim = !isRunning && pendingAction === null;

  const submitStake = async () => {
    if (!canStake) return;
    setPendingAction("stake");
    try {
      await onExecuteTransaction({
        action_type: "STAKE",
        amount: parsedAmount,
        source_account_ref: "attacker_stake_account",
        stake_vault_ref: "stake_vault",
        position_account_ref: "stake_position",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const claimRewards = async () => {
    if (!canClaim) return;
    setPendingAction("claim");
    try {
      await onExecuteTransaction({
        action_type: "CLAIM_REWARDS",
        position_account_ref: "stake_position",
        reward_vault_ref: "reward_vault",
        destination_account_ref: "attacker_reward_account",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const hypothesis = (
    <div>
      <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white">
        Test how staking changes the existing position.
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
        Submit protocol actions, observe the position owner and accumulated
        value, then review the returned evidence.
      </p>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <div>
            <p className="text-sm font-semibold text-zinc-200">
              Exploiter Interface
            </p>
            <p className="mt-2 text-xs leading-6 text-zinc-500">
              Stake a small amount or test whether the current position already
              allows your wallet to claim its pending rewards.
            </p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Stake</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Add STAKE to the current pool position.
                  </p>
                </div>
                <span className="font-mono text-xs text-zinc-500">
                  {formatAmount(state.attackerStakeBalance)} available
                </span>
              </div>
              <label className="mt-4 block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
                  Amount to stake
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={Math.min(100, state.attackerStakeBalance)}
                    value={stakeAmount}
                    disabled={isRunning || pendingAction !== null}
                    onChange={(event) => setStakeAmount(event.target.value)}
                    className="min-h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 font-mono text-sm text-zinc-100 outline-none transition focus:border-[#14f195]/45 disabled:opacity-55"
                  />
                  <span className="text-xs font-medium text-zinc-500">
                    STAKE
                  </span>
                </div>
              </label>
              <button
                type="button"
                onClick={() => void submitStake()}
                disabled={!canStake}
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-[#14f195]/25 bg-[#14f195]/10 px-4 text-sm font-semibold text-[#8fffd0] transition hover:bg-[#14f195]/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-zinc-600"
              >
                {pendingAction === "stake" ? "Staking..." : "Stake Tokens"}
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Claim Rewards
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Ask the program to pay every reward currently recorded on
                    the position.
                  </p>
                </div>
                <span className="font-mono text-xs text-zinc-500">
                  {formatAmount(state.pendingRewards)} pending
                </span>
              </div>
              <div className="mt-4 border-y border-white/10 py-3">
                <StateRow
                  label="Destination"
                  value="Your Reward Account"
                />
                <StateRow
                  label="Amount"
                  value="Read from position"
                />
              </div>
              <button
                type="button"
                onClick={() => void claimRewards()}
                disabled={!canClaim}
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-[#9945ff]/30 bg-[#9945ff]/12 px-4 text-sm font-semibold text-[#d7c0ff] transition hover:bg-[#9945ff]/18 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-zinc-600"
              >
                {pendingAction === "claim"
                  ? "Claiming..."
                  : "Claim Pending Rewards"}
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
                Latest Action
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {txResults[0]
                  ? yieldHijackTransactionTitle(txResults[0])
                  : "No transactions submitted yet."}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenEvidenceReview}
              disabled={txResults.length === 0}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#9945ff]/25 bg-[#9945ff]/10 px-4 text-xs font-semibold text-[#c7a6ff] transition hover:bg-[#9945ff]/16 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Review Evidence
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        <YieldHijackProtocolState state={state} />
      </div>
    </div>
  );

  return (
    <div className="overflow-auto p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-xl border border-white/10 bg-black/20 p-1">
          {[
            { id: "HYPOTHESIS" as const, label: "Exploit Hypothesis" },
            { id: "EVIDENCE_REVIEW" as const, label: "Evidence Review" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeView(item.id)}
              className={`min-h-9 rounded-lg px-3 text-sm transition ${
                activeView === item.id
                  ? "bg-[#9945ff]/18 text-[#d7c0ff]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatedContentSwitch
        className="research-lab-transition-fit"
        transitionKey={activeView}
        transitionOrder={EXECUTE_EXPLOIT_VIEW_TRANSITION_ORDER}
      >
        {activeView === "HYPOTHESIS" ? (
          hypothesis
        ) : (
          <YieldHijackEvidenceReview
            evidenceAccounts={evidenceAccounts}
            impactVerified={impactVerified}
            isRunning={isRunning}
            state={state}
            txResults={txResults}
            onProveImpact={onProveImpact}
          />
        )}
      </AnimatedContentSwitch>
    </div>
  );
}

function YieldHijackProtocolState({ state }: { state: YieldHijackState }) {
  return (
    <aside className="h-fit rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">Protocol State</p>
        <span className="text-[11px] font-medium text-[#8fffd0]">Live</span>
      </div>

      <StateGroup title="Your Wallet">
        <StateRow
          label="Stake balance"
          value={`${formatAmount(state.attackerStakeBalance)} STAKE`}
        />
        <StateRow
          label="Reward balance"
          value={`${formatAmount(state.attackerRewardBalance)} REWARD`}
        />
      </StateGroup>

      <StateGroup title="Existing Position">
        <StateRow label="Owner" value={state.positionOwnerLabel} />
        <StateRow
          label="Staked amount"
          value={`${formatAmount(state.positionStakedAmount)} STAKE`}
        />
        <StateRow
          label="Pending rewards"
          value={`${formatAmount(state.pendingRewards)} REWARD`}
        />
        <StateRow
          label="Position PDA"
          value={shortAddress(state.positionAddress)}
        />
      </StateGroup>

      <StateGroup title="Protocol Vaults">
        <StateRow
          label="Stake vault"
          value={`${formatAmount(state.stakeVaultBalance)} STAKE`}
        />
        <StateRow
          label="Reward vault"
          value={`${formatAmount(state.rewardVaultBalance)} REWARD`}
        />
      </StateGroup>

      <div className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-zinc-500">
        Baseline: the position held 50,000 STAKE and 12,500 pending REWARD
        before your first successful action.
      </div>
    </aside>
  );
}

function YieldHijackEvidenceReview({
  evidenceAccounts,
  impactVerified,
  isRunning,
  state,
  txResults,
  onProveImpact,
}: {
  evidenceAccounts: SandboxAccountSummary[];
  impactVerified: boolean;
  isRunning: boolean;
  state: YieldHijackState;
  txResults: EnrichedTransactionResult[];
  onProveImpact: () => void;
}) {
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const orderedTransactions = [...txResults].reverse();
  const hasSuccessfulStake = txResults.some(
    (result) =>
      result.instructionType.includes("STAKE") &&
      !result.instructionType.includes("CLAIM") &&
      result.executionStatus === "success"
  );
  const hasSuccessfulClaim = txResults.some(
    (result) =>
      result.instructionType.includes("CLAIM") &&
      result.executionStatus === "success"
  );
  const position = findAccount(evidenceAccounts, "stake_position");
  const victimPda =
    stringFromRecord(position?.data, [
      "victim_position_address",
      "victimPositionAddress",
      "victim_pda",
    ]) ?? state.positionAddress;
  const attackerPda =
    stringFromRecord(position?.data, [
      "attacker_position_address",
      "attackerPositionAddress",
      "attacker_pda",
    ]) ?? state.positionAddress;

  return (
    <div className="mt-5">
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
        Prove what changed.
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
        Review transaction execution, position ownership, account derivations,
        and token deltas before verifying impact.
      </p>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">
            Transaction Timeline
          </p>
          {orderedTransactions.length ? (
            <div className="mt-4 space-y-2">
              {orderedTransactions.map((result, index) => {
                const key =
                  result.transactionRef ||
                  result.transaction_ref ||
                  `rl2-tx-${index}`;
                const expanded = expandedTx === key;
                const successful = result.executionStatus === "success";
                const details = transactionDetails(result);

                return (
                  <article
                    key={key}
                    className={`rounded-xl border ${
                      successful
                        ? "border-[#14f195]/18 bg-[#14f195]/7"
                        : "border-red-400/20 bg-red-500/8"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 px-3 py-3">
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            successful ? "text-zinc-200" : "text-red-200"
                          }`}
                        >
                          {yieldHijackTransactionTitle(result)}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          {yieldHijackTransactionDescription(result)}
                        </p>
                      </div>
                      {details.length ? (
                        <button
                          type="button"
                          onClick={() => setExpandedTx(expanded ? null : key)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
                          aria-label={
                            expanded
                              ? "Collapse transaction details"
                              : "Expand transaction details"
                          }
                        >
                          {expanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      ) : null}
                    </div>
                    {expanded ? (
                      <div className="space-y-3 border-t border-white/10 px-3 py-3">
                        {result.errorCode || result.error_code ? (
                          <StateRow
                            label="Technical detail"
                            value={result.errorCode ?? result.error_code ?? ""}
                          />
                        ) : null}
                        {normalizedDeltas(result).map((delta) => (
                          <StateRow
                            key={`${delta.label}-${delta.before}-${delta.after}`}
                            label={delta.label}
                            value={`${delta.before} → ${delta.after}`}
                          />
                        ))}
                        {result.logs.length ? (
                          <pre className="max-h-44 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-4 text-zinc-500">
                            {result.logs.join("\n")}
                          </pre>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-zinc-500">
              Submit a stake or reward claim. Successful and rejected attempts
              will appear here.
            </p>
          )}
        </section>

        <div className="space-y-5">
          <EvidenceSection title="Position Derivation">
            <StateRow
              label="Existing Staker Position"
              value={shortAddress(victimPda)}
            />
            <StateRow
              label="Your Position"
              value={shortAddress(attackerPda)}
            />
            <p className="pt-2 text-xs leading-5 text-zinc-500">
              {impactVerified
                ? "Both participant derivations resolved to the same staking position."
                : "Position derivation comparison recorded."}
            </p>
          </EvidenceSection>

          <EvidenceSection title="Ownership and Preserved Value">
            <StateRow label="Owner before" value="Existing Staker" />
            <StateRow
              label="Owner after stake"
              value={hasSuccessfulStake ? state.positionOwnerLabel : "Pending"}
            />
            <StateRow label="Existing principal" value="50,000 STAKE" />
            <StateRow
              label="Position after stake"
              value={`${formatAmount(state.positionStakedAmount)} STAKE`}
            />
            <StateRow
              label="Your contribution"
              value={`${formatAmount(state.attackerContribution)} STAKE`}
            />
          </EvidenceSection>

          <EvidenceSection title="Reward Transfer">
            <StateRow label="Pending before" value="12,500 REWARD" />
            <StateRow
              label="Your reward gain"
              value={`${formatAmount(state.attackerRewardBalance)} REWARD`}
            />
            <StateRow
              label="Reward vault delta"
              value={`${formatSignedAmount(
                state.rewardVaultBalance - BASELINE.rewardVaultBalance
              )} REWARD`}
            />
          </EvidenceSection>

          {impactVerified ? (
            <div className="rounded-xl border border-[#14f195]/25 bg-[#14f195]/8 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#8fffd0]">
                <Check className="h-4 w-4" />
                Impact verified
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-300">
                A small attacker deposit changed ownership of a pre-existing
                staking position, preserving its accumulated value and allowing
                the attacker to claim rewards they did not earn.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={onProveImpact}
              disabled={isRunning || !hasSuccessfulStake || !hasSuccessfulClaim}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#9945ff]/35 bg-[#9945ff]/18 px-5 text-sm font-semibold text-[#d7c0ff] shadow-[0_0_24px_rgba(153,69,255,0.18)] transition hover:bg-[#9945ff]/24 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-zinc-600 disabled:shadow-none"
            >
              <Play className="h-4 w-4" />
              {isRunning ? "Verifying..." : "Verify Impact"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EvidenceSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
        {title}
      </p>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function StateGroup({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
        {title}
      </p>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function StateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-mono text-zinc-300">{value}</span>
    </div>
  );
}

type YieldHijackState = {
  attackerContribution: number;
  attackerRewardBalance: number;
  attackerStakeBalance: number;
  pendingRewards: number;
  positionAddress: string;
  positionOwnerLabel: string;
  positionStakedAmount: number;
  rewardVaultBalance: number;
  stakeVaultBalance: number;
};

function deriveYieldHijackState(
  txResults: EnrichedTransactionResult[],
  accounts: SandboxAccountSummary[]
): YieldHijackState {
  const latestProtocolState =
    txResults.find(
      (result) =>
        result.protocolState &&
        typeof result.protocolState === "object" &&
        Object.keys(result.protocolState).length > 0
    )?.protocolState ?? null;
  const position = findAccount(accounts, "stake_position");
  const attackerStake = findAccount(accounts, "attacker_stake_account");
  const attackerReward = findAccount(accounts, "attacker_reward_account");
  const stakeVault = findAccount(accounts, "stake_vault");
  const rewardVault = findAccount(accounts, "reward_vault");
  const successfulStakeAmount = txResults
    .filter(
      (result) =>
        result.executionStatus === "success" &&
        result.instructionType.includes("STAKE") &&
        !result.instructionType.includes("CLAIM")
    )
    .reduce((sum, result) => sum + result.inputs.amount, 0);

  const attackerStakeBalance = numberFromSources(
    latestProtocolState,
    attackerStake?.data,
    ["attackerStakeBalance", "attacker_stake_balance", "stakeBalance", "balance"],
    Math.max(0, BASELINE.attackerStakeBalance - successfulStakeAmount)
  );
  const attackerRewardBalance = numberFromSources(
    latestProtocolState,
    attackerReward?.data,
    ["attackerRewardBalance", "attacker_reward_balance", "rewardBalance", "balance"],
    txResults.some(
      (result) =>
        result.executionStatus === "success" &&
        result.instructionType.includes("CLAIM")
    )
      ? BASELINE.pendingRewards
      : BASELINE.attackerRewardBalance
  );

  return {
    attackerContribution: successfulStakeAmount,
    attackerRewardBalance,
    attackerStakeBalance,
    pendingRewards: numberFromSources(
      latestProtocolState,
      position?.data,
      ["pendingRewards", "pending_rewards", "rewards"],
      attackerRewardBalance > 0 ? 0 : BASELINE.pendingRewards
    ),
    positionAddress:
      stringFromRecord(latestProtocolState, [
        "positionAddress",
        "position_address",
        "stakePositionAddress",
      ]) ??
      stringFromRecord(position?.data, ["address", "pubkey", "pda"]) ??
      position?.owner ??
      "Unavailable",
    positionOwnerLabel: friendlyOwner(
      stringFromRecord(latestProtocolState, [
        "positionOwner",
        "position_owner",
        "owner",
        "ownerLabel",
      ]) ??
        stringFromRecord(position?.data, [
          "position_owner",
          "positionOwner",
          "owner",
          "owner_label",
        ]),
      successfulStakeAmount > 0
    ),
    positionStakedAmount: numberFromSources(
      latestProtocolState,
      position?.data,
      ["positionStakedAmount", "position_staked_amount", "stakedAmount", "staked_amount", "amount"],
      BASELINE.positionStakedAmount + successfulStakeAmount
    ),
    rewardVaultBalance: numberFromSources(
      latestProtocolState,
      rewardVault?.data,
      ["rewardVaultBalance", "reward_vault_balance", "balance", "amount"],
      BASELINE.rewardVaultBalance - attackerRewardBalance
    ),
    stakeVaultBalance: numberFromSources(
      latestProtocolState,
      stakeVault?.data,
      ["stakeVaultBalance", "stake_vault_balance", "balance", "amount"],
      BASELINE.stakeVaultBalance + successfulStakeAmount
    ),
  };
}

function yieldHijackTransactionTitle(result: EnrichedTransactionResult) {
  const claim = result.instructionType.includes("CLAIM");
  if (result.executionStatus === "success") {
    return claim ? "Rewards claimed" : "Stake completed";
  }
  return claim ? "Claim rejected" : "Stake rejected";
}

function yieldHijackTransactionDescription(result: EnrichedTransactionResult) {
  if (result.executionStatus === "success") {
    return result.instructionType.includes("CLAIM")
      ? "Pending rewards moved from the protocol vault to your reward account."
      : `${formatAmount(result.inputs.amount)} STAKE submitted to the current position.`;
  }
  const code = result.errorCode ?? result.error_code ?? result.logs.at(-1) ?? "";
  const normalized = code.toLowerCase();
  if (normalized.includes("position_owner")) {
    return "The current signer does not own this staking position.";
  }
  if (normalized.includes("no reward") || normalized.includes("pending")) {
    return "No pending rewards remain in this position.";
  }
  return "The backend rejected this action without changing protocol state.";
}

function transactionDetails(result: EnrichedTransactionResult) {
  return [
    result.errorCode,
    result.error_code,
    ...result.logs,
    ...normalizedDeltas(result).map(
      (delta) => `${delta.label}: ${delta.before} -> ${delta.after}`
    ),
  ].filter(Boolean);
}

function normalizedDeltas(result: EnrichedTransactionResult) {
  const raw = result.accountDeltas ?? result.account_deltas ?? [];
  return raw
    .map((delta, index) => {
      const label =
        stringFromRecord(delta, [
          "label",
          "field",
          "account_label",
          "accountLabel",
          "account_ref",
          "accountRef",
        ]) ?? `State delta ${index + 1}`;
      const before = valueFromRecord(delta, [
        "before",
        "before_value",
        "beforeValue",
        "old",
      ]);
      const after = valueFromRecord(delta, [
        "after",
        "after_value",
        "afterValue",
        "new",
      ]);
      return {
        label: humanize(label),
        before: formatUnknown(before),
        after: formatUnknown(after),
      };
    })
    .filter((delta) => delta.before !== "Unavailable" || delta.after !== "Unavailable");
}

function findAccount(accounts: SandboxAccountSummary[], ref: string) {
  return accounts.find((account) => account.ref === ref);
}

function numberFromSources(
  primary: Record<string, unknown> | null,
  secondary: Record<string, unknown> | undefined,
  keys: string[],
  fallback: number
) {
  for (const source of [primary, secondary]) {
    for (const key of keys) {
      const value = source?.[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && Number.isFinite(Number(value))) {
        return Number(value);
      }
    }
  }
  return fallback;
}

function stringFromRecord(
  record: Record<string, unknown> | null | undefined,
  keys: string[]
) {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function valueFromRecord(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in record) return record[key];
  }
  return undefined;
}

function friendlyOwner(value: string | null, stakeObserved: boolean) {
  const normalized = value?.toLowerCase() ?? "";
  if (
    stakeObserved ||
    normalized.includes("attacker") ||
    normalized.includes("learner")
  ) {
    return "Your Wallet";
  }
  return "Existing Staker";
}

function parseStakeAmount(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : 0;
}

function formatAmount(value: number) {
  return Math.max(0, value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function formatSignedAmount(value: number) {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : ""}${value.toLocaleString("en-US")}`;
}

function formatUnknown(value: unknown) {
  if (typeof value === "number") return value.toLocaleString("en-US");
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  return "Unavailable";
}

function humanize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function shortAddress(value: string) {
  if (!value || value === "Unavailable") return value;
  return value.length > 14 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}
