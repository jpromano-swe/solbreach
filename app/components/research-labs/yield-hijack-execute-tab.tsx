"use client";

import Image from "next/image";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Play,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";

import type {
  LabTransactionPayload,
  SandboxAccountSummary,
} from "../../lib/research-labs/lab-state";
import type { EnrichedTransactionResult, ExecuteExploitView } from "./types";
import {
  AnimatedContentSwitch,
  EXECUTE_EXPLOIT_VIEW_TRANSITION_ORDER,
} from "./workspace-tabs";

const BASELINE = {
  userPendingRewards: 250,
  userPositionStakedAmount: 1_000,
  userRewardBalance: 0,
  userStakeBalance: 100,
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
  explorerAccessToken,
  explorerSessionId,
  userWalletAddress,
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
  explorerAccessToken: string | null;
  explorerSessionId: string;
  userWalletAddress: string;
  txResults: EnrichedTransactionResult[];
  onChangeView: (view: ExecuteExploitView) => void;
  onExecuteTransaction: (payload: LabTransactionPayload) => Promise<void>;
  onOpenEvidenceReview: () => void;
  onProveImpact: () => void;
}) {
  const [stakeAmount, setStakeAmount] = useState("1");
  const [claimInstruction, setClaimInstruction] = useState("");
  const [targetWallet, setTargetWallet] = useState("");
  const [pendingAction, setPendingAction] = useState<
    "stake" | "claim-target" | "claim-own" | null
  >(null);
  const explorerUrl = `/research-labs/explorer?sessionId=${encodeURIComponent(
    explorerSessionId
  )}`;
  const state = useMemo(
    () => deriveYieldHijackState(txResults, evidenceAccounts),
    [evidenceAccounts, txResults]
  );
  const parsedAmount = parseStakeAmount(stakeAmount);
  const canStake =
    parsedAmount >= 1 &&
    parsedAmount <= Math.min(100, state.userStakeBalance) &&
    !isRunning &&
    pendingAction === null;
  const canClaim =
    claimInstruction.trim().length > 0 &&
    targetWallet.trim().length > 0 &&
    !isRunning &&
    pendingAction === null;
  const targetMatchesCandidate = state.rewardCandidates.some(
    (candidate) => candidate.walletAddress === targetWallet.trim()
  );

  const submitStake = async () => {
    if (!canStake) return;
    setPendingAction("stake");
    try {
      await onExecuteTransaction({
        action_type: "STAKE",
        amount: parsedAmount,
        source_account_ref: "user_stake_account",
        stake_vault_ref: "stake_vault",
        position_account_ref: "stake_position",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const claimRewards = async () => {
    if (!canClaim) return;
    setPendingAction("claim-target");
    try {
      await onExecuteTransaction({
        action_type: "CLAIM_REWARDS",
        position_account_ref: "stake_position",
        reward_vault_ref: "reward_vault",
        destination_account_ref: "user_reward_account",
        instruction_name: claimInstruction.trim(),
        target_wallet_address: targetWallet.trim(),
      });
    } finally {
      setPendingAction(null);
    }
  };

  const claimOwnRewards = async () => {
    if (
      state.userPendingRewards <= 0 ||
      !state.userWallet ||
      isRunning ||
      pendingAction !== null
    ) {
      return;
    }
    setPendingAction("claim-own");
    try {
      await onExecuteTransaction({
        action_type: "CLAIM_REWARDS",
        position_account_ref: "stake_position",
        reward_vault_ref: "reward_vault",
        destination_account_ref: "user_reward_account",
        instruction_name: "claim_rewards",
        target_wallet_address: state.userWallet,
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

      <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(280px,0.52fr)_minmax(0,1.48fr)]">
        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <div>
            <p className="text-sm font-semibold text-zinc-100">
              Exploiter Interface
            </p>
            <p className="mt-1.5 text-xs leading-5 text-zinc-500">
              Contribute to the shared position, then target a wallet with
              unclaimed rewards.
            </p>
          </div>

          <div className="mt-4 border-t border-white/10 pt-4">
            <div>
              <div>
                <label
                  htmlFor="rl2-stake-amount"
                  className="text-xs font-semibold text-zinc-200"
                >
                  Stake
                </label>
                <p className="mt-1 text-[11px] text-zinc-600">
                  Overwrite the shared position owner.
                </p>
              </div>
              <span className="font-mono text-[11px] text-zinc-500">
                {formatAmount(state.userStakeBalance)} available
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                id="rl2-stake-amount"
                aria-label="Amount to stake"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={stakeAmount}
                disabled={isRunning || pendingAction !== null}
                onChange={(event) =>
                  setStakeAmount(event.target.value.replace(/\D/g, ""))
                }
                className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 font-mono text-xs text-zinc-100 outline-none transition focus:border-[#14f195]/45 focus-visible:ring-2 focus-visible:ring-[#14f195]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b] disabled:opacity-55"
              />
              <button
                type="button"
                onClick={() => void submitStake()}
                disabled={!canStake}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-[#14f195]/25 bg-[#14f195]/10 px-3 text-xs font-semibold text-[#8fffd0] transition hover:bg-[#14f195]/15 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-zinc-600"
              >
                {pendingAction === "stake" ? "Staking..." : "Stake"}
              </button>
            </div>
          </div>

          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <label
                  htmlFor="rl2-target-wallet"
                  className="text-xs font-semibold text-zinc-200"
                >
                  Claim Rewards
                </label>
                <p className="mt-1 text-[11px] leading-5 text-zinc-600">
                  Use the program instruction and a wallet discovered through
                  Explorer.
                </p>
              </div>
            </div>
            <ExplorerRouteLink
              available={Boolean(explorerAccessToken)}
              className="mt-3 min-h-10 w-full justify-center px-3 text-xs"
              href={explorerUrl}
            />
            <div className="mt-3 grid gap-2">
              <div>
                <label
                  htmlFor="rl2-claim-instruction"
                  className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600"
                >
                  Program instruction
                </label>
                <input
                  id="rl2-claim-instruction"
                  type="text"
                  value={claimInstruction}
                  disabled={isRunning || pendingAction !== null}
                  onChange={(event) =>
                    setClaimInstruction(event.target.value.trim())
                  }
                  placeholder="Paste instruction name"
                  autoComplete="off"
                  spellCheck={false}
                  className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 font-mono text-[11px] text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-[#9945ff]/50 focus-visible:ring-2 focus-visible:ring-[#14f195]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b] disabled:opacity-55"
                />
              </div>
              <div>
                <label
                  htmlFor="rl2-target-wallet"
                  className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600"
                >
                  Target wallet
                </label>
                <input
                  id="rl2-target-wallet"
                  type="text"
                  value={targetWallet}
                  disabled={isRunning || pendingAction !== null}
                  onChange={(event) =>
                    setTargetWallet(event.target.value.trim())
                  }
                  placeholder="Paste target wallet"
                  autoComplete="off"
                  spellCheck={false}
                  className={`mt-1.5 h-10 w-full rounded-lg border bg-black/30 px-3 font-mono text-[11px] text-zinc-100 outline-none transition placeholder:text-zinc-700 focus-visible:ring-2 focus-visible:ring-[#14f195]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b] disabled:opacity-55 ${
                    targetWallet
                      ? targetMatchesCandidate
                        ? "border-[#14f195]/45"
                        : "border-amber-300/35"
                      : "border-white/10 focus:border-[#9945ff]/50"
                  }`}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => void claimRewards()}
              disabled={!canClaim}
              className="mt-2 inline-flex h-10 items-center justify-center rounded-lg border border-[#9945ff]/30 bg-[#9945ff]/12 px-3 text-xs font-semibold text-[#d7c0ff] transition hover:bg-[#9945ff]/18 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-zinc-600"
            >
              {pendingAction === "claim-target"
                ? "Claiming..."
                : "Claim Rewards"}
            </button>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/10 pt-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
                Latest Action
              </p>
              <p className="mt-1 truncate text-[11px] text-zinc-400">
                {txResults[0]
                  ? yieldHijackTransactionTitle(txResults[0])
                  : "No transactions submitted yet."}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenEvidenceReview}
              disabled={txResults.length === 0}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[#9945ff]/25 bg-[#9945ff]/10 px-3 text-[11px] font-semibold text-[#c7a6ff] transition hover:bg-[#9945ff]/16 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Evidence
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </section>

        <YieldHijackProtocolState
          state={state}
          explorerAvailable={Boolean(explorerAccessToken)}
          explorerUrl={explorerUrl}
          isRunning={isRunning || pendingAction !== null}
          userWalletAddress={userWalletAddress}
          onClaimOwnRewards={claimOwnRewards}
        />
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
              className={`min-h-10 rounded-lg px-3 text-sm transition focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b] ${
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

function ExplorerRouteLink({
  available,
  className,
  href,
}: {
  available: boolean;
  className: string;
  href: string;
}) {
  const sharedClassName = `inline-flex items-center gap-2 rounded-lg border font-semibold transition focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b] ${className}`;

  if (!available) {
    return (
      <button
        type="button"
        disabled
        className={`${sharedClassName} cursor-not-allowed border-white/10 bg-white/[0.03] text-zinc-600`}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        Open SolBreach Explorer
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${sharedClassName} border-[#9945ff]/30 bg-[#9945ff]/12 text-[#d7c0ff] hover:bg-[#9945ff]/18`}
    >
      <Search className="h-4 w-4" aria-hidden="true" />
      Open SolBreach Explorer
    </a>
  );
}

function YieldHijackProtocolState({
  state,
  explorerAvailable,
  explorerUrl,
  isRunning,
  userWalletAddress,
  onClaimOwnRewards,
}: {
  state: YieldHijackState;
  explorerAvailable: boolean;
  explorerUrl: string;
  isRunning: boolean;
  userWalletAddress: string;
  onClaimOwnRewards: () => void;
}) {
  const [rewardsVisible, setRewardsVisible] = useState(true);

  return (
    <aside className="h-fit overflow-hidden rounded-2xl border border-white/10 bg-[#08090b]">
      <div className="border-b border-white/10 bg-white/[0.025] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
              BreachStake
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              Rewards Program
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#14f195]/25 bg-[#14f195]/8 px-2.5 py-1 text-[10px] font-medium text-[#8fffd0]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#14f195]" />
            Live
          </span>
        </div>
      </div>

      <div className="p-5">
        <section className="rounded-xl border border-white/10 bg-white/[0.025] px-5 py-5 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <p className="text-xs font-medium text-zinc-500">
              Pool rewards payed
            </p>
            <button
              type="button"
              onClick={() => setRewardsVisible((visible) => !visible)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b]"
              aria-label={
                rewardsVisible
                  ? "Hide pool rewards payed"
                  : "Show pool rewards payed"
              }
            >
              {rewardsVisible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="mt-1 flex justify-center">
            <div className="relative text-center">
              <Image
                src="/usdc.png"
                alt="USDC"
                width={42}
                height={42}
                className="absolute right-full top-1/2 mr-3 h-9 w-9 -translate-y-1/2 rounded-full sm:h-10 sm:w-10"
              />
              <p className="font-mono text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                {rewardsVisible
                  ? `$${formatAmount(state.totalRewardsPaid)}`
                  : "$••••••"}
              </p>
              <p className="mt-2 text-[10px] font-semibold tracking-[0.18em] text-[#8fffd0]">
                USDC in rewards
              </p>
            </div>
          </div>
        </section>

        <ExplorerRouteLink
          available={explorerAvailable}
          className="mt-5 min-h-11 px-4 text-sm"
          href={explorerUrl}
        />

        <div className="mt-5 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-[minmax(140px,1fr)_minmax(110px,0.75fr)_minmax(125px,0.85fr)_minmax(130px,0.85fr)_140px] gap-3 border-b border-white/10 px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
              <span>User&apos;s position</span>
              <span className="text-right">Current position</span>
              <span className="text-right">Claimable rewards</span>
              <span className="text-right">Total claimed reward</span>
              <span aria-hidden="true" />
            </div>
            <div className="grid grid-cols-[minmax(140px,1fr)_minmax(110px,0.75fr)_minmax(125px,0.85fr)_minmax(130px,0.85fr)_140px] items-center gap-3 px-3 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-medium text-zinc-200">
                  {shortAddress(userWalletAddress)}
                </p>
              </div>
              <p className="text-right font-mono text-sm font-semibold text-zinc-300">
                {formatAmount(state.userPositionStakedAmount)} STAKE
              </p>
              <p className="text-right font-mono text-sm font-semibold text-[#8fffd0]">
                {formatAmount(state.userPendingRewards)} USDC
              </p>
              <p className="text-right font-mono text-sm font-semibold text-[#d7c0ff]">
                {formatAmount(state.userRewardBalance)} USDC
              </p>
              <button
                type="button"
                onClick={onClaimOwnRewards}
                disabled={isRunning || state.userPendingRewards <= 0}
                className="inline-flex min-h-9 w-full items-center justify-center whitespace-nowrap rounded-lg border border-[#14f195]/25 bg-[#14f195]/10 px-2 text-xs font-semibold text-[#8fffd0] transition hover:bg-[#14f195]/15 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-zinc-600"
              >
                Claim rewards
              </button>
            </div>
          </div>
        </div>
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
      result.executionStatus === "success" &&
      result.inputs.claimScope !== "own"
  );
  const position = findAccount(evidenceAccounts, "stake_position");
  const existingStakerPda =
    stringFromRecord(position?.data, [
      "existing_staker_position_address",
      "existingStakerPositionAddress",
      "existing_staker_pda",
    ]) ?? state.positionAddress;
  const userPda =
    stringFromRecord(position?.data, [
      "user_position_address",
      "userPositionAddress",
      "user_pda",
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
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b]"
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
              value={shortAddress(existingStakerPda)}
            />
            <StateRow label="Your Position" value={shortAddress(userPda)} />
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
              value={`${formatAmount(state.userContribution)} STAKE`}
            />
          </EvidenceSection>

          <AccountStateDeltas
            userRewardBalance={state.userRewardBalance}
            existingStakerRewardBalance={state.pendingRewards}
          />

          {impactVerified ? (
            <div className="rounded-xl border border-[#14f195]/25 bg-[#14f195]/8 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#8fffd0]">
                <Check className="h-4 w-4" />
                Impacte Verified
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

function AccountStateDeltas({
  userRewardBalance,
  existingStakerRewardBalance,
}: {
  userRewardBalance: number;
  existingStakerRewardBalance: number;
}) {
  return (
    <section>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
        Account State Deltas
      </p>
      <div className="mt-3 space-y-3">
        <BalanceDeltaCard
          label="Your Reward Balance"
          initialValue={BASELINE.userRewardBalance}
          currentValue={userRewardBalance}
        />
        <BalanceDeltaCard
          label="Existing Staker Reward Balance"
          initialValue={BASELINE.pendingRewards}
          currentValue={existingStakerRewardBalance}
        />
      </div>
    </section>
  );
}

function BalanceDeltaCard({
  currentValue,
  initialValue,
  label,
}: {
  currentValue: number;
  initialValue: number;
  label: string;
}) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-center gap-2">
        <BalanceValue label="Initial balance" value={initialValue} />
        <ArrowRight className="h-4 w-4 justify-self-center text-zinc-700" />
        <BalanceValue label="Current balance" value={currentValue} />
      </div>
    </article>
  );
}

function BalanceValue({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-xs text-zinc-300">
        {formatAmount(value)} REWARD
      </p>
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
  userContribution: number;
  userPendingRewards: number;
  userPositionStakedAmount: number;
  userRewardBalance: number;
  userStakeBalance: number;
  userWallet: string;
  pendingRewards: number;
  positionAddress: string;
  positionOwnerLabel: string;
  positionStakedAmount: number;
  rewardCandidates: Array<{
    pendingRewards: number;
    positionAddress: string;
    walletAddress: string;
  }>;
  rewardVaultBalance: number;
  stakeVaultBalance: number;
  totalRewardsPaid: number;
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
  const protocolUser =
    recordFromRecord(latestProtocolState, ["user"]) ??
    recordFromRecord(latestProtocolState, ["attacker"]);
  const protocolPool = recordFromRecord(latestProtocolState, ["pool"]);
  const protocolPosition = recordFromRecord(latestProtocolState, ["position"]);
  const protocolExistingStaker =
    recordFromRecord(latestProtocolState, [
      "existingStaker",
      "existing_staker",
    ]) ?? recordFromRecord(latestProtocolState, ["victim"]);
  const poolConfig = findAccount(accounts, "pool_config");
  const position = findAccount(accounts, "stake_position");
  const userStake = findAccount(accounts, "user_stake_account");
  const userReward = findAccount(accounts, "user_reward_account");
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

  const userStakeBalance = numberFromSources(
    protocolUser,
    userStake?.data,
    ["stakeBalance", "stake_balance", "balance"],
    Math.max(0, BASELINE.userStakeBalance - successfulStakeAmount)
  );
  const userRewardBalance = numberFromSources(
    protocolUser,
    userReward?.data,
    ["rewardBalance", "reward_balance", "balance"],
    BASELINE.userRewardBalance
  );
  const userWallet =
    stringFromRecord(protocolUser, ["wallet", "walletAddress"]) ??
    stringFromRecord(userReward?.data, ["owner", "wallet", "walletAddress"]) ??
    "";
  const userPendingRewards = numberFromSources(
    protocolUser,
    userReward?.data,
    [
      "pendingRewards",
      "pending_rewards",
      "claimableRewards",
      "claimable_rewards",
    ],
    BASELINE.userPendingRewards
  );
  const userPositionStakedAmount = numberFromSources(
    protocolUser,
    undefined,
    ["positionStakedAmount", "position_staked_amount"],
    BASELINE.userPositionStakedAmount + successfulStakeAmount
  );
  const pendingRewards = numberFromSources(
    protocolPosition,
    position?.data,
    ["pendingRewards", "pending_rewards", "rewards"],
    BASELINE.pendingRewards
  );
  const positionAddress =
    stringFromRecord(protocolPosition, ["address", "positionAddress"]) ??
    stringFromRecord(position?.data, ["address", "pubkey", "pda"]) ??
    position?.owner ??
    "Unavailable";
  const rawCandidates = arrayFromRecord(latestProtocolState, [
    "rewardCandidates",
    "reward_candidates",
  ]);
  const existingStakerWallet =
    stringFromRecord(protocolExistingStaker, ["wallet", "walletAddress"]) ??
    stringFromRecord(protocolPosition, ["baselineOwner", "baseline_owner"]) ??
    stringFromRecord(position?.data, ["baselineOwner", "baseline_owner"]);
  const rewardCandidates =
    rawCandidates === null
      ? existingStakerWallet && pendingRewards > 0
        ? [
            {
              walletAddress: existingStakerWallet,
              pendingRewards,
              positionAddress,
            },
          ]
        : []
      : rawCandidates
          .map((candidate) => {
            const walletAddress = stringFromRecord(candidate, [
              "walletAddress",
              "wallet_address",
              "wallet",
            ]);
            if (!walletAddress) return null;
            return {
              walletAddress,
              pendingRewards: numberFromSources(
                candidate,
                undefined,
                ["pendingRewards", "pending_rewards", "amount"],
                0
              ),
              positionAddress:
                stringFromRecord(candidate, [
                  "positionAddress",
                  "position_address",
                ]) ?? positionAddress,
            };
          })
          .filter(
            (
              candidate
            ): candidate is {
              pendingRewards: number;
              positionAddress: string;
              walletAddress: string;
            } => candidate !== null
          );

  return {
    userContribution: successfulStakeAmount,
    userPendingRewards,
    userPositionStakedAmount,
    userRewardBalance,
    userStakeBalance,
    userWallet,
    pendingRewards,
    positionAddress,
    positionOwnerLabel: friendlyOwner(
      stringFromRecord(protocolPosition, ["owner", "ownerLabel"]) ??
        stringFromRecord(position?.data, [
          "position_owner",
          "positionOwner",
          "owner",
          "owner_label",
        ]),
      successfulStakeAmount > 0
    ),
    positionStakedAmount: numberFromSources(
      protocolPosition,
      position?.data,
      ["stakedAmount", "staked_amount", "amount"],
      BASELINE.positionStakedAmount + successfulStakeAmount
    ),
    rewardCandidates,
    rewardVaultBalance: numberFromSources(
      protocolPool,
      rewardVault?.data,
      ["rewardVaultBalance", "reward_vault_balance", "balance", "amount"],
      BASELINE.rewardVaultBalance - userRewardBalance
    ),
    stakeVaultBalance: numberFromSources(
      protocolPool,
      stakeVault?.data,
      ["stakeVaultBalance", "stake_vault_balance", "balance", "amount"],
      BASELINE.stakeVaultBalance + successfulStakeAmount
    ),
    totalRewardsPaid: numberFromSources(
      latestProtocolState,
      poolConfig?.data,
      [
        "totalRewardsPaid",
        "total_rewards_paid",
        "rewardsClaimedTotal",
        "rewards_claimed_total",
      ],
      userRewardBalance
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
  const code =
    result.errorCode ?? result.error_code ?? result.logs.at(-1) ?? "";
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
        "valueBefore",
        "old",
      ]);
      const after = valueFromRecord(delta, [
        "after",
        "after_value",
        "afterValue",
        "valueAfter",
        "new",
      ]);
      return {
        label: humanize(label),
        before: formatUnknown(before),
        after: formatUnknown(after),
      };
    })
    .filter(
      (delta) => delta.before !== "Unavailable" || delta.after !== "Unavailable"
    );
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

function recordFromRecord(
  record: Record<string, unknown> | null | undefined,
  keys: string[]
) {
  for (const key of keys) {
    const value = record?.[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return null;
}

function arrayFromRecord(
  record: Record<string, unknown> | null | undefined,
  keys: string[]
) {
  for (const key of keys) {
    const value = record?.[key];
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item)
      );
    }
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
  return value.length > 14
    ? `${value.slice(0, 6)}...${value.slice(-4)}`
    : value;
}
