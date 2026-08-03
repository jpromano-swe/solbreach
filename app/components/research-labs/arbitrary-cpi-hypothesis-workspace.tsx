"use client";

import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Code2,
  ExternalLink,
  FileText,
  Layers3,
  Palette,
  Play,
  Rocket,
  Search,
  ShieldCheck,
  Smile,
  WalletCards,
} from "lucide-react";
import type { Address } from "@solana/kit";
import { useEffect, useMemo, useState } from "react";

import { useBalance } from "../../lib/hooks/use-balance";
import { useWallet } from "../../lib/wallet/context";

type DelegateProgramRef = "official_payout_router" | "attacker_cpi_program";
type PendingAction = "build" | "deploy" | "delegate" | "execute" | null;
type TaskCategory = "all" | "memes" | "development" | "content" | "design";
type TaskSafety = "safe" | "vulnerable";
type BuilderKey =
  | "programTemplate"
  | "entrypoint"
  | "transferFunction"
  | "authorityStrategy"
  | "transferSource"
  | "destination";

type BuilderSelection = Record<BuilderKey, string>;

type BountyTask = {
  id: string;
  title: string;
  category: Exclude<TaskCategory, "all">;
  sponsor: string;
  due: string;
  reward: number;
  configVersion: "V1 legacy" | "V2 bound";
  safety: TaskSafety;
  initials: string;
  summary: string;
};

const TASKS: BountyTask[] = [
  {
    id: "design-ops-console",
    title: "Design the auditor operations console",
    category: "design",
    sponsor: "Interface guild",
    due: "Due in 3d",
    reward: 75_000,
    configVersion: "V1 legacy",
    safety: "vulnerable",
    initials: "DG",
    summary:
      "Design tasks still resolve through the legacy payout configuration. The router is delegated, but the CPI target is not bound to the approved payout program.",
  },
  {
    id: "dev-analytics-indexer",
    title: "Build task analytics indexer",
    category: "development",
    sponsor: "Protocol ops",
    due: "Due in 5d",
    reward: 32_000,
    configVersion: "V2 bound",
    safety: "safe",
    initials: "DV",
    summary:
      "Development payouts use the migrated V2 configuration. The backend pins the approved router before value moves.",
  },
  {
    id: "content-contributor-guide",
    title: "Write protocol contributor guide",
    category: "content",
    sponsor: "Docs council",
    due: "Due in 2d",
    reward: 12_000,
    configVersion: "V2 bound",
    safety: "safe",
    initials: "CT",
    summary:
      "Content payouts use the migrated V2 configuration and reject caller-supplied CPI targets.",
  },
  {
    id: "memes-reaction-pack",
    title: "Create a launch reaction pack",
    category: "memes",
    sponsor: "Community ops",
    due: "Due in 1d",
    reward: 8_500,
    configVersion: "V2 bound",
    safety: "safe",
    initials: "MM",
    summary:
      "Memes Creation payouts already route through the bound configuration and are out of scope for the arbitrary CPI path.",
  },
  {
    id: "development-plugin-task",
    title: "Build payout review plugin",
    category: "development",
    sponsor: "Security lab",
    due: "Due in 7d",
    reward: 21_000,
    configVersion: "V2 bound",
    safety: "safe",
    initials: "PL",
    summary:
      "This task shows the intended post-migration behavior: a delegated payout cannot swap in an attacker program.",
  },
];

const CATEGORIES: Array<{ id: TaskCategory; label: string }> = [
  { id: "all", label: "All" },
  { id: "memes", label: "Memes Creation" },
  { id: "development", label: "Development" },
  { id: "content", label: "Content" },
  { id: "design", label: "Design" },
];

const CATEGORY_META: Record<
  Exclude<TaskCategory, "all">,
  { icon: typeof Palette; label: string }
> = {
  content: { icon: FileText, label: "Content" },
  design: { icon: Palette, label: "Design" },
  development: { icon: Code2, label: "Development" },
  memes: { icon: Smile, label: "Memes Creation" },
};

const BUILDER_OPTIONS: Record<
  BuilderKey,
  {
    label: string;
    placeholder: string;
    correct: string;
    options: Array<{ value: string; label: string }>;
  }
> = {
  programTemplate: {
    label: "Program template",
    placeholder: "Select template",
    correct: "cpi_drain_router",
    options: [
      { value: "cpi_drain_router", label: "cpi_drain_router" },
      { value: "read_only_observer", label: "read_only_observer" },
      { value: "event_mirror", label: "event_mirror" },
    ],
  },
  entrypoint: {
    label: "Entrypoint function",
    placeholder: "Select entrypoint",
    correct: "execute",
    options: [
      { value: "execute", label: "execute" },
      { value: "initialize", label: "initialize" },
      { value: "close", label: "close" },
    ],
  },
  transferFunction: {
    label: "Transfer function",
    placeholder: "Select transfer function",
    correct: "transfer_checked",
    options: [
      { value: "transfer_checked", label: "transfer_checked" },
      { value: "approve", label: "approve" },
      { value: "close_account", label: "close_account" },
    ],
  },
  authorityStrategy: {
    label: "Authority strategy",
    placeholder: "Select authority strategy",
    correct: "reuse_delegated_signer",
    options: [
      { value: "reuse_delegated_signer", label: "reuse_delegated_signer" },
      { value: "caller_signer", label: "caller_signer" },
      { value: "program_authority", label: "program_authority" },
    ],
  },
  transferSource: {
    label: "Transfer source",
    placeholder: "Select source",
    correct: "task_escrow",
    options: [
      { value: "task_escrow", label: "task_escrow" },
      { value: "bounty_vault", label: "bounty_vault" },
      { value: "worker_account", label: "worker_account" },
    ],
  },
  destination: {
    label: "Destination",
    placeholder: "Select destination",
    correct: "attacker_reward_account",
    options: [
      { value: "attacker_reward_account", label: "attacker_reward_account" },
      { value: "approved_worker_account", label: "approved_worker_account" },
      { value: "fee_vault", label: "fee_vault" },
    ],
  },
};

const BUILDER_KEYS = Object.keys(BUILDER_OPTIONS) as BuilderKey[];
const EMPTY_SELECTIONS: BuilderSelection = {
  authorityStrategy: "",
  destination: "",
  entrypoint: "",
  programTemplate: "",
  transferFunction: "",
  transferSource: "",
};
const CORRECT_SELECTIONS: BuilderSelection = {
  authorityStrategy: "reuse_delegated_signer",
  destination: "attacker_reward_account",
  entrypoint: "execute",
  programTemplate: "cpi_drain_router",
  transferFunction: "transfer_checked",
  transferSource: "task_escrow",
};

export function ArbitraryCpiHypothesisWorkspace({
  busy,
  delegateProgramRef,
  explorerAvailable,
  explorerUrl,
  hasBuild,
  hasCpiExecution,
  hasDelegation,
  hasDeploy,
  instructionName,
  latestAction,
  pendingAction,
  rewardAmount,
  userWalletAddress,
  onBuildAndDeploy,
  onDelegateProgramChange,
  onExecuteDelegatedCpi,
  onInstructionNameChange,
  onOpenEvidenceReview,
  onRewardAmountChange,
  onSubmitDelegation,
}: {
  busy: boolean;
  delegateProgramRef: DelegateProgramRef;
  explorerAvailable: boolean;
  explorerUrl: string;
  hasBuild: boolean;
  hasCpiExecution: boolean;
  hasDelegation: boolean;
  hasDeploy: boolean;
  instructionName: string;
  latestAction: string;
  pendingAction: PendingAction;
  rewardAmount: string;
  userWalletAddress: string;
  onBuildAndDeploy: () => Promise<void>;
  onDelegateProgramChange: (value: DelegateProgramRef) => void;
  onExecuteDelegatedCpi: () => Promise<void>;
  onInstructionNameChange: (value: string) => void;
  onOpenEvidenceReview: () => void;
  onRewardAmountChange: (value: string) => void;
  onSubmitDelegation: () => Promise<void>;
}) {
  const [activeCategory, setActiveCategory] = useState<TaskCategory>("all");
  const [selectedTaskId, setSelectedTaskId] = useState("design-ops-console");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderSelection, setBuilderSelection] =
    useState<BuilderSelection>(EMPTY_SELECTIONS);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const flowStarted = hasBuild || hasDeploy || hasDelegation || hasCpiExecution;
  const builderVisible = builderOpen || hasBuild || hasDeploy;
  const effectiveBuilderSelection =
    hasBuild || hasDeploy ? CORRECT_SELECTIONS : builderSelection;
  const selectedTask =
    TASKS.find((task) => task.id === selectedTaskId) ?? TASKS[0]!;
  const filteredTasks = useMemo(
    () =>
      activeCategory === "all"
        ? TASKS
        : TASKS.filter((task) => task.category === activeCategory),
    [activeCategory]
  );
  const selectedCount = BUILDER_KEYS.filter(
    (key) => effectiveBuilderSelection[key]
  ).length;
  const selectionsComplete = selectedCount === BUILDER_KEYS.length;
  const selectionsCorrect = BUILDER_KEYS.every(
    (key) => effectiveBuilderSelection[key] === BUILDER_OPTIONS[key].correct
  );
  const canDeploy = selectionsComplete && !hasDeploy && !busy;
  const amountValue = Math.max(0, Number.parseInt(rewardAmount, 10) || 0);

  useEffect(() => {
    onRewardAmountChange(String(selectedTask.reward));
  }, [onRewardAmountChange, selectedTask.reward]);

  const updateSelection = (key: BuilderKey, value: string) => {
    setBuilderError(null);
    setBuilderSelection((current) => ({ ...current, [key]: value }));
  };

  const deployConfiguredProgram = async () => {
    if (!canDeploy) return;
    if (!selectionsCorrect) {
      const mismatched = BUILDER_KEYS.find(
        (key) => effectiveBuilderSelection[key] !== BUILDER_OPTIONS[key].correct
      );
      setBuilderError(
        mismatched
          ? `${BUILDER_OPTIONS[mismatched].label} does not match the vulnerable CPI path. Adjust the selection and build again.`
          : "The attacker program specification is incomplete."
      );
      return;
    }
    if (selectedTask.safety !== "vulnerable") {
      setBuilderError(
        "Deployment rejected for this task scope. Inspect SolBreach Explorer for the payout configuration, then select the task whose CPI target is not bound."
      );
      return;
    }
    setBuilderError(null);
    await onBuildAndDeploy();
  };

  return (
    <div>
      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
            Trace the category-scoped payout path.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Browse task categories, identify which payout configuration still
            delegates through the legacy router, then build a session-scoped CPI
            target for that path.
          </p>
        </div>
        <div className="inline-flex h-9 w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 font-mono text-[11px] font-semibold text-zinc-300">
          <span className="h-1.5 w-1.5 rounded-full bg-[#14f195]" />
          SBR SVM
        </div>
      </div>

      <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(340px,0.86fr)_minmax(0,1.14fr)]">
        <div>
          {hasDeploy ? (
            <PayoutExecutionPanel
              amountValue={amountValue}
              busy={busy}
              delegateProgramRef={delegateProgramRef}
              explorerAvailable={explorerAvailable}
              explorerUrl={explorerUrl}
              hasCpiExecution={hasCpiExecution}
              hasDelegation={hasDelegation}
              hasDeploy={hasDeploy}
              instructionName={instructionName}
              latestAction={latestAction}
              pendingAction={pendingAction}
              rewardAmount={rewardAmount}
              selectedTask={selectedTask}
              onDelegateProgramChange={onDelegateProgramChange}
              onExecuteDelegatedCpi={onExecuteDelegatedCpi}
              onInstructionNameChange={onInstructionNameChange}
              onOpenEvidenceReview={onOpenEvidenceReview}
              onRewardAmountChange={onRewardAmountChange}
              onSubmitDelegation={onSubmitDelegation}
            />
          ) : (
            <ProgramBuilder
              builderError={builderError}
              builderOpen={builderVisible}
              busy={busy}
              canDeploy={canDeploy}
              hasDeploy={hasDeploy}
              pendingAction={pendingAction}
              selectedCount={selectedCount}
              selections={effectiveBuilderSelection}
              selectionsComplete={selectionsComplete}
              explorerAvailable={explorerAvailable}
              explorerUrl={explorerUrl}
              onDeployConfiguredProgram={deployConfiguredProgram}
              onOpenBuilder={() => {
                setBuilderOpen(true);
                setBuilderError(null);
              }}
              onSelectionChange={updateSelection}
            />
          )}
        </div>

        <BountyTaskBrowser
          activeCategory={activeCategory}
          filteredTasks={filteredTasks}
          flowStarted={flowStarted}
          selectedTask={selectedTask}
          userWalletAddress={userWalletAddress}
          onCategoryChange={setActiveCategory}
          onTaskSelect={(task) => {
            if (flowStarted) return;
            setSelectedTaskId(task.id);
            setBuilderError(null);
          }}
        />
      </div>
    </div>
  );
}

function BountyTaskBrowser({
  activeCategory,
  filteredTasks,
  flowStarted,
  selectedTask,
  userWalletAddress,
  onCategoryChange,
  onTaskSelect,
}: {
  activeCategory: TaskCategory;
  filteredTasks: BountyTask[];
  flowStarted: boolean;
  selectedTask: BountyTask;
  userWalletAddress: string;
  onCategoryChange: (category: TaskCategory) => void;
  onTaskSelect: (task: BountyTask) => void;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-white/10 bg-[#08090b] p-5">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-600">
            BreachBounty
          </p>
          <p className="text-sm font-semibold text-zinc-100">
            Browse bounty tasks
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Category scope determines which payout configuration is active.
          </p>
        </div>
        <WalletSummary userWalletAddress={userWalletAddress} />
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((category) => {
          const selected = activeCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onCategoryChange(category.id)}
              aria-pressed={selected}
              className={`min-h-10 shrink-0 rounded-lg border px-3 text-xs font-semibold motion-safe:transition-colors motion-safe:duration-100 ${
                selected
                  ? "border-[#9945ff]/45 bg-[#9945ff]/16 text-[#d7c0ff]"
                  : "border-white/10 bg-white/[0.025] text-zinc-500 hover:border-white/20 hover:text-zinc-200"
              } focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b]`}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 space-y-2">
        {filteredTasks.length ? (
          filteredTasks.map((task) => (
            <TaskRow
              key={task.id}
              locked={flowStarted && task.id !== selectedTask.id}
              selected={selectedTask.id === task.id}
              task={task}
              onSelect={() => onTaskSelect(task)}
            />
          ))
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.025] p-5 text-sm text-zinc-500">
            No tasks match this category.
          </div>
        )}
      </div>
    </section>
  );
}

function WalletSummary({ userWalletAddress }: { userWalletAddress: string }) {
  const { status, wallet } = useWallet();
  const connectedAddress = wallet?.account.address ?? userWalletAddress;
  const balanceAddress = connectedAddress
    ? (connectedAddress as Address)
    : undefined;
  const balance = useBalance(balanceAddress);
  const displayName =
    wallet?.account.label ||
    wallet?.connector.name ||
    shortAddress(connectedAddress) ||
    "Research wallet";

  return (
    <div className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-2.5 py-1.5">
      <div className="relative flex h-7 w-8 items-center justify-center rounded-md border border-[#9945ff]/25 bg-[#9945ff]/12 text-[#d7c0ff]">
        <WalletCards className="h-4 w-4" aria-hidden="true" />
        <span className="absolute -right-1.5 -top-2 rounded-md bg-[#6f6cff] px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-white">
          {formatWalletBalance(balance.lamports, balance.isLoading)}
        </span>
      </div>
      <div className="h-8 w-8 shrink-0 rounded-full border border-white/10 bg-[radial-gradient(circle_at_30%_30%,#14f195_0%,#9945ff_48%,#232323_100%)]" />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-zinc-200">
          {displayName}
        </p>
        <p className="flex items-center gap-1 text-[10px] text-zinc-500">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === "connected" ? "bg-[#14f195]" : "bg-zinc-600"
            }`}
          />
          {status === "connected" ? "Connected" : "Wallet"}
        </p>
      </div>
      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
    </div>
  );
}

function TaskRow({
  locked,
  selected,
  task,
  onSelect,
}: {
  locked: boolean;
  selected: boolean;
  task: BountyTask;
  onSelect: () => void;
}) {
  const CategoryIcon = CATEGORY_META[task.category].icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={locked}
      aria-pressed={selected}
      className={`group grid min-h-24 w-full grid-cols-[52px_minmax(0,1fr)] gap-4 rounded-lg border p-3 text-left motion-safe:transition-colors motion-safe:duration-100 motion-safe:active:scale-[0.96] sm:grid-cols-[64px_minmax(0,1fr)_auto] ${
        selected
          ? "border-[#9945ff]/45 bg-[#9945ff]/10"
          : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/[0.025]"
      } disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b]`}
    >
      <div
        className="flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300 sm:h-16 sm:w-16"
        aria-hidden="true"
      >
        <CategoryIcon className="h-4 w-4" />
        <span className="font-mono text-[10px] font-semibold">
          {task.initials}
        </span>
      </div>
      <div className="min-w-0 self-center">
        <p className="min-w-0 truncate text-sm font-semibold text-zinc-200">
          {task.title}
        </p>
        <p className="mt-1 text-xs text-zinc-500">{task.sponsor}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <Briefcase className="h-3 w-3" aria-hidden="true" />
            {CATEGORY_META[task.category].label}
          </span>
          <span aria-hidden="true">|</span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" aria-hidden="true" />
            {task.due}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#14f195]" />
        </div>
      </div>
      <div className="col-span-2 flex items-baseline justify-between gap-2 self-center sm:col-span-1 sm:block sm:text-right">
        <p className="flex items-center gap-1.5 font-mono text-base font-semibold tabular-nums text-zinc-200 sm:justify-end">
          <UsdcMark />
          {task.reward.toLocaleString("en-US")}
        </p>
        <p className="text-xs text-zinc-500">USDC</p>
      </div>
    </button>
  );
}

function UsdcMark() {
  return (
    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#4f8cff]/40 bg-[#2563eb]/20 text-[#8bb7ff]">
      <CircleDollarSign className="h-3 w-3" aria-hidden="true" />
    </span>
  );
}

function formatWalletBalance(
  lamports: bigint | number | null,
  isLoading: boolean
) {
  if (isLoading && lamports === null) return "$--";
  if (lamports === null) return "$0";
  const sol = Number(lamports) / 1_000_000_000;
  if (!Number.isFinite(sol) || sol <= 0) return "$0";
  if (sol < 0.01) return "<0.01";
  return sol.toLocaleString("en-US", {
    maximumFractionDigits: sol >= 100 ? 0 : 2,
  });
}

function shortAddress(address?: string) {
  if (!address) return "";
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function ProgramBuilder({
  builderError,
  builderOpen,
  busy,
  canDeploy,
  explorerAvailable,
  explorerUrl,
  hasDeploy,
  pendingAction,
  selectedCount,
  selections,
  selectionsComplete,
  onDeployConfiguredProgram,
  onOpenBuilder,
  onSelectionChange,
}: {
  builderError: string | null;
  builderOpen: boolean;
  busy: boolean;
  canDeploy: boolean;
  explorerAvailable: boolean;
  explorerUrl: string;
  hasDeploy: boolean;
  pendingAction: PendingAction;
  selectedCount: number;
  selections: BuilderSelection;
  selectionsComplete: boolean;
  onDeployConfiguredProgram: () => Promise<void>;
  onOpenBuilder: () => void;
  onSelectionChange: (key: BuilderKey, value: string) => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#08090b] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-100">
            Exploiter interface
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Configure the attacker program before deploying it into this SBR SVM
            session.
          </p>
        </div>
        <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 font-mono text-[10px] text-zinc-500">
          {selectedCount}/6
        </span>
      </div>

      {!builderOpen ? (
        <div className="mt-6 flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/12 bg-white/[0.02] p-5 text-center">
          <div>
            <button
              type="button"
              onClick={onOpenBuilder}
              disabled={busy}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#9945ff]/35 bg-[#9945ff]/16 px-5 text-sm font-semibold text-[#d7c0ff] motion-safe:transition-colors motion-safe:duration-100 motion-safe:active:scale-[0.96] hover:bg-[#9945ff]/22 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-zinc-600"
            >
              <Rocket className="h-4 w-4" aria-hidden="true" />
              Build attacker program
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {BUILDER_KEYS.map((key) => (
              <BuilderSelect
                key={key}
                config={BUILDER_OPTIONS[key]}
                id={`rl3-builder-${key}`}
                value={selections[key]}
                onChange={(value) => onSelectionChange(key, value)}
              />
            ))}
          </div>

          <CodePreview selections={selections} />

          {builderError ? (
            <p
              role="alert"
              className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100"
            >
              {builderError}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void onDeployConfiguredProgram()}
            disabled={!canDeploy}
            aria-busy={pendingAction === "build" || pendingAction === "deploy"}
            className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold motion-safe:transition-colors motion-safe:duration-100 motion-safe:active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b] ${
              hasDeploy
                ? "border-[#14f195]/25 bg-[#14f195]/8 text-[#8fffd0]"
                : canDeploy
                  ? "border-[#9945ff]/35 bg-[#9945ff]/18 text-[#d7c0ff] hover:bg-[#9945ff]/24"
                  : "cursor-not-allowed border-white/10 bg-white/[0.04] text-zinc-600"
            }`}
          >
            {hasDeploy ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Rocket className="h-4 w-4" aria-hidden="true" />
            )}
            {pendingAction === "build"
              ? "Building program..."
              : pendingAction === "deploy"
                ? "Deploying to SBR SVM..."
                : hasDeploy
                  ? "Program deployed in SBR SVM"
                  : selectionsComplete
                    ? "Deploy program in SVM"
                    : "Deploy program in SVM"}
          </button>
          <ExplorerRouteLink available={explorerAvailable} href={explorerUrl} />
        </div>
      )}
    </section>
  );
}

function BuilderSelect({
  config,
  id,
  value,
  onChange,
}: {
  config: (typeof BUILDER_OPTIONS)[BuilderKey];
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
      >
        {config.label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 font-mono text-[11px] text-zinc-100 outline-none motion-safe:transition-colors motion-safe:duration-100 focus:border-[#9945ff]/50 focus-visible:ring-2 focus-visible:ring-[#14f195]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b]"
      >
        <option value="">{config.placeholder}</option>
        {config.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CodePreview({ selections }: { selections: BuilderSelection }) {
  return (
    <pre className="overflow-auto rounded-lg border border-white/10 bg-black/35 p-3 font-mono text-[11px] leading-5 text-zinc-500">
      {`program ${selections.programTemplate || "<template>"} {
  pub fn ${selections.entrypoint || "<entrypoint>"}(ctx) {
    ${selections.transferFunction || "<transfer_fn>"}(
      from: ${selections.transferSource || "<source>"},
      to: ${selections.destination || "<destination>"},
      authority: ${selections.authorityStrategy || "<authority>"}
    )
  }
}`}
    </pre>
  );
}

function PayoutExecutionPanel({
  amountValue,
  busy,
  delegateProgramRef,
  explorerAvailable,
  explorerUrl,
  hasCpiExecution,
  hasDelegation,
  hasDeploy,
  instructionName,
  latestAction,
  pendingAction,
  rewardAmount,
  selectedTask,
  onDelegateProgramChange,
  onExecuteDelegatedCpi,
  onInstructionNameChange,
  onOpenEvidenceReview,
  onRewardAmountChange,
  onSubmitDelegation,
}: {
  amountValue: number;
  busy: boolean;
  delegateProgramRef: DelegateProgramRef;
  explorerAvailable: boolean;
  explorerUrl: string;
  hasCpiExecution: boolean;
  hasDelegation: boolean;
  hasDeploy: boolean;
  instructionName: string;
  latestAction: string;
  pendingAction: PendingAction;
  rewardAmount: string;
  selectedTask: BountyTask;
  onDelegateProgramChange: (value: DelegateProgramRef) => void;
  onExecuteDelegatedCpi: () => Promise<void>;
  onInstructionNameChange: (value: string) => void;
  onOpenEvidenceReview: () => void;
  onRewardAmountChange: (value: string) => void;
  onSubmitDelegation: () => Promise<void>;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#08090b] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-100">Execute exploit</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Authorize the selected task payout, inspect the public interface,
            then choose the CPI target to test.
          </p>
        </div>
        <Layers3
          className="h-4 w-4 shrink-0 text-zinc-600"
          aria-hidden="true"
        />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <ProgressPill done={hasDeploy} label="Program deployed" />
        <ProgressPill done={hasDelegation} label="Payout authorized" />
        <ProgressPill done={hasCpiExecution} label="CPI executed" />
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
              Active task
            </p>
            <p className="mt-1 truncate text-xs font-medium text-zinc-300">
              {selectedTask.title}
            </p>
          </div>
          <p className="inline-flex shrink-0 items-center gap-1.5 font-mono text-xs font-semibold text-zinc-300">
            <UsdcMark />
            {selectedTask.reward.toLocaleString("en-US")} USDC
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void onSubmitDelegation()}
        disabled={busy || !hasDeploy || hasDelegation}
        aria-busy={pendingAction === "delegate"}
        className={`mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold motion-safe:transition-colors motion-safe:duration-100 motion-safe:active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b] ${
          hasDelegation
            ? "border-[#14f195]/25 bg-[#14f195]/8 text-[#8fffd0]"
            : !busy && hasDeploy
              ? "border-white/10 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.07]"
              : "cursor-not-allowed border-white/10 bg-white/[0.03] text-zinc-600"
        }`}
      >
        {hasDelegation ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        )}
        {pendingAction === "delegate"
          ? "Authorizing payout..."
          : hasDelegation
            ? "Task payout authorized"
            : "Authorize task payout"}
      </button>

      <div className="mt-4 border-t border-white/10 pt-4">
        <ExplorerRouteLink available={explorerAvailable} href={explorerUrl} />
      </div>

      <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
        <div>
          <label
            htmlFor="rl3-cpi-target"
            className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600"
          >
            CPI target
          </label>
          <select
            id="rl3-cpi-target"
            value={delegateProgramRef}
            disabled={busy || !hasDelegation}
            onChange={(event) =>
              onDelegateProgramChange(event.target.value as DelegateProgramRef)
            }
            className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-zinc-100 outline-none motion-safe:transition-colors motion-safe:duration-100 focus:border-[#9945ff]/50 focus-visible:ring-2 focus-visible:ring-[#14f195]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b] disabled:opacity-55"
          >
            <option value="official_payout_router">
              Official Payout Router
            </option>
            <option value="attacker_cpi_program">Attacker CPI Program</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="rl3-instruction-name"
            className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600"
          >
            Program instruction
          </label>
          <input
            id="rl3-instruction-name"
            type="text"
            value={instructionName}
            disabled={busy || !hasDelegation}
            onChange={(event) => onInstructionNameChange(event.target.value)}
            placeholder="Paste instruction name"
            autoComplete="off"
            spellCheck={false}
            className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 font-mono text-[11px] text-zinc-100 outline-none motion-safe:transition-colors motion-safe:duration-100 placeholder:text-zinc-700 focus:border-[#9945ff]/50 focus-visible:ring-2 focus-visible:ring-[#14f195]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b] disabled:opacity-55"
          />
        </div>
        <div>
          <label
            htmlFor="rl3-reward-amount"
            className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600"
          >
            Reward amount
          </label>
          <input
            id="rl3-reward-amount"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={rewardAmount}
            disabled={busy || !hasDelegation}
            onChange={(event) =>
              onRewardAmountChange(event.target.value.replace(/\D/g, ""))
            }
            className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 font-mono text-[11px] text-zinc-100 outline-none motion-safe:transition-colors motion-safe:duration-100 focus:border-[#9945ff]/50 focus-visible:ring-2 focus-visible:ring-[#14f195]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b] disabled:opacity-55"
          />
        </div>
        <button
          type="button"
          onClick={() => void onExecuteDelegatedCpi()}
          disabled={
            busy ||
            !hasDelegation ||
            !instructionName.trim() ||
            amountValue <= 0 ||
            hasCpiExecution
          }
          aria-busy={pendingAction === "execute"}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#9945ff]/30 bg-[#9945ff]/12 px-3 text-xs font-semibold text-[#d7c0ff] motion-safe:transition-colors motion-safe:duration-100 motion-safe:active:scale-[0.96] hover:bg-[#9945ff]/18 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-zinc-600"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          {pendingAction === "execute"
            ? "Executing CPI..."
            : hasCpiExecution
              ? "CPI executed"
              : "Execute delegated CPI"}
        </button>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/10 pt-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
            Latest action
          </p>
          <p className="mt-1 truncate text-[11px] text-zinc-400">
            {latestAction}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenEvidenceReview}
          disabled={latestAction === "No transactions submitted yet."}
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[#9945ff]/25 bg-[#9945ff]/10 px-3 text-[11px] font-semibold text-[#c7a6ff] motion-safe:transition-colors motion-safe:duration-100 motion-safe:active:scale-[0.96] hover:bg-[#9945ff]/16 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Evidence
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function ProgressPill({ done, label }: { done: boolean; label: string }) {
  return (
    <div
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-2 text-center text-[11px] font-semibold ${
        done
          ? "border-[#14f195]/25 bg-[#14f195]/8 text-[#8fffd0]"
          : "border-white/10 bg-white/[0.025] text-zinc-600"
      }`}
    >
      {done ? (
        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-700" />
      )}
      {label}
    </div>
  );
}

function ExplorerRouteLink({
  available,
  href,
}: {
  available: boolean;
  href: string;
}) {
  if (!available) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex min-h-10 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-zinc-600"
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
      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#9945ff]/30 bg-[#9945ff]/12 px-3 text-xs font-semibold text-[#d7c0ff] motion-safe:transition-colors motion-safe:duration-100 motion-safe:active:scale-[0.96] hover:bg-[#9945ff]/18 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b]"
    >
      <Search className="h-4 w-4" aria-hidden="true" />
      Open SolBreach Explorer
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  );
}
