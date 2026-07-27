"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ELK from "elkjs/lib/elk.bundled.js";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  Code2,
  Coins,
  Fingerprint,
  Play,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  Background,
  Handle,
  Position,
  ReactFlow,
  ViewportPortal,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import { type Address } from "@solana/kit";
import { SkeletonLine, compactAddress } from "./level-ui";

type Level3Snapshot = {
  guildAuthorityPda: Address;
  level3StatePda: Address;
  hasGuildAuthority: boolean;
  rewardMint: Address | null;
  bountyVault: Address | null;
  bountyAmount: bigint;
  hasLevel3State: boolean;
  rewardAccount: Address | null;
  rewardAmount: bigint;
};

type LevelCertificateSnapshot = {
  assetId: Address | null;
  certificatePda: Address;
  exists: boolean;
  leafIndex: number | null;
  leafNonce: bigint | null;
  level: 0 | 1 | 2 | 3;
  merkleTree: Address | null;
  minted: boolean;
};

type LabStage = 1 | 2 | 3;
type NodeTone = "neutral" | "valid" | "trusted" | "attacker" | "muted";
type ActivityTone = "waiting" | "active" | "done" | "warning" | "corrupt";
type FocusKey = "target" | "signer" | "vault" | "reward";

type GraphAccount = {
  active?: boolean;
  detail: string;
  icon: "code" | "coins" | "fingerprint" | "shield" | "user";
  id: string;
  inactive?: boolean;
  label: string;
  revealed?: boolean;
  relation?: string;
  stageReveal?: boolean;
  tone: NodeTone;
  value: string;
};

type GraphNodeData = GraphAccount;

type ActivityEvent = {
  detail?: string;
  title: string;
  tone: ActivityTone;
};

type ManipulationState = {
  cpiTarget: "trusted" | "attacker";
  forwardedSigner: "with-guild-signer" | "without-signer";
  rewardDestination: "guild-vault" | "player-reward";
};

type BackendExecutionState = {
  challengeReady: boolean;
  completed: boolean;
  error: string | null;
  isBusy: boolean;
  onPrepare: () => Promise<void>;
  onRun: () => Promise<void>;
  txSignature: string | null;
};

type SequenceMiss = {
  attempted: FocusKey;
  attemptedOrder: number;
  expected: FocusKey;
  id: number;
};

const elk = new ELK();

const STAGE_LABELS: Record<LabStage, string> = {
  1: "Observe",
  2: "Manipulate",
  3: "Inspect",
};

const FOCUS_SEQUENCE: FocusKey[] = ["target", "signer", "vault", "reward"];

const FOCUS_LABELS: Record<FocusKey, string> = {
  reward: "Reward Account",
  signer: "Forwarded Signer",
  target: "CPI Target",
  vault: "Bounty Vault",
};

const OBSERVE_REVEAL_STEPS: Record<string, number> = {
  external: 2,
  guild: 1,
  reward: 4,
  stats: 5,
  vault: 3,
  wallet: 0,
};

const INSPECT_CODE = [
  "pub external_program: UncheckedAccount<'info>,",
  "",
  "let ix = Instruction {",
  "  program_id: *ctx.accounts.external_program.key,",
  "  accounts: vec![AccountMeta::new(guild_authority.key(), true)],",
  "  data: task_data,",
  "};",
  "",
  "invoke_signed(&ix, cpi_accounts, guild_authority_seeds)?;",
];

export function Level3Panel({
  address,
  backendExecution,
  certificate,
  isLoading,
  isMinting,
  isSending,
  level3Completed,
  level3Error,
  level3State,
  onMint,
  status,
}: {
  address?: string;
  backendExecution: BackendExecutionState;
  certificate?: LevelCertificateSnapshot;
  isLoading: boolean;
  isMinting: boolean;
  isSending: boolean;
  level3Completed: boolean;
  level3Error: unknown;
  level3State?: Level3Snapshot;
  onMint: () => void;
  status: string;
}) {
  const delegated =
    (level3State?.rewardAmount ?? 0n) >=
    (level3State?.bountyAmount || 1_000_000n);
  const startsComplete =
    level3Completed || delegated || backendExecution.completed;
  const [labStage, setLabStage] = useState<LabStage>(startsComplete ? 3 : 1);
  const [observeStarted, setObserveStarted] = useState(false);
  const [observeRunId, setObserveRunId] = useState(0);
  const [observeStep, setObserveStep] = useState(0);
  const [manipulationTested, setManipulationTested] = useState(false);
  const [activeFocus, setActiveFocus] = useState<FocusKey>("target");
  const [focusSequence, setFocusSequence] = useState<FocusKey[]>(
    startsComplete ? FOCUS_SEQUENCE : []
  );
  const [sequenceFeedback, setSequenceFeedback] = useState<string | null>(null);
  const [sequenceMiss, setSequenceMiss] = useState<SequenceMiss | null>(null);
  const [manipulation, setManipulation] = useState<ManipulationState>({
    cpiTarget: "trusted",
    forwardedSigner: "with-guild-signer",
    rewardDestination: "guild-vault",
  });

  const isConnected = status === "connected";
  const exploitReady =
    manipulationTested &&
    manipulation.cpiTarget === "attacker" &&
    manipulation.forwardedSigner === "with-guild-signer" &&
    manipulation.rewardDestination === "player-reward";
  const effectiveCompleted =
    level3Completed || delegated || backendExecution.completed;
  const focusSequenceComplete = focusSequence.length === FOCUS_SEQUENCE.length;

  useEffect(() => {
    if (observeRunId === 0 || labStage !== 1) return;

    const timers = [
      window.setTimeout(() => setObserveStep(2), 360),
      window.setTimeout(() => setObserveStep(3), 720),
      window.setTimeout(() => setObserveStep(4), 1080),
      window.setTimeout(() => setObserveStep(5), 1460),
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [labStage, observeRunId]);

  const graphAccounts = useMemo(
    () =>
      buildGraphAccounts({
        activeFocus,
        address,
        delegated: effectiveCompleted,
        exploitReady,
        labStage,
        manipulation,
        manipulationTested,
        observeStep,
      }),
    [
      activeFocus,
      address,
      effectiveCompleted,
      exploitReady,
      labStage,
      manipulation,
      manipulationTested,
      observeStep,
    ]
  );

  const activity = useMemo(
    () =>
      buildActivity({
        effectiveCompleted,
        exploitReady,
        focusSequence,
        isConnected,
        labStage,
        manipulation,
        manipulationTested,
        observeStarted,
        observeStep,
        sequenceFeedback,
        sequenceMiss,
      }),
    [
      effectiveCompleted,
      exploitReady,
      focusSequence,
      isConnected,
      labStage,
      manipulation,
      manipulationTested,
      observeStarted,
      observeStep,
      sequenceFeedback,
      sequenceMiss,
    ]
  );

  const handleStageChange = (nextStage: LabStage) => {
    setLabStage(nextStage);
    setSequenceFeedback(null);
    setSequenceMiss(null);

    if (nextStage === 1) {
      setActiveFocus("target");
      setFocusSequence([]);
      setManipulationTested(false);
      setObserveStarted(false);
      setObserveRunId(0);
      setObserveStep(0);
      setManipulation({
        cpiTarget: "trusted",
        forwardedSigner: "with-guild-signer",
        rewardDestination: "guild-vault",
      });
    }
  };

  const handleFocusSelect = (key: FocusKey) => {
    if (!exploitReady && !effectiveCompleted) {
      setSequenceFeedback(
        "Test the attacker CPI path before mapping exploit causality."
      );
      return;
    }

    if (focusSequence.includes(key)) {
      const selectedIndex = focusSequence.indexOf(key);
      const nextSequence = focusSequence.slice(0, selectedIndex);
      const nextRequired = FOCUS_SEQUENCE[nextSequence.length] ?? key;

      setFocusSequence(nextSequence);
      setActiveFocus(nextRequired);
      setSequenceMiss(null);
      setSequenceFeedback(
        `${selectedIndex + 1} unmapped: ${FOCUS_LABELS[key]}. Continue from ${
          FOCUS_LABELS[nextRequired]
        }.`
      );
      return;
    }

    const nextKey = FOCUS_SEQUENCE[focusSequence.length];
    if (key !== nextKey) {
      const miss = {
        attempted: key,
        attemptedOrder: focusSequence.length + 1,
        expected: nextKey,
        id: Date.now(),
      };
      setActiveFocus(key);
      setSequenceMiss(miss);
      setSequenceFeedback(getMissReason(miss));
      return;
    }

    setActiveFocus(key);
    setFocusSequence((current) => [...current, key]);
    setSequenceMiss(null);
    setSequenceFeedback(`${FOCUS_LABELS[key]} dependency mapped.`);
  };

  return (
    <section className="space-y-8">
      <Level3Header activeStage={labStage} onStageChange={handleStageChange} />

      <StageInteractionShell
        left={
          labStage === 1 ? (
            <ObservePanel
              onContinue={() => handleStageChange(2)}
              onSimulate={() => {
                setObserveStarted(true);
                setObserveStep(1);
                setObserveRunId((current) => current + 1);
              }}
              ready={observeStarted && observeStep >= 5}
              revealStep={observeStep}
              started={observeStarted}
            />
          ) : labStage === 2 ? (
            <ManipulationPanel
              exploitReady={exploitReady}
              isSending={isSending}
              manipulation={manipulation}
              manipulationTested={manipulationTested}
              onChange={(key, value) => {
                setManipulation((current) => ({ ...current, [key]: value }));
                setManipulationTested(false);
              }}
              onContinue={() => handleStageChange(3)}
              onTest={() => {
                setManipulationTested(true);
              }}
            />
          ) : (
            <InspectPanel
              activeFocus={activeFocus}
              backendExecution={backendExecution}
              effectiveCompleted={effectiveCompleted}
              exploitReady={exploitReady}
              focusSequence={focusSequence}
              focusSequenceComplete={focusSequenceComplete}
              isSending={isSending}
              onFocusSelect={handleFocusSelect}
              sequenceFeedback={sequenceFeedback}
              sequenceMiss={sequenceMiss}
            />
          )
        }
        center={
          <ProtocolTopology
            accounts={graphAccounts}
            activeFocus={activeFocus}
            effectiveCompleted={effectiveCompleted}
            exploitReady={exploitReady}
            focusSequenceComplete={focusSequenceComplete}
            labStage={labStage}
            manipulationTested={manipulationTested}
            observeStarted={observeStarted}
            observeStep={observeStep}
          />
        }
        right={
          <ProtocolActivityPanel
            activity={activity}
            footer={
              (status === "connected" && Boolean(isLoading || level3Error)) ||
              effectiveCompleted ||
              Boolean(certificate?.minted) ? (
                <Level3StateFooter
                  certificate={certificate}
                  isLoading={isLoading}
                  isMinting={isMinting}
                  level3Completed={effectiveCompleted}
                  level3Error={level3Error}
                  onMint={onMint}
                  status={status}
                />
              ) : null
            }
          />
        }
      />
    </section>
  );
}

function Level3Header({
  activeStage,
  onStageChange,
}: {
  activeStage: LabStage;
  onStageChange: (stage: LabStage) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-end">
      <div className="max-w-3xl space-y-4">
        <p className="text-[11px] uppercase tracking-[0.34em] text-muted">
          Arbitrary CPI and delegated signer abuse
        </p>
        <h1 className="text-5xl font-semibold tracking-[-0.08em] sm:text-6xl">
          Level 3: The Trojan Horse
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
          Discover how forwarding a privileged signer into an unchecked external
          program lets attacker-controlled code drain protocol assets.
        </p>
      </div>

      <div className="rounded-[22px] border border-border bg-card/72 p-2">
        <div className="grid grid-cols-3 gap-1">
          {([1, 2, 3] as LabStage[]).map((stage) => (
            <button
              type="button"
              key={stage}
              onClick={() => onStageChange(stage)}
              className={`min-h-11 rounded-[16px] px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                activeStage === stage
                  ? "bg-foreground text-background"
                  : "text-muted hover:bg-accent hover:text-foreground"
              }`}
            >
              {STAGE_LABELS[stage]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StageInteractionShell({
  center,
  left,
  right,
}: {
  center: ReactNode;
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)_300px] xl:items-start">
      <div className="space-y-4">{left}</div>
      <div className="min-w-0">{center}</div>
      <div className="space-y-4">{right}</div>
    </div>
  );
}

function ObservePanel({
  onContinue,
  onSimulate,
  ready,
  revealStep,
  started,
}: {
  onContinue: () => void;
  onSimulate: () => void;
  ready: boolean;
  revealStep: number;
  started: boolean;
}) {
  const validationItems = [
    { label: "Guild authority signer available", visible: started },
    { label: "Trusted mercenary CPI selected", visible: revealStep >= 1 },
    { label: "Bounty vault remains protected", visible: revealStep >= 2 },
    { label: "Signer privilege forwarded", visible: revealStep >= 3 },
    { label: "Unchecked CPI target identified", visible: revealStep >= 5 },
  ];

  return (
    <section className="space-y-4 rounded-[28px] border border-border bg-card/72 p-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
          Observe
        </p>
        <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em]">
          Simulate trusted delegation.
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          The protocol delegates work to an external program. The weak point is
          not CPI itself, but forwarding authority before constraining who gets
          called.
        </p>
      </div>

      <div className="space-y-2 rounded-[20px] border border-border bg-background/64 p-4">
        <p className="text-[11px] uppercase tracking-[0.26em] text-muted">
          Validation overlay
        </p>
        <div className="mt-3 space-y-2">
          {validationItems.map((item) => (
            <div
              key={item.label}
              className={`level1-activity-entry flex items-center gap-2 text-sm transition-opacity duration-200 ${
                item.visible ? "opacity-100" : "opacity-35"
              }`}
            >
              <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              <span>{item.label}</span>
            </div>
          ))}
          <div
            className={`level1-activity-entry flex items-center gap-2 text-sm transition-opacity duration-200 ${
              revealStep >= 4 ? "opacity-100" : "opacity-35"
            }`}
          >
            <CircleAlert
              className="h-4 w-4 text-amber-300"
              aria-hidden="true"
            />
            <span>External program identity is not constrained</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <button
          type="button"
          onClick={onSimulate}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          Simulate delegated CPI
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!ready}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45"
        >
          Manipulate CPI target
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function ManipulationPanel({
  exploitReady,
  isSending,
  manipulation,
  manipulationTested,
  onChange,
  onContinue,
  onTest,
}: {
  exploitReady: boolean;
  isSending: boolean;
  manipulation: ManipulationState;
  manipulationTested: boolean;
  onChange: <TKey extends keyof ManipulationState>(
    key: TKey,
    value: ManipulationState[TKey]
  ) => void;
  onContinue: () => void;
  onTest: () => void;
}) {
  const response = getManipulationResponse({
    exploitReady,
    manipulationTested,
  });

  return (
    <section className="space-y-4 rounded-[24px] border border-border bg-card/65 p-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
          Manipulate
        </p>
        <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em]">
          Swap the delegation target.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Test what changes when the protocol forwards authority into an
          attacker-controlled CPI target.
        </p>
      </div>

      <div className="grid gap-3">
        <ProtocolSelect
          label="CPI target"
          value={manipulation.cpiTarget}
          options={[
            { label: "Trusted mercenary program", value: "trusted" },
            { label: "Attacker-controlled program", value: "attacker" },
          ]}
          onChange={(value) =>
            onChange("cpiTarget", value as ManipulationState["cpiTarget"])
          }
        />
        <ProtocolSelect
          label="Signer forwarding"
          value={manipulation.forwardedSigner}
          options={[
            { label: "Guild signer forwarded", value: "with-guild-signer" },
            { label: "No signer privilege", value: "without-signer" },
          ]}
          onChange={(value) =>
            onChange(
              "forwardedSigner",
              value as ManipulationState["forwardedSigner"]
            )
          }
        />
        <ProtocolSelect
          label="Reward destination"
          value={manipulation.rewardDestination}
          options={[
            { label: "Guild vault", value: "guild-vault" },
            { label: "Player reward account", value: "player-reward" },
          ]}
          onChange={(value) =>
            onChange(
              "rewardDestination",
              value as ManipulationState["rewardDestination"]
            )
          }
        />
      </div>

      <div className="rounded-[20px] border border-border bg-background/72 p-4">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
          What just happened?
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">{response}</p>
        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={onTest}
            disabled={isSending}
            className="min-h-12 w-full rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSending ? "Submitting..." : "Test delegated CPI"}
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={!exploitReady}
            className="min-h-12 w-full rounded-full border border-border bg-card px-5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45"
          >
            Inspect exploit causality
          </button>
        </div>
      </div>
    </section>
  );
}

function ProtocolSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  const suspicious =
    value === "attacker" ||
    value === "with-guild-signer" ||
    value === "player-reward";

  return (
    <label className="block space-y-2">
      <span className="text-[11px] uppercase tracking-[0.28em] text-muted">
        {label}
      </span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`min-h-12 w-full appearance-none rounded-[16px] border bg-background px-4 pr-10 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            suspicious
              ? "border-amber-300/26 text-amber-50 dark:bg-amber-400/8"
              : "border-emerald-400/20 text-foreground dark:bg-emerald-400/6"
          }`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

function InspectPanel({
  activeFocus,
  backendExecution,
  effectiveCompleted,
  exploitReady,
  focusSequence,
  focusSequenceComplete,
  isSending,
  onFocusSelect,
  sequenceFeedback,
  sequenceMiss,
}: {
  activeFocus: FocusKey;
  backendExecution: BackendExecutionState;
  effectiveCompleted: boolean;
  exploitReady: boolean;
  focusSequence: FocusKey[];
  focusSequenceComplete: boolean;
  isSending: boolean;
  onFocusSelect: (key: FocusKey) => void;
  sequenceFeedback: string | null;
  sequenceMiss: SequenceMiss | null;
}) {
  const canRun = exploitReady && focusSequenceComplete && !effectiveCompleted;
  const actionDisabled =
    isSending ||
    backendExecution.isBusy ||
    effectiveCompleted ||
    (backendExecution.challengeReady && !canRun);
  const actionLabel = effectiveCompleted
    ? "Level 3 verified"
    : backendExecution.isBusy
      ? "Synchronizing..."
      : !backendExecution.challengeReady
        ? "Prepare For Exploit"
        : !focusSequenceComplete
          ? "Map exploit chain"
          : !exploitReady
            ? "Test exploit path"
            : "Run delegated CPI";

  return (
    <section className="space-y-4 rounded-[28px] border border-border bg-card/72 p-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
          Guided exploit anatomy
        </p>
        <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em]">
          Map the delegated signer chain.
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {FOCUS_SEQUENCE.map((key) => {
          const mappedIndex = focusSequence.indexOf(key);
          const mapped = mappedIndex !== -1;
          const rejected = sequenceMiss?.attempted === key;
          const active = activeFocus === key;

          return (
            <button
              type="button"
              key={key}
              onClick={() => onFocusSelect(key)}
              className={`min-h-11 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                rejected
                  ? "level1-sequence-rejected border-red-300/60 bg-red-400/[0.075] text-red-100"
                  : mapped
                    ? "level1-sequence-mapped border-emerald-300/34 bg-emerald-400/[0.055] text-foreground"
                    : active
                      ? "border-cyan-300/35 bg-cyan-400/[0.045] text-foreground"
                      : "border-border bg-background text-muted hover:border-cyan-300/24 hover:text-foreground"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {mapped ? (
                  <span className="rounded-full bg-emerald-300/16 px-1.5 py-0.5 text-[10px] text-emerald-100">
                    {mappedIndex + 1}
                  </span>
                ) : rejected ? (
                  <span className="rounded-full bg-red-300/14 px-1.5 py-0.5 text-[10px] text-red-100">
                    {sequenceMiss.attemptedOrder}
                  </span>
                ) : null}
                {FOCUS_LABELS[key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-[22px] border border-border bg-background/74">
        <div className="space-y-1 p-4 font-mono text-[12px] leading-6">
          {INSPECT_CODE.map((line, index) => {
            const activeLines = getActiveCodeLines(activeFocus);
            const active = activeLines.includes(index);
            return (
              <div
                key={`${line}-${index}`}
                className={`grid grid-cols-[24px_minmax(0,1fr)] rounded-[10px] px-2 transition ${
                  active
                    ? "level1-code-line-active bg-emerald-400/[0.055] text-foreground"
                    : "text-muted"
                }`}
              >
                <span className="select-none text-muted/60">{index + 1}</span>
                <code className="truncate">{line || " "}</code>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[20px] border border-border bg-background/70 p-4">
        <p className="text-[11px] uppercase tracking-[0.26em] text-muted">
          Exploit sequence
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">
          {sequenceFeedback ??
            (exploitReady
              ? "Map each dependency before executing the delegated CPI."
              : "Test the attacker CPI path before mapping execution.")}
        </p>
        {backendExecution.error ? (
          <p className="mt-3 text-sm leading-6 text-red-200">
            {backendExecution.error}
          </p>
        ) : backendExecution.txSignature ? (
          <p className="mt-3 truncate font-mono text-xs text-emerald-200">
            tx {backendExecution.txSignature}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
          void (backendExecution.challengeReady
            ? backendExecution.onRun()
            : backendExecution.onPrepare());
        }}
        disabled={actionDisabled}
        className="min-h-12 w-full rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45"
      >
        {actionLabel}
      </button>
    </section>
  );
}

function ProtocolTopology({
  accounts,
  activeFocus,
  effectiveCompleted,
  exploitReady,
  focusSequenceComplete,
  labStage,
  manipulationTested,
  observeStarted,
  observeStep,
}: {
  accounts: GraphAccount[];
  activeFocus: FocusKey;
  effectiveCompleted: boolean;
  exploitReady: boolean;
  focusSequenceComplete: boolean;
  labStage: LabStage;
  manipulationTested: boolean;
  observeStarted: boolean;
  observeStep: number;
}) {
  const [layoutNodes, setLayoutNodes] = useState<Node<GraphNodeData>[]>([]);
  const [layoutEdges, setLayoutEdges] = useState<Edge[]>([]);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<
    Node<GraphNodeData>,
    Edge
  > | null>(null);
  const fittedStageRef = useRef<LabStage | null>(null);
  const [layoutStage, setLayoutStage] = useState<LabStage | null>(null);
  const showExploitMessage =
    labStage === 2 && exploitReady && manipulationTested;
  const messageTarget = layoutNodes.find((node) => node.id === "reward");
  const messagePosition =
    showExploitMessage && messageTarget
      ? {
          x: messageTarget.position.x + (messageTarget.width ?? 244) + 36,
          y: messageTarget.position.y + 4,
        }
      : null;

  const graph = useMemo(
    () =>
      buildGraph({
        accounts,
        activeFocus,
        effectiveCompleted,
        exploitReady,
        focusSequenceComplete,
        labStage,
        observeStarted,
      }),
    [
      accounts,
      activeFocus,
      effectiveCompleted,
      exploitReady,
      focusSequenceComplete,
      labStage,
      observeStarted,
    ]
  );

  useEffect(() => {
    let cancelled = false;

    async function layoutGraph() {
      const result = await elk.layout({
        id: "level-3-topology",
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": "DOWN",
          "elk.layered.spacing.nodeNodeBetweenLayers": "72",
          "elk.spacing.nodeNode": "56",
        },
        children: graph.nodes.map((node) => ({
          id: node.id,
          height: node.height ?? 116,
          width: node.width ?? 244,
        })),
        edges: graph.edges.map((edge) => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        })),
      });

      if (cancelled) return;

      setLayoutNodes(
        graph.nodes.map((node) => {
          const layoutNode = result.children?.find(
            (child) => child.id === node.id
          );
          return {
            ...node,
            position: {
              x: layoutNode?.x ?? node.position.x,
              y: layoutNode?.y ?? node.position.y,
            },
          };
        })
      );
      setLayoutEdges(graph.edges);
      setLayoutStage(labStage);
    }

    void layoutGraph();

    return () => {
      cancelled = true;
    };
  }, [graph, labStage]);

  useEffect(() => {
    if (!flowInstance || layoutNodes.length === 0) return;
    if (layoutStage !== labStage || fittedStageRef.current === labStage) return;

    fittedStageRef.current = labStage;

    const timer = window.setTimeout(() => {
      void flowInstance.fitView({
        duration: 360,
        maxZoom: labStage === 2 ? 0.84 : 1,
        minZoom: 0.4,
        padding: labStage === 2 ? 0.3 : 0.18,
      });
    }, 40);

    return () => window.clearTimeout(timer);
  }, [flowInstance, labStage, layoutNodes.length, layoutStage]);

  const isObserveStage = labStage === 1;
  const visibleNodeIds = useMemo(
    () =>
      new Set(
        layoutNodes
          .filter((node) => {
            if (!isObserveStage) return true;
            const revealStep = OBSERVE_REVEAL_STEPS[node.id] ?? 0;
            return observeStep >= revealStep;
          })
          .map((node) => node.id)
      ),
    [isObserveStage, layoutNodes, observeStep]
  );
  const renderedNodes = useMemo(
    () =>
      layoutNodes.map((node) => {
        const revealStep = OBSERVE_REVEAL_STEPS[node.id] ?? 0;
        const revealed = !isObserveStage || visibleNodeIds.has(node.id);

        return {
          ...node,
          data: {
            ...node.data,
            revealed,
            stageReveal:
              isObserveStage &&
              observeStarted &&
              revealed &&
              revealStep > 0,
          },
        };
      }),
    [isObserveStage, layoutNodes, observeStarted, visibleNodeIds]
  );
  const renderedEdges = useMemo(
    () =>
      layoutEdges.map((edge) => {
        const revealed =
          !isObserveStage ||
          (observeStarted &&
            visibleNodeIds.has(edge.source) &&
            visibleNodeIds.has(edge.target));
        const active = revealed && (Boolean(edge.animated) || isObserveStage);

        return {
          ...edge,
          animated: active,
          className: active
            ? [edge.className, "level1-flow-line"]
                .filter(Boolean)
                .join(" ")
            : undefined,
          style: {
            ...edge.style,
            opacity: revealed ? (edge.style?.opacity ?? 1) : 0,
            strokeDasharray: isObserveStage && revealed ? "2 10" : undefined,
            strokeLinecap: isObserveStage ? ("round" as const) : undefined,
          },
        };
      }),
    [isObserveStage, layoutEdges, observeStarted, visibleNodeIds]
  );

  return (
    <section className="overflow-hidden rounded-[28px] border border-border bg-card/72">
      <div className="border-b border-border px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.34em] text-muted">
          Interactive protocol topology
        </p>
      </div>
      <div className="level1-flow h-[720px]">
        <ReactFlow
          colorMode="dark"
          edges={renderedEdges}
          maxZoom={1.15}
          minZoom={0.35}
          nodeTypes={{ protocol: ProtocolNode }}
          nodes={renderedNodes}
          nodesDraggable={false}
          nodesFocusable={false}
          onInit={setFlowInstance}
          panOnDrag={false}
          proOptions={{ hideAttribution: true }}
          zoomOnDoubleClick={false}
          zoomOnPinch={false}
          zoomOnScroll={false}
        >
          <Background color="rgba(148, 163, 184, 0.07)" gap={22} size={1} />
          {messagePosition ? (
            <ViewportPortal>
              <div
                className="pointer-events-none absolute"
                style={{
                  transform: `translate(${messagePosition.x}px, ${messagePosition.y}px)`,
                }}
              >
                <div className="level1-activity-entry w-[250px] rounded-[18px] border border-amber-300/24 bg-amber-300/[0.08] p-4 shadow-[0_22px_60px_-34px_rgba(250,204,21,0.9)] backdrop-blur-md">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-100/70">
                    Vulnerable Protocol:
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-5 text-foreground">
                    Guild signer forwarded into attacker CPI
                  </p>
                </div>
              </div>
            </ViewportPortal>
          ) : null}
        </ReactFlow>
      </div>
    </section>
  );
}

function ProtocolNode({ data }: NodeProps<Node<GraphNodeData>>) {
  const toneClass =
    data.tone === "attacker"
      ? "level1-protocol-node-fake"
      : data.tone === "valid" || data.tone === "trusted"
        ? "level1-protocol-node-official"
        : "";
  const revealClass = data.stageReveal
    ? "level1-protocol-node-stage-reveal"
    : "";
  const hiddenClass = data.revealed === false ? "opacity-0" : "";
  const Icon =
    data.icon === "code"
      ? Code2
      : data.icon === "coins"
        ? Coins
        : data.icon === "fingerprint"
          ? Fingerprint
          : data.icon === "shield"
            ? ShieldCheck
            : UserRound;

  return (
    <div
      className={`level1-protocol-node ${toneClass} ${
        data.active ? "level1-protocol-node-active" : ""
      } ${
        data.inactive ? "level1-protocol-node-inactive" : ""
      } ${revealClass} ${hiddenClass} min-h-[112px] w-[244px] rounded-[20px] border p-4`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-start gap-3">
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current/25 bg-current/8">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-5 text-foreground">
              {data.label}
            </p>
            {data.tone === "valid" || data.tone === "trusted" ? (
              <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            ) : data.tone === "attacker" ? (
              <CircleAlert
                className="h-4 w-4 text-amber-200"
                aria-hidden="true"
              />
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted">{data.detail}</p>
          <p className="mt-2 text-xs font-medium text-foreground">
            {data.value}
          </p>
          {data.relation ? (
            <p className="mt-3 text-[10px] uppercase tracking-[0.28em] text-muted">
              {data.relation}
            </p>
          ) : null}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function ProtocolActivityPanel({
  activity,
  footer,
}: {
  activity: ActivityEvent[];
  footer?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-border bg-card/72">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.34em] text-muted">
          Protocol activity
        </p>
        <span className="rounded-full border border-emerald-300/24 bg-emerald-400/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-200">
          Live
        </span>
      </div>
      <div className="space-y-5 p-5">
        {activity.map((event, index) => (
          <ActivityRow
            event={event}
            index={index}
            key={`${event.title}-${index}`}
          />
        ))}
      </div>
      {footer ? (
        <div className="border-t border-border bg-background/30 p-5">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

function ActivityRow({
  event,
  index,
}: {
  event: ActivityEvent;
  index: number;
}) {
  const dotClass =
    event.tone === "corrupt"
      ? "bg-amber-300 shadow-[0_0_18px_-6px_rgba(252,211,77,0.9)]"
      : event.tone === "warning"
        ? "bg-amber-300/70"
        : event.tone === "done"
          ? "bg-emerald-300"
          : event.tone === "active"
            ? "bg-cyan-300"
            : "bg-transparent border border-muted";

  return (
    <div className="level1-activity-entry grid grid-cols-[22px_minmax(0,1fr)] gap-4">
      <div className="relative flex justify-center">
        <span className={`mt-1 h-3 w-3 rounded-full ${dotClass}`} />
        {index < 5 ? (
          <span className="absolute top-6 h-[calc(100%+18px)] w-px bg-border" />
        ) : null}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{event.title}</p>
        {event.detail ? (
          <p className="mt-1 text-sm leading-6 text-muted">{event.detail}</p>
        ) : null}
      </div>
    </div>
  );
}

function Level3StateFooter({
  certificate,
  isLoading,
  level3Completed,
  level3Error,
  status,
}: {
  certificate?: LevelCertificateSnapshot;
  isLoading: boolean;
  isMinting: boolean;
  level3Completed: boolean;
  level3Error: unknown;
  onMint: () => void;
  status: string;
}) {
  if (
    !(
      (status === "connected" && Boolean(isLoading || level3Error)) ||
      level3Completed ||
      certificate?.minted
    )
  ) {
    return null;
  }

  return (
    <div className="space-y-4">
      {status === "connected" && isLoading ? (
        <div className="space-y-3">
          <SkeletonLine className="h-12" />
          <SkeletonLine className="h-20" />
        </div>
      ) : null}

      {status === "connected" && level3Error ? (
        <div className="rounded-[18px] border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-foreground">
            Could not read Level 3 state
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">
            {level3Error instanceof Error
              ? level3Error.message
              : "The selected cluster returned an unexpected Level 3 account response."}
          </p>
        </div>
      ) : null}

      {level3Completed || certificate?.minted ? (
        <div className="rounded-[20px] border border-emerald-400/18 bg-emerald-400/[0.045] p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/70">
            Badge reward
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Level 3 verification is recorded. The backend awards this badge to
            the wallet that completed the delegated CPI path.
          </p>
          <button
            type="button"
            disabled
            className="mt-4 inline-flex min-h-13 w-full items-center justify-center rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-5 text-sm font-medium text-white shadow-[0_18px_50px_-24px_rgba(153,69,255,0.9)] transition-colors hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
          >
            {level3Completed ? "Badge earned" : "Badge syncing"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function buildGraphAccounts({
  activeFocus,
  address,
  delegated,
  exploitReady,
  labStage,
  manipulation,
  manipulationTested,
  observeStep,
}: {
  activeFocus: FocusKey;
  address?: string;
  delegated: boolean;
  exploitReady: boolean;
  labStage: LabStage;
  manipulation: ManipulationState;
  manipulationTested: boolean;
  observeStep: number;
}): GraphAccount[] {
  const attackerTarget = manipulation.cpiTarget === "attacker";
  const signerForwarded = manipulation.forwardedSigner === "with-guild-signer";
  const playerReward = manipulation.rewardDestination === "player-reward";
  const showExploit = exploitReady || delegated;

  const nodes: GraphAccount[] = [
    {
      active: labStage === 1 || activeFocus === "signer",
      detail: "Transaction signer",
      icon: "user",
      id: "wallet",
      label: "Player Wallet",
      relation: "CALLER",
      tone: "valid",
      value: address ? compactAddress(address, 4, 4) : "Connect wallet",
    },
    {
      active: labStage === 1 || activeFocus === "signer" || signerForwarded,
      detail: "PDA signer authority",
      icon: "fingerprint",
      id: "guild",
      label: "Guild Authority PDA",
      relation: signerForwarded ? "SIGNER FORWARDED" : "LOCAL AUTHORITY",
      tone: signerForwarded ? "trusted" : "neutral",
      value: signerForwarded ? "Privilege available" : "Not forwarded",
    },
    {
      active: activeFocus === "vault" || labStage === 1,
      detail: "Protocol custody",
      icon: "coins",
      id: "vault",
      label: "Bounty Vault",
      relation: showExploit ? "DRAINABLE" : "PROTECTED",
      tone: showExploit ? "attacker" : "valid",
      value: showExploit ? "Bounty exposed" : "Funds retained",
    },
    {
      active: activeFocus === "target" || labStage >= 2,
      detail: attackerTarget ? "Unchecked target" : "Approved worker",
      icon: "code",
      id: "external",
      label: attackerTarget ? "Attacker Program" : "Trusted Mercenary",
      relation: attackerTarget ? "SUBSTITUTED" : "EXPECTED TARGET",
      tone: attackerTarget ? "attacker" : "trusted",
      value: attackerTarget ? "Player controlled" : "Benign CPI",
    },
    {
      active: activeFocus === "reward" || playerReward,
      detail: playerReward ? "Attacker receives bounty" : "Protocol retained",
      icon: "coins",
      id: "reward",
      label: playerReward ? "Player Reward Account" : "Guild Vault",
      relation: playerReward ? "DRAIN DESTINATION" : "UNCHANGED",
      tone: playerReward ? "attacker" : "neutral",
      value: playerReward ? "Bounty routed out" : "No payout",
    },
    {
      active: activeFocus === "reward" || delegated,
      detail: "completed_levels[3]",
      icon: "shield",
      id: "stats",
      inactive: !showExploit,
      label: "UserStats",
      relation: "COMPLETION REGISTRY",
      tone: delegated ? "valid" : showExploit ? "trusted" : "muted",
      value: delegated
        ? "Level complete"
        : showExploit
          ? "Ready to verify"
          : "Locked",
    },
  ];

  return nodes.map((node) => ({
    ...node,
    active:
      node.active ||
      (observeStep >= 2 && node.id === "guild") ||
      (observeStep >= 3 && node.id === "external") ||
      (observeStep >= 4 && node.id === "vault") ||
      (manipulationTested && node.tone === "attacker"),
  }));
}

function buildGraph({
  accounts,
  activeFocus,
  effectiveCompleted,
  exploitReady,
  focusSequenceComplete,
  labStage,
  observeStarted,
}: {
  accounts: GraphAccount[];
  activeFocus: FocusKey;
  effectiveCompleted: boolean;
  exploitReady: boolean;
  focusSequenceComplete: boolean;
  labStage: LabStage;
  observeStarted: boolean;
}) {
  const nodes: Node<GraphNodeData>[] = accounts.map((account) => ({
    data: account,
    height: 116,
    id: account.id,
    position: { x: 0, y: 0 },
    type: "protocol",
    width: 244,
  }));
  const flowActive = observeStarted || labStage > 1;
  const exploitPathActive = exploitReady || effectiveCompleted;
  const verificationActive =
    effectiveCompleted ||
    (labStage === 3 && (activeFocus === "reward" || focusSequenceComplete));

  const edges = [
    buildEdge("wallet-guild", "wallet", "guild", {
      active: flowActive,
      tone: "green",
    }),
    buildEdge("guild-external", "guild", "external", {
      active: flowActive,
      tone: exploitPathActive ? "yellow" : "green",
    }),
    buildEdge("guild-vault", "guild", "vault", {
      active: flowActive,
      tone: exploitPathActive ? "yellow" : "green",
    }),
    buildEdge("external-reward", "external", "reward", {
      active: exploitPathActive,
      tone: exploitPathActive ? "yellow" : "muted",
    }),
    buildEdge("vault-reward", "vault", "reward", {
      active: exploitPathActive,
      tone: exploitPathActive ? "yellow" : "muted",
    }),
    buildEdge("reward-stats", "reward", "stats", {
      active: verificationActive,
      tone: verificationActive ? "green" : "muted",
    }),
  ];

  return { edges, nodes };
}

function buildEdge(
  id: string,
  source: string,
  target: string,
  {
    active,
    tone,
  }: {
    active: boolean;
    tone: "green" | "muted" | "yellow";
  }
): Edge {
  const stroke =
    tone === "yellow"
      ? "rgba(250, 204, 21, 0.78)"
      : tone === "green"
        ? "rgba(52, 211, 153, 0.68)"
        : "rgba(148, 163, 184, 0.22)";

  return {
    animated: active,
    className: active ? "level1-causal-flow" : undefined,
    id,
    source,
    style: {
      opacity: active ? 1 : 0.45,
      stroke,
      strokeWidth: active ? 2 : 1.2,
    },
    target,
    type: "smoothstep",
  };
}

function buildActivity({
  effectiveCompleted,
  exploitReady,
  focusSequence,
  isConnected,
  labStage,
  manipulation,
  manipulationTested,
  observeStarted,
  observeStep,
  sequenceFeedback,
  sequenceMiss,
}: {
  effectiveCompleted: boolean;
  exploitReady: boolean;
  focusSequence: FocusKey[];
  isConnected: boolean;
  labStage: LabStage;
  manipulation: ManipulationState;
  manipulationTested: boolean;
  observeStarted: boolean;
  observeStep: number;
  sequenceFeedback: string | null;
  sequenceMiss: SequenceMiss | null;
}): ActivityEvent[] {
  if (!isConnected) {
    return [
      {
        detail: "Connect your wallet to inspect delegated CPI behavior.",
        title: "Waiting for signer",
        tone: "waiting",
      },
    ];
  }

  const events: ActivityEvent[] = [];

  if (labStage === 1) {
    events.push({
      detail: "The wallet can ask the guild to delegate work.",
      title: "Wallet connected",
      tone: "done",
    });

    if (observeStarted) {
      events.push({
        detail: "The guild authority PDA is available as a delegated signer.",
        title: "Guild signer available",
        tone: observeStep >= 2 ? "done" : "active",
      });
    }

    if (observeStep >= 2) {
      events.push({
        detail: "A trusted worker receives the CPI in the normal path.",
        title: "Trusted mercenary selected",
        tone: "done",
      });
    }

    if (observeStep >= 3) {
      events.push({
        detail: "The signer privilege crosses the CPI boundary.",
        title: "Signer privilege forwarded",
        tone: "warning",
      });
    }

    if (observeStep >= 5) {
      events.push({
        detail: "The protocol never constrains the external program identity.",
        title: "Unchecked CPI target identified",
        tone: "warning",
      });
    }

    return events;
  }

  if (labStage === 2) {
    events.push({
      title: "Manipulation surface active",
      tone: "done",
    });

    if (manipulation.cpiTarget === "attacker") {
      events.push({
        detail: "The CPI target is now controlled by the player.",
        title: "Attacker program introduced",
        tone: manipulationTested ? "corrupt" : "active",
      });
    }

    if (manipulation.forwardedSigner === "with-guild-signer") {
      events.push({
        detail: "The guild PDA signer is still forwarded into the target.",
        title: "Guild signer forwarded",
        tone: manipulationTested ? "corrupt" : "warning",
      });
    }

    if (manipulation.rewardDestination === "player-reward") {
      events.push({
        detail:
          "The bounty destination now points at the player reward account.",
        title: "Reward destination remapped",
        tone: manipulationTested ? "corrupt" : "active",
      });
    }

    if (manipulationTested) {
      events.push({
        detail: exploitReady
          ? "The attacker program can spend from the bounty vault with forwarded guild authority."
          : "The test does not yet combine target control, signer privilege, and payout redirection.",
        title: exploitReady
          ? "Delegated CPI exploit path accepted"
          : "Exploit condition incomplete",
        tone: exploitReady ? "corrupt" : "warning",
      });
    }

    return events;
  }

  events.push({
    title: "Exploit causality inspection",
    tone: "done",
  });

  if (sequenceMiss) {
    events.push({
      detail: getMissReason(sequenceMiss),
      title: "Dependency order rejected",
      tone: "warning",
    });
  }

  focusSequence.forEach((key) => {
    events.push({
      detail: getFocusDetail(key),
      title: `${FOCUS_LABELS[key]} mapped`,
      tone: "done",
    });
  });

  if (sequenceFeedback && !sequenceMiss) {
    events.push({
      detail: sequenceFeedback,
      title: "Reasoning state updated",
      tone: "active",
    });
  }

  if (focusSequence.length === FOCUS_SEQUENCE.length) {
    events.push({
      detail: effectiveCompleted
        ? "The reward movement is recorded and the level can be certified."
        : "The delegated CPI chain is mapped and ready for execution.",
      title: effectiveCompleted ? "Level 3 verified" : "Execution unlocked",
      tone: effectiveCompleted ? "done" : "corrupt",
    });
  }

  return events;
}

function getManipulationResponse({
  exploitReady,
  manipulationTested,
}: {
  exploitReady: boolean;
  manipulationTested: boolean;
}) {
  if (!manipulationTested) {
    return "Change the delegation relationship, then test whether the protocol still forwards privileged authority.";
  }

  if (exploitReady) {
    return "The unchecked CPI target receives guild signer authority and routes the bounty to the player reward account.";
  }

  return "The exploit needs all three dependencies: attacker target, forwarded guild signer, and player-controlled reward destination.";
}

function getActiveCodeLines(activeFocus: FocusKey) {
  if (activeFocus === "target") return [0, 2, 3];
  if (activeFocus === "signer") return [4, 8];
  if (activeFocus === "vault") return [4, 8];
  return [5, 8];
}

function getMissReason(miss: SequenceMiss) {
  if (miss.attempted === "reward") {
    return "The payout destination only matters after the CPI target and signer privilege are understood.";
  }
  if (miss.attempted === "vault") {
    return "The bounty vault becomes vulnerable only after signer forwarding is mapped.";
  }
  if (miss.attempted === "signer") {
    return "Signer forwarding matters after identifying where the CPI is going.";
  }
  return `Map ${FOCUS_LABELS[miss.expected]} before ${FOCUS_LABELS[miss.attempted]}.`;
}

function getFocusDetail(key: FocusKey) {
  if (key === "target") {
    return "The vulnerable instruction lets the caller choose the external program.";
  }
  if (key === "signer") {
    return "The guild PDA signer is forwarded across the CPI boundary.";
  }
  if (key === "vault") {
    return "The attacker program can use forwarded authority against the bounty vault.";
  }
  return "The drained bounty lands in the player-controlled reward account.";
}
