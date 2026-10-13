"use client";

import { ArrowRight, Check, ChevronDown, ChevronUp, Play } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import type {
  LabTransactionPayload,
  SandboxAccountSummary,
} from "../../lib/research-labs/lab-state";
import { ArbitraryCpiHypothesisWorkspace } from "./arbitrary-cpi-hypothesis-workspace";
import type { EnrichedTransactionResult, ExecuteExploitView } from "./types";
import {
  AnimatedContentSwitch,
  EXECUTE_EXPLOIT_VIEW_TRANSITION_ORDER,
} from "./workspace-tabs";

const BASELINE = {
  bountyEscrow: 750,
  bountyPoolTotal: 3_000,
  bountyPoolAvailable: 3_000,
  bountyPoolPaidOut: 0,
  attackerRewardBalance: 0,
};

type DelegateProgramRef = "official_payout_router" | "attacker_cpi_program";

export function ArbitraryCpiExecuteTab({
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
  const [delegateProgramRef, setDelegateProgramRef] =
    useState<DelegateProgramRef>("official_payout_router");
  const [instructionName, setInstructionName] = useState("");
  const [rewardAmount, setRewardAmount] = useState("750");
  const [pendingAction, setPendingAction] = useState<
    "build" | "deploy" | "delegate" | "execute" | null
  >(null);
  const explorerUrl = `/research-labs/explorer?sessionId=${encodeURIComponent(
    explorerSessionId
  )}`;
  const state = useMemo(
    () => deriveArbitraryCpiState(txResults, evidenceAccounts),
    [evidenceAccounts, txResults]
  );
  const amountValue = Math.max(0, Number.parseInt(rewardAmount, 10) || 0);
  const hasBuild = hasSuccessfulAction(txResults, "BUILD_ATTACKER_PROGRAM");
  const hasDeploy = hasSuccessfulAction(txResults, "DEPLOY_ATTACKER_PROGRAM");
  const hasDelegation = hasSuccessfulAction(txResults, "SUBMIT_DELEGATION");
  const hasCpiExecution = hasSuccessfulAction(
    txResults,
    "EXECUTE_DELEGATED_CPI"
  );
  const busy = isRunning || pendingAction !== null;

  const buildAndDeployProgram = async () => {
    if (busy || hasDeploy) return;
    try {
      if (!hasBuild) {
        setPendingAction("build");
        await onExecuteTransaction({
          action_type: "BUILD_ATTACKER_PROGRAM",
          program_template: "cpi_drain_router",
          entrypoint_name: "execute",
          transfer_source_ref: "task_escrow",
          transfer_destination_ref: "attacker_reward_account",
          authority_strategy: "reuse_delegated_signer",
        });
      }
      setPendingAction("deploy");
      await onExecuteTransaction({
        action_type: "DEPLOY_ATTACKER_PROGRAM",
        artifact_ref: "attacker_program_build",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const submitDelegation = async () => {
    if (busy || !hasDeploy) return;
    setPendingAction("delegate");
    try {
      await onExecuteTransaction({
        action_type: "SUBMIT_DELEGATION",
        task_ref: "task_record",
        delegate_program_ref: "official_payout_router",
        reward_amount: amountValue || BASELINE.bountyEscrow,
      });
    } finally {
      setPendingAction(null);
    }
  };

  const executeDelegatedCpi = async () => {
    if (busy || !hasDelegation || !instructionName.trim() || amountValue <= 0) {
      return;
    }
    setPendingAction("execute");
    try {
      await onExecuteTransaction({
        action_type: "EXECUTE_DELEGATED_CPI",
        task_ref: "task_record",
        delegate_program_ref: delegateProgramRef,
        destination_account_ref: "attacker_reward_account",
        amount: amountValue,
        instruction_name: instructionName.trim(),
      });
    } finally {
      setPendingAction(null);
    }
  };

  const hypothesis = (
    <ArbitraryCpiHypothesisWorkspace
      busy={busy}
      delegateProgramRef={delegateProgramRef}
      explorerAvailable={Boolean(explorerAccessToken)}
      explorerUrl={explorerUrl}
      hasBuild={hasBuild}
      hasCpiExecution={hasCpiExecution}
      hasDelegation={hasDelegation}
      hasDeploy={hasDeploy}
      instructionName={instructionName}
      latestAction={
        txResults[0]
          ? arbitraryCpiTransactionTitle(txResults[0])
          : "No transactions submitted yet."
      }
      pendingAction={pendingAction}
      rewardAmount={rewardAmount}
      userWalletAddress={userWalletAddress}
      onBuildAndDeploy={buildAndDeployProgram}
      onDelegateProgramChange={setDelegateProgramRef}
      onExecuteDelegatedCpi={executeDelegatedCpi}
      onInstructionNameChange={setInstructionName}
      onOpenEvidenceReview={onOpenEvidenceReview}
      onRewardAmountChange={setRewardAmount}
      onSubmitDelegation={submitDelegation}
    />
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
          <ArbitraryCpiEvidenceReview
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

function ArbitraryCpiEvidenceReview({
  impactVerified,
  isRunning,
  state,
  txResults,
  onProveImpact,
}: {
  impactVerified: boolean;
  isRunning: boolean;
  state: ArbitraryCpiState;
  txResults: EnrichedTransactionResult[];
  onProveImpact: () => void;
}) {
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const orderedTransactions = [...txResults].reverse();
  const hasSuccessfulExecution = hasSuccessfulAction(
    txResults,
    "EXECUTE_DELEGATED_CPI"
  );

  return (
    <div className="mt-5">
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
        Prove what changed.
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
        Review the build, deployment, delegation, CPI target, and balance
        movement before verifying impact.
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
                  `rl3-tx-${index}`;
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
                          {arbitraryCpiTransactionTitle(result)}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          {arbitraryCpiTransactionDescription(result)}
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
              Submit a build, deploy, authorization, or CPI execution.
              Successful and rejected attempts will appear here.
            </p>
          )}
        </section>

        <div className="space-y-5">
          <EvidenceSection title="CPI Target">
            <StateRow label="Approved router" value="Official Payout Router" />
            <StateRow label="Selected route" value={state.cpiTargetLabel} />
            <StateRow
              label="Route updated"
              value={state.targetReplaced ? "Yes" : "No"}
            />
          </EvidenceSection>

          <EvidenceSection title="Account State Deltas">
            <BalanceDeltaCard
              label="Task Escrow"
              initialValue={BASELINE.bountyEscrow}
              currentValue={state.taskEscrowBalance}
            />
            <BalanceDeltaCard
              label="Your Reward Account"
              initialValue={BASELINE.attackerRewardBalance}
              currentValue={state.attackerRewardBalance}
            />
            <BalanceDeltaCard
              label="Bounty Paid"
              initialValue={BASELINE.bountyPoolPaidOut}
              currentValue={state.bountyPoolPaidOut}
            />
          </EvidenceSection>

          {impactVerified ? (
            <button
              type="button"
              disabled
              className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-zinc-500"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Verified Impact
            </button>
          ) : (
            <button
              type="button"
              onClick={onProveImpact}
              disabled={isRunning || !hasSuccessfulExecution}
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
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
        {title}
      </p>
      <div className="mt-3 space-y-3">{children}</div>
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
        <BalanceValue
          label="Current balance"
          value={currentValue}
          highlighted={currentValue !== initialValue}
        />
      </div>
    </article>
  );
}

function BalanceValue({
  highlighted = false,
  label,
  value,
}: {
  highlighted?: boolean;
  label: string;
  value: number;
}) {
  return (
    <div
      className={`min-w-0 rounded-lg border px-3 py-2.5 ${
        highlighted
          ? "border-[#14f195]/30 bg-[#14f195]/8 shadow-[inset_0_0_20px_rgba(20,241,149,0.035)]"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <p
        className={`text-[9px] font-semibold uppercase tracking-[0.16em] ${
          highlighted ? "text-[#79d9b2]" : "text-zinc-600"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 truncate font-mono text-xs ${
          highlighted ? "text-[#b5f7d8]" : "text-zinc-300"
        }`}
      >
        {formatAmount(value)} USDC
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

type ArbitraryCpiState = {
  attackerRewardBalance: number;
  bountyPoolAvailable: number;
  bountyPoolPaidOut: number;
  bountyPoolTotal: number;
  cpiTargetLabel: string;
  targetReplaced: boolean;
  taskEscrowBalance: number;
};

function deriveArbitraryCpiState(
  txResults: EnrichedTransactionResult[],
  accounts: SandboxAccountSummary[]
): ArbitraryCpiState {
  const latestProtocolState =
    txResults.find((result) => {
      const protocolState = result.protocolState ?? result.protocol_state;
      return (
        protocolState &&
        typeof protocolState === "object" &&
        Object.keys(protocolState).length > 0
      );
    })?.protocolState ??
    txResults.find((result) => {
      const protocolState = result.protocolState ?? result.protocol_state;
      return (
        protocolState &&
        typeof protocolState === "object" &&
        Object.keys(protocolState).length > 0
      );
    })?.protocol_state ??
    null;
  const bountyPool =
    recordFromRecord(latestProtocolState, ["bountyPool", "bounty_pool"]) ??
    recordFromRecord(latestProtocolState, ["pool"]);
  const task = recordFromRecord(latestProtocolState, ["task", "taskRecord"]);
  const attacker = recordFromRecord(latestProtocolState, ["attacker", "user"]);
  const cpi = recordFromRecord(latestProtocolState, ["cpi"]);
  const bountyVault = findAccount(accounts, "bounty_vault");
  const taskEscrow = findAccount(accounts, "task_escrow");
  const attackerReward = findAccount(accounts, "attacker_reward_account");
  const successfulExecution = txResults.some(
    (result) =>
      result.executionStatus === "success" &&
      result.instructionType.includes("EXECUTE_DELEGATED_CPI")
  );

  const taskEscrowBalance = numberFromSources(
    task,
    taskEscrow?.data,
    ["escrowBalance", "escrow_balance", "balance", "amount"],
    successfulExecution ? 0 : BASELINE.bountyEscrow
  );
  const attackerRewardBalance = numberFromSources(
    attacker,
    attackerReward?.data,
    ["rewardBalance", "reward_balance", "balance", "amount"],
    successfulExecution ? BASELINE.bountyEscrow : BASELINE.attackerRewardBalance
  );
  const bountyPoolPaidOut = numberFromSources(
    bountyPool,
    bountyVault?.data,
    ["paidOut", "paid_out", "totalPaidOut", "total_paid_out"],
    attackerRewardBalance
  );

  const delegateProgram =
    stringFromRecord(cpi, [
      "delegateProgramRef",
      "delegate_program_ref",
      "targetProgramRef",
      "target_program_ref",
    ]) ??
    txResults.find(
      (result) =>
        result.executionStatus === "success" &&
        result.instructionType.includes("EXECUTE_DELEGATED_CPI")
    )?.inputs.delegateProgramRef ??
    "official_payout_router";

  return {
    attackerRewardBalance,
    bountyPoolAvailable: numberFromSources(
      bountyPool,
      bountyVault?.data,
      ["availableLiquidity", "available_liquidity", "available", "balance"],
      Math.max(0, BASELINE.bountyPoolAvailable - bountyPoolPaidOut)
    ),
    bountyPoolPaidOut,
    bountyPoolTotal: numberFromSources(
      bountyPool,
      bountyVault?.data,
      ["totalEscrowed", "total_escrowed", "total"],
      BASELINE.bountyPoolTotal
    ),
    cpiTargetLabel:
      delegateProgram === "attacker_cpi_program"
        ? "Session Payout Program"
        : "Official Payout Router",
    targetReplaced:
      Boolean(cpi?.targetReplaced ?? cpi?.target_replaced) ||
      delegateProgram === "attacker_cpi_program",
    taskEscrowBalance,
  };
}

function hasSuccessfulAction(
  txResults: EnrichedTransactionResult[],
  actionType: string
) {
  return txResults.some(
    (result) =>
      result.executionStatus === "success" &&
      result.instructionType.includes(actionType)
  );
}

function arbitraryCpiTransactionTitle(result: EnrichedTransactionResult) {
  const action = result.instructionType;
  const failed = result.executionStatus !== "success";

  if (action.includes("BUILD_ATTACKER_PROGRAM")) {
    return failed ? "Build rejected" : "Payout program built";
  }
  if (action.includes("DEPLOY_ATTACKER_PROGRAM")) {
    return failed ? "Deployment rejected" : "Payout program deployed";
  }
  if (action.includes("SUBMIT_DELEGATION")) {
    return failed ? "Delegation rejected" : "Delegation submitted";
  }
  if (action.includes("EXECUTE_DELEGATED_CPI")) {
    return failed ? "Delegated CPI rejected" : "Delegated CPI executed";
  }
  return failed ? "Action rejected" : "Action executed";
}

function arbitraryCpiTransactionDescription(result: EnrichedTransactionResult) {
  if (result.executionStatus === "success") {
    if (result.instructionType.includes("BUILD_ATTACKER_PROGRAM")) {
      return "A session-scoped CPI target artifact was assembled.";
    }
    if (result.instructionType.includes("DEPLOY_ATTACKER_PROGRAM")) {
      return "The session payout program became available in this SVM session.";
    }
    if (result.instructionType.includes("SUBMIT_DELEGATION")) {
      return "A normal-looking bounty delegation was recorded.";
    }
    if (result.instructionType.includes("EXECUTE_DELEGATED_CPI")) {
      return `${formatAmount(result.inputs.amount)} USDC moved through the selected CPI target.`;
    }
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

function valueFromRecord(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in record) return record[key];
  }
  return undefined;
}

function formatAmount(value: number) {
  return Math.max(0, value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function formatUnknown(value: unknown) {
  if (typeof value === "number") return formatAmount(value);
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  return "Unavailable";
}

function humanize(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
