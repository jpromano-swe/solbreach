"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ELK from "elkjs/lib/elk.bundled.js";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  Fingerprint,
  KeyRound,
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

type Level2Snapshot = {
  profilePda: Address;
  level2StatePda: Address;
  hasProfile: boolean;
  commander: Address | null;
  hasLevel2State: boolean;
};

type LabStage = 1 | 2 | 3;
type NodeTone = "neutral" | "valid" | "shared" | "hijacked" | "muted";
type ActivityTone = "waiting" | "active" | "done" | "warning" | "corrupt";
type FocusKey = "profile" | "signer" | "commander" | "verifier";

type GraphAccount = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: NodeTone;
  active?: boolean;
  inactive?: boolean;
  revealed?: boolean;
  relation?: string;
  stageReveal?: boolean;
  icon: "commander" | "fingerprint" | "profile" | "shield" | "user";
};

type GraphNodeData = GraphAccount;

type ActivityEvent = {
  detail?: string;
  title: string;
  tone: ActivityTone;
};

type SequenceMiss = {
  attempted: FocusKey;
  attemptedOrder: number;
  expected: FocusKey;
  id: number;
};

type ManipulationState = {
  commanderTarget: "initial" | "wallet";
  profileScope: "wallet-bound" | "static";
  writer: "connected" | "outsider";
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

const STAGE_LABELS: Record<LabStage, string> = {
  1: "Observe",
  2: "Manipulate",
  3: "Inspect",
};

const FOCUS_SEQUENCE: FocusKey[] = [
  "profile",
  "signer",
  "commander",
  "verifier",
];

const FOCUS_LABELS: Record<FocusKey, string> = {
  commander: "Commander Field",
  profile: "Static Profile PDA",
  signer: "User Signer",
  verifier: "Verifier Check",
};

const OBSERVE_REVEAL_STEPS: Record<string, number> = {
  commander: 2,
  level2: 3,
  profile: 1,
  stats: 5,
  verifier: 4,
  wallet: 0,
};

const INSPECT_CODE = [
  '#[account(mut, seeds = [b"profile"], bump = profile.bump)]',
  "pub profile: Account<'info, UserProfile>,",
  "",
  "profile.commander = ctx.accounts.user.key();",
  "",
  "require_keys_eq!(",
  "  profile.commander,",
  "  user.key(),",
  "  CommanderNotHijacked",
  ");",
];

const elk = new ELK();

export function Level2Panel({
  address,
  backendExecution,
  isCollectingLevel2Badge,
  isLoading,
  isSending,
  level2BadgeCollected,
  level2BadgeEarned,
  level2Completed,
  level2Error,
  level2InitialCommander,
  level2State,
  onCollectLevel2Badge,
  status,
}: {
  address?: string;
  backendExecution: BackendExecutionState;
  isCollectingLevel2Badge: boolean;
  isLoading: boolean;
  isSending: boolean;
  level2BadgeCollected: boolean;
  level2BadgeEarned: boolean;
  level2Completed: boolean;
  level2Error: unknown;
  level2InitialCommander: string;
  level2State?: Level2Snapshot;
  onCollectLevel2Badge: () => void;
  onInitGlobalProfile: () => Promise<void>;
  onInitLevel2: () => Promise<void>;
  onUpdateProfile: () => Promise<void>;
  onVerify: () => Promise<void>;
  status: string;
}) {
  const commanderCaptured = Boolean(
    address && level2State?.commander === address
  );
  const startsComplete = level2Completed || backendExecution.completed;
  const [labStage, setLabStage] = useState<LabStage>(startsComplete ? 3 : 1);
  const [observeStarted, setObserveStarted] = useState(false);
  const [observeRunId, setObserveRunId] = useState(0);
  const [observeStep, setObserveStep] = useState(0);
  const [simulatedProfileReady, setSimulatedProfileReady] = useState(false);
  const [simulatedLevel2Ready, setSimulatedLevel2Ready] = useState(false);
  const [manipulationTested, setManipulationTested] = useState(false);
  const [activeFocus, setActiveFocus] = useState<FocusKey>("profile");
  const [focusSequence, setFocusSequence] = useState<FocusKey[]>(
    startsComplete ? FOCUS_SEQUENCE : []
  );
  const [sequenceFeedback, setSequenceFeedback] = useState<string | null>(null);
  const [sequenceMiss, setSequenceMiss] = useState<SequenceMiss | null>(null);
  const [manipulation, setManipulation] = useState<ManipulationState>({
    commanderTarget: commanderCaptured ? "wallet" : "initial",
    profileScope: "static",
    writer: "connected",
  });

  const isConnected = status === "connected";
  const profileReady = Boolean(
    level2State?.hasProfile || simulatedProfileReady
  );
  const levelStateReady = Boolean(
    level2State?.hasLevel2State || simulatedLevel2Ready
  );
  const simulatedCommanderCaptured = Boolean(
    commanderCaptured ||
    backendExecution.completed ||
    (manipulationTested &&
      manipulation.profileScope === "static" &&
      manipulation.commanderTarget === "wallet")
  );
  const exploitInspectable =
    profileReady && levelStateReady && simulatedCommanderCaptured;
  const focusSequenceComplete = focusSequence.length === FOCUS_SEQUENCE.length;
  const effectiveLevel2Completed =
    level2Completed || backendExecution.completed;

  useEffect(() => {
    if (observeRunId === 0 || labStage !== 1) return;

    const timers = [
      window.setTimeout(() => setObserveStep(2), 360),
      window.setTimeout(() => {
        setSimulatedLevel2Ready(true);
        setObserveStep(3);
      }, 720),
      window.setTimeout(() => {
        setManipulation({
          commanderTarget: "wallet",
          profileScope: "static",
          writer: "connected",
        });
        setObserveStep(4);
      }, 1080),
      window.setTimeout(() => {
        setManipulationTested(true);
        setObserveStep(5);
      }, 1460),
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [labStage, observeRunId]);

  const effectiveManipulation = commanderCaptured
    ? ({
        ...manipulation,
        commanderTarget: "wallet",
      } satisfies ManipulationState)
    : manipulation;

  const graphAccounts = useMemo(
    () =>
      buildGraphAccounts({
        activeFocus,
        address,
        labStage,
        level2InitialCommander,
        level2State,
        manipulation: effectiveManipulation,
        observeStep,
        simulatedCommanderCaptured,
        simulatedLevel2Ready,
        simulatedProfileReady,
      }),
    [
      activeFocus,
      address,
      labStage,
      level2InitialCommander,
      level2State,
      effectiveManipulation,
      observeStep,
      simulatedCommanderCaptured,
      simulatedLevel2Ready,
      simulatedProfileReady,
    ]
  );

  const activity = useMemo(
    () =>
      buildActivity({
        commanderCaptured: simulatedCommanderCaptured,
        focusSequence,
        isConnected,
        labStage,
        level2Completed: effectiveLevel2Completed,
        level2State,
        manipulation: effectiveManipulation,
        manipulationTested,
        observeStarted,
        observeStep,
        sequenceFeedback,
        sequenceMiss,
        simulatedLevel2Ready,
        simulatedProfileReady,
      }),
    [
      focusSequence,
      isConnected,
      labStage,
      effectiveLevel2Completed,
      level2State,
      effectiveManipulation,
      manipulationTested,
      observeStarted,
      observeStep,
      sequenceFeedback,
      sequenceMiss,
      simulatedCommanderCaptured,
      simulatedLevel2Ready,
      simulatedProfileReady,
    ]
  );

  const handleStageChange = (nextStage: LabStage) => {
    setLabStage(nextStage);
    setSequenceFeedback(null);
    setSequenceMiss(null);

    if (nextStage === 1) {
      setActiveFocus("profile");
      setFocusSequence([]);
      setManipulationTested(false);
      setObserveStarted(false);
      setObserveRunId(0);
      setObserveStep(0);
      setSimulatedProfileReady(false);
      setSimulatedLevel2Ready(false);
      setManipulation({
        commanderTarget: commanderCaptured ? "wallet" : "initial",
        profileScope: "static",
        writer: "connected",
      });
    }
  };

  const handleFocusSelect = (key: FocusKey) => {
    if (!exploitInspectable) {
      setSequenceFeedback(
        "Observe setup and test the overwrite before mapping exploit causality."
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
      <Level2Header activeStage={labStage} onStageChange={handleStageChange} />

      <StageInteractionShell
        left={
          labStage === 1 ? (
            <ObservePanel
              hijackReady={observeStarted && observeStep >= 5}
              onContinue={() => handleStageChange(2)}
              onSimulate={() => {
                setActiveFocus("profile");
                setFocusSequence([]);
                setManipulationTested(false);
                setObserveStarted(true);
                setObserveStep(1);
                setSimulatedProfileReady(true);
                setSimulatedLevel2Ready(false);
                setManipulation({
                  commanderTarget: commanderCaptured ? "wallet" : "initial",
                  profileScope: "static",
                  writer: "connected",
                });
                setObserveRunId((current) => current + 1);
              }}
              revealStep={observeStep}
              started={observeStarted}
            />
          ) : labStage === 2 ? (
            <ManipulationPanel
              commanderCaptured={commanderCaptured}
              isSending={isSending}
              manipulation={effectiveManipulation}
              manipulationTested={manipulationTested}
              onChange={(key, value) => {
                setManipulation((current) => ({ ...current, [key]: value }));
                setManipulationTested(false);
              }}
              onContinue={() => handleStageChange(3)}
              onTest={() => {
                setSimulatedProfileReady(true);
                setSimulatedLevel2Ready(true);
                setManipulationTested(true);
              }}
              readyToInspect={Boolean(exploitInspectable)}
            />
          ) : (
            <InspectPanel
              activeFocus={activeFocus}
              commanderCaptured={simulatedCommanderCaptured}
              backendExecution={backendExecution}
              feedback={sequenceFeedback}
              focusSequence={focusSequence}
              focusSequenceComplete={focusSequenceComplete}
              isSending={isSending}
              level2Completed={effectiveLevel2Completed}
              onFocusSelect={handleFocusSelect}
              sequenceMiss={sequenceMiss}
            />
          )
        }
        center={
          <ProtocolTopology
            accounts={graphAccounts}
            activeFocus={activeFocus}
            commanderCaptured={simulatedCommanderCaptured}
            focusSequenceComplete={focusSequenceComplete}
            labStage={labStage}
            manipulation={effectiveManipulation}
            manipulationTested={manipulationTested}
            observeStarted={observeStarted}
            observeStep={observeStep}
          />
        }
        right={
          <ProtocolActivityPanel
            activity={activity}
            footer={
              (status === "connected" && Boolean(isLoading || level2Error)) ||
              effectiveLevel2Completed ||
              level2BadgeEarned ||
              level2BadgeCollected ? (
                <Level2StateFooter
                  isCollectingLevel2Badge={isCollectingLevel2Badge}
                  isLoading={isLoading}
                  level2BadgeCollected={level2BadgeCollected}
                  level2BadgeEarned={level2BadgeEarned}
                  level2Completed={effectiveLevel2Completed}
                  level2Error={level2Error}
                  onCollectLevel2Badge={onCollectLevel2Badge}
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

function Level2Header({
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
          Static PDA identity hijack
        </p>
        <h1 className="text-5xl font-semibold tracking-[-0.08em] sm:text-6xl">
          Level 2: Identity Thief
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
          Discover how a shared profile PDA lets any signer overwrite the
          commander authority that verification later trusts.
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
  hijackReady,
  onContinue,
  onSimulate,
  revealStep,
  started,
}: {
  hijackReady: boolean;
  onContinue: () => void;
  onSimulate: () => void;
  revealStep: number;
  started: boolean;
}) {
  const validationItems = [
    { label: "Wallet signer available", visible: started },
    { label: "Static commander PDA derived", visible: revealStep >= 1 },
    { label: "Shared commander field exposed", visible: revealStep >= 2 },
    { label: "Commander remapped to wallet", visible: revealStep >= 4 },
    { label: "Verifier resolves wallet authority", visible: revealStep >= 5 },
  ];

  return (
    <section className="space-y-4 rounded-[28px] border border-border bg-card/72 p-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
          Observe
        </p>
        <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em]">
          Simulate the commander remap.
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          The protocol trusts a shared commander PDA. The weak point appears
          when that stored commander can be redirected to the connected wallet.
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
              revealStep >= 3 ? "opacity-100" : "opacity-35"
            }`}
          >
            <CircleAlert
              className="h-4 w-4 text-amber-300"
              aria-hidden="true"
            />
            <span>Authority path is not wallet-scoped</span>
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
          Simulate PDA hijack
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!hijackReady}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45"
        >
          Manipulate identity scope
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function ManipulationPanel({
  commanderCaptured,
  isSending,
  manipulation,
  manipulationTested,
  onChange,
  onContinue,
  onTest,
  readyToInspect,
}: {
  commanderCaptured: boolean;
  isSending: boolean;
  manipulation: ManipulationState;
  manipulationTested: boolean;
  onChange: <TKey extends keyof ManipulationState>(
    key: TKey,
    value: ManipulationState[TKey]
  ) => void;
  onContinue: () => void;
  onTest: () => void;
  readyToInspect: boolean;
}) {
  const response = getManipulationResponse({
    commanderCaptured,
    manipulation,
    manipulationTested,
  });

  return (
    <section className="space-y-4 rounded-[24px] border border-border bg-card/65 p-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
          Manipulate
        </p>
        <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em]">
          Replace the trusted identity field.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Test the difference between a wallet-bound profile and the actual
          static global profile.
        </p>
      </div>

      <div className="grid gap-3">
        <ProtocolSelect
          label="Profile scope"
          value={manipulation.profileScope}
          options={[
            { label: "Wallet-bound profile", value: "wallet-bound" },
            { label: "Static global profile", value: "static" },
          ]}
          onChange={(value) =>
            onChange("profileScope", value as ManipulationState["profileScope"])
          }
        />
        <ProtocolSelect
          label="Commander target"
          value={manipulation.commanderTarget}
          options={[
            { label: "Initial commander", value: "initial" },
            { label: "Connected wallet", value: "wallet" },
          ]}
          onChange={(value) =>
            onChange(
              "commanderTarget",
              value as ManipulationState["commanderTarget"]
            )
          }
        />
        <ProtocolSelect
          label="Write authority"
          value={manipulation.writer}
          options={[
            { label: "Connected signer", value: "connected" },
            { label: "Unrelated signer", value: "outsider" },
          ]}
          onChange={(value) =>
            onChange("writer", value as ManipulationState["writer"])
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
            disabled={isSending || manipulation.profileScope !== "static"}
            className="min-h-12 w-full rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSending ? "Submitting..." : "Test commander overwrite"}
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={!readyToInspect}
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
    value === "static" || value === "wallet" || value === "outsider";

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
  commanderCaptured,
  feedback,
  focusSequence,
  focusSequenceComplete,
  isSending,
  level2Completed,
  onFocusSelect,
  sequenceMiss,
}: {
  activeFocus: FocusKey;
  backendExecution: BackendExecutionState;
  commanderCaptured: boolean;
  feedback: string | null;
  focusSequence: FocusKey[];
  focusSequenceComplete: boolean;
  isSending: boolean;
  level2Completed: boolean;
  onFocusSelect: (key: FocusKey) => void;
  sequenceMiss: SequenceMiss | null;
}) {
  const actionDisabled =
    isSending ||
    backendExecution.isBusy ||
    level2Completed ||
    (backendExecution.challengeReady &&
      (!commanderCaptured || !focusSequenceComplete));
  const actionLabel = level2Completed
    ? "Level 2 verified"
    : backendExecution.isBusy
      ? "Synchronizing..."
      : !backendExecution.challengeReady
        ? "Prepare For Exploit"
        : !focusSequenceComplete
          ? "Map exploit chain"
          : "Run exploit transaction";

  return (
    <section className="space-y-4 rounded-[28px] border border-border bg-card/72 p-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
          Guided exploit anatomy
        </p>
        <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em]">
          Map the identity hijack chain.
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
                {FOCUS_LABELS[key].replace(" Field", "").replace(" Check", "")}
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
          {feedback ??
            (commanderCaptured
              ? "Select dependencies in causal order to unlock verification."
              : "Overwrite the commander before verification can pass.")}
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
  commanderCaptured,
  focusSequenceComplete,
  labStage,
  manipulation,
  manipulationTested,
  observeStarted,
  observeStep,
}: {
  accounts: GraphAccount[];
  activeFocus: FocusKey;
  commanderCaptured: boolean;
  focusSequenceComplete: boolean;
  labStage: LabStage;
  manipulation: ManipulationState;
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
  const graph = useMemo(
    () =>
      buildGraph({
        accounts,
        activeFocus,
        commanderCaptured,
        focusSequenceComplete,
        labStage,
        manipulation,
        manipulationTested,
        observeStarted,
      }),
    [
      accounts,
      activeFocus,
      commanderCaptured,
      focusSequenceComplete,
      labStage,
      manipulation,
      manipulationTested,
      observeStarted,
    ]
  );

  useEffect(() => {
    let cancelled = false;

    async function layoutGraph() {
      const result = await elk.layout({
        id: "level-2-topology",
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": "DOWN",
          "elk.layered.spacing.nodeNodeBetweenLayers": "70",
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

      const positionedNodes = graph.nodes.map((node) => {
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
      });
      setLayoutNodes(positionedNodes);
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
        minZoom: 0.45,
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

  const showAuthorityMessage =
    labStage === 2 && commanderCaptured && manipulationTested;
  const verifierNode = layoutNodes.find((node) => node.id === "verifier");
  const level2Node = layoutNodes.find((node) => node.id === "level2");
  const authorityMessagePosition =
    showAuthorityMessage && verifierNode && level2Node
      ? {
          x: verifierNode.position.x + (verifierNode.width ?? 244) + 36,
          y: verifierNode.position.y + 4,
        }
      : null;

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
          {authorityMessagePosition ? (
            <ViewportPortal>
              <div
                className="pointer-events-none absolute"
                style={{
                  transform: `translate(${authorityMessagePosition.x}px, ${authorityMessagePosition.y}px)`,
                }}
              >
                <div className="level1-activity-entry w-[250px] rounded-[18px] border border-amber-300/24 bg-amber-300/[0.08] p-4 shadow-[0_22px_60px_-34px_rgba(250,204,21,0.9)] backdrop-blur-md">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-100/70">
                    Vulnerable Protocol:
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-5 text-foreground">
                    Connected Wallet has now program authority
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
    data.tone === "hijacked"
      ? "level1-protocol-node-fake"
      : data.tone === "valid" || data.tone === "shared"
        ? "level1-protocol-node-official"
        : "";
  const revealClass = data.stageReveal
    ? "level1-protocol-node-stage-reveal"
    : "";
  const hiddenClass = data.revealed === false ? "opacity-0" : "";
  const Icon =
    data.icon === "commander"
      ? KeyRound
      : data.icon === "fingerprint"
        ? Fingerprint
        : data.icon === "shield"
          ? ShieldCheck
          : data.icon === "user"
            ? UserRound
            : Fingerprint;

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
            {data.tone === "valid" ? (
              <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            ) : data.tone === "hijacked" || data.tone === "shared" ? (
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

function Level2StateFooter({
  isCollectingLevel2Badge,
  isLoading,
  level2BadgeCollected,
  level2BadgeEarned,
  level2Completed,
  level2Error,
  onCollectLevel2Badge,
  status,
}: {
  isCollectingLevel2Badge: boolean;
  isLoading: boolean;
  level2BadgeCollected: boolean;
  level2BadgeEarned: boolean;
  level2Completed: boolean;
  level2Error: unknown;
  onCollectLevel2Badge: () => void;
  status: string;
}) {
  const hasFooterContent =
    (status === "connected" && Boolean(isLoading || level2Error)) ||
    level2Completed ||
    level2BadgeEarned ||
    level2BadgeCollected;
  const badgeReady = level2Completed && level2BadgeEarned;
  const collectDisabled =
    level2BadgeCollected || isCollectingLevel2Badge || !badgeReady;

  if (!hasFooterContent) {
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

      {status === "connected" && level2Error ? (
        <div className="rounded-[18px] border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-foreground">
            Could not read Level 2 state
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">
            {level2Error instanceof Error
              ? level2Error.message
              : "The selected cluster returned an unexpected Level 2 account response."}
          </p>
        </div>
      ) : null}

      {level2Completed || level2BadgeEarned || level2BadgeCollected ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={onCollectLevel2Badge}
            disabled={collectDisabled}
            className={`inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed ${
              level2BadgeCollected || !badgeReady
                ? "border border-border bg-accent text-muted disabled:opacity-70"
                : "border border-[#9945ff]/35 bg-[#9945ff] text-white shadow-[0_18px_50px_-24px_rgba(153,69,255,0.9)] hover:bg-[#8b35f6]"
            }`}
          >
            {level2BadgeCollected
              ? "Badge collected"
              : isCollectingLevel2Badge
                ? "Collecting..."
                : "Collect Badge"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function buildGraphAccounts({
  activeFocus,
  address,
  labStage,
  level2InitialCommander,
  level2State,
  manipulation,
  observeStep,
  simulatedCommanderCaptured,
  simulatedLevel2Ready,
  simulatedProfileReady,
}: {
  activeFocus: FocusKey;
  address?: string;
  labStage: LabStage;
  level2InitialCommander: string;
  level2State?: Level2Snapshot;
  manipulation: ManipulationState;
  observeStep: number;
  simulatedCommanderCaptured: boolean;
  simulatedLevel2Ready: boolean;
  simulatedProfileReady: boolean;
}): GraphAccount[] {
  const commander =
    simulatedCommanderCaptured || manipulation.commanderTarget === "wallet"
      ? address
      : level2State?.commander || level2InitialCommander;
  const hasProfile = Boolean(level2State?.hasProfile || simulatedProfileReady);
  const hasLevel2State = Boolean(
    level2State?.hasLevel2State || simulatedLevel2Ready
  );
  const profileShared = labStage >= 2 || observeStep >= 4;
  const showHijack = simulatedCommanderCaptured;
  const dimLegitimatePath = labStage >= 3 && showHijack;

  return [
    {
      active: activeFocus === "signer" || labStage === 1,
      detail: "Transaction signer",
      icon: "user",
      id: "wallet",
      inactive: false,
      label: "Player Wallet",
      relation: "WRITE AUTHORITY",
      tone: "valid",
      value: address ? compactAddress(address, 4, 4) : "Connect wallet",
    },
    {
      active: labStage === 1 || activeFocus === "profile",
      detail: profileShared ? "Seed: [profile]" : "Profile registry",
      icon: "fingerprint",
      id: "profile",
      inactive: false,
      label: "Global Profile PDA",
      relation: profileShared ? "STATIC SEED" : undefined,
      tone: profileShared ? "shared" : "valid",
      value: level2State?.profilePda
        ? compactAddress(level2State.profilePda, 4, 4)
        : hasProfile
          ? "Seed resolved"
          : "Not initialized",
    },
    {
      active: activeFocus === "commander" || showHijack,
      detail: showHijack ? "Rewritten authority" : "Stored authority",
      icon: "commander",
      id: "commander",
      inactive: dimLegitimatePath && !showHijack,
      label: "Commander Field",
      relation: showHijack ? "OVERWRITTEN" : "INITIAL AUTHORITY",
      tone: showHijack ? "hijacked" : "neutral",
      value: commander ? compactAddress(commander, 4, 4) : "Unset",
    },
    {
      active: labStage === 1 || activeFocus === "profile",
      detail: "Wallet-scoped proof state",
      icon: "fingerprint",
      id: "level2",
      inactive: dimLegitimatePath,
      label: "Level 2 PDA",
      relation: "PLAYER-SCOPED",
      tone: hasLevel2State ? "valid" : "neutral",
      value: level2State?.level2StatePda
        ? compactAddress(level2State.level2StatePda, 4, 4)
        : hasLevel2State
          ? "Simulated instance"
          : "Not opened",
    },
    {
      active: activeFocus === "verifier",
      detail: "Checks commander == wallet",
      icon: "shield",
      id: "verifier",
      inactive: false,
      label: "Verifier",
      relation: showHijack ? "CONDITION SATISFIED" : "WAITING",
      tone: showHijack ? "hijacked" : "neutral",
      value: showHijack ? "Hijack accepted" : "Commander mismatch",
    },
    {
      active: labStage === 3 && activeFocus === "verifier",
      detail: "completed_levels[2]",
      icon: "shield",
      id: "stats",
      inactive: !showHijack,
      label: "UserStats",
      relation: "COMPLETION REGISTRY",
      tone: showHijack ? "valid" : "muted",
      value: showHijack ? "Ready to mark true" : "Locked",
    },
  ];
}

function buildGraph({
  accounts,
  activeFocus,
  commanderCaptured,
  focusSequenceComplete,
  labStage,
  manipulation,
  manipulationTested,
  observeStarted,
}: {
  accounts: GraphAccount[];
  activeFocus: FocusKey;
  commanderCaptured: boolean;
  focusSequenceComplete: boolean;
  labStage: LabStage;
  manipulation: ManipulationState;
  manipulationTested: boolean;
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
  const hijackActive =
    commanderCaptured ||
    (manipulationTested &&
      manipulation.profileScope === "static" &&
      manipulation.commanderTarget === "wallet");
  const flowActive = observeStarted || labStage > 1;
  const stage2ExploitActive =
    labStage === 2 && hijackActive && manipulationTested;
  const verifierActive =
    stage2ExploitActive ||
    (labStage === 3 && (activeFocus === "verifier" || focusSequenceComplete));

  const edges = [
    buildEdge("wallet-profile", "wallet", "profile", {
      active: flowActive,
      tone: hijackActive ? "yellow" : "green",
    }),
    buildEdge("profile-commander", "profile", "commander", {
      active: flowActive,
      tone: hijackActive ? "yellow" : "muted",
    }),
    buildEdge("level2-verifier", "level2", "verifier", {
      active: stage2ExploitActive || labStage >= 3,
      tone: "green",
    }),
    buildEdge("commander-verifier", "commander", "verifier", {
      active: hijackActive,
      tone: hijackActive ? "yellow" : "muted",
    }),
    buildEdge("verifier-stats", "verifier", "stats", {
      active: verifierActive,
      tone: stage2ExploitActive ? "yellow" : verifierActive ? "green" : "muted",
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
  commanderCaptured,
  focusSequence,
  isConnected,
  labStage,
  level2Completed,
  level2State,
  manipulation,
  manipulationTested,
  observeStarted,
  observeStep,
  sequenceFeedback,
  sequenceMiss,
  simulatedLevel2Ready,
  simulatedProfileReady,
}: {
  commanderCaptured: boolean;
  focusSequence: FocusKey[];
  isConnected: boolean;
  labStage: LabStage;
  level2Completed: boolean;
  level2State?: Level2Snapshot;
  manipulation: ManipulationState;
  manipulationTested: boolean;
  observeStarted: boolean;
  observeStep: number;
  sequenceFeedback: string | null;
  sequenceMiss: SequenceMiss | null;
  simulatedLevel2Ready: boolean;
  simulatedProfileReady: boolean;
}): ActivityEvent[] {
  if (!isConnected) {
    return [
      {
        detail: "Connect your wallet to inspect the profile registry.",
        title: "Waiting for signer",
        tone: "waiting",
      },
    ];
  }

  const events: ActivityEvent[] = [];
  const profileReady = Boolean(
    level2State?.hasProfile || simulatedProfileReady
  );
  const levelStateReady = Boolean(
    level2State?.hasLevel2State || simulatedLevel2Ready
  );

  if (labStage === 1) {
    events.push({
      detail:
        "The connected wallet is available as a potential commander target.",
      title: "Wallet connected",
      tone: "done",
    });

    if (observeStarted || profileReady) {
      events.push({
        detail:
          "The commander authority resolves from a predictable shared PDA path.",
        title: "Static commander PDA derived",
        tone: observeStep >= 1 || profileReady ? "done" : "active",
      });
    }

    if (observeStep >= 2 || levelStateReady) {
      events.push({
        detail:
          "The protocol stores commander authority in state that is not bound tightly enough to the player.",
        title: "Shared commander field exposed",
        tone: observeStep >= 2 ? "done" : "active",
      });
    }

    if (observeStep >= 3) {
      events.push({
        detail:
          "The authority path can be reused because the commander source is static.",
        title: "Wallet seed missing from authority path",
        tone: "warning",
      });
    }

    if (observeStep >= 4) {
      events.push({
        detail:
          "The stored commander value is remapped to the connected wallet.",
        title: "Commander value overwritten",
        tone: observeStep >= 5 ? "done" : "active",
      });
    }

    if (observeStep >= 5 || commanderCaptured) {
      events.push({
        detail:
          "The verifier now resolves the connected wallet as the trusted commander.",
        title: "Protocol control path compromised",
        tone: "corrupt",
      });
    }

    return events;
  }

  if (labStage === 2) {
    events.push({
      title: "Manipulation surface active",
      tone: "done",
    });

    if (manipulation.profileScope === "static") {
      events.push({
        detail: "All users target the same registry account.",
        title: "Static scope selected",
        tone: "warning",
      });
    }

    if (manipulation.commanderTarget === "wallet") {
      events.push({
        detail:
          manipulation.writer === "outsider"
            ? "An unrelated signer writes the shared profile, but stores the connected wallet as commander."
            : "The stored commander is being replaced with the connected wallet.",
        title: "Commander target remapped",
        tone: manipulationTested ? "corrupt" : "active",
      });
    }

    if (manipulationTested || commanderCaptured) {
      const vulnerable =
        manipulation.profileScope === "static" &&
        manipulation.commanderTarget === "wallet";

      events.push({
        detail: vulnerable
          ? "The verifier will resolve the connected wallet from the overwritten static profile."
          : "The test does not yet produce the commander relationship needed for verification.",
        title: vulnerable
          ? "Profile overwrite accepted"
          : "Exploit condition incomplete",
        tone: vulnerable ? "corrupt" : "warning",
      });

      if (vulnerable) {
        events.push({
          detail:
            "The static commander relationship now grants the connected wallet control over the protected program path.",
          title: "Connected wallet has now program authority",
          tone: "corrupt",
        });
      }
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
      detail: level2Completed
        ? "The per-player Level 2 PDA has been closed after verification."
        : "The verifier can now close the instance and mark completion.",
      title: level2Completed ? "Level 2 verified" : "Verification unlocked",
      tone: level2Completed ? "done" : "corrupt",
    });
  }

  return events;
}

function getManipulationResponse({
  commanderCaptured,
  manipulation,
  manipulationTested,
}: {
  commanderCaptured: boolean;
  manipulation: ManipulationState;
  manipulationTested: boolean;
}) {
  if (!manipulationTested && !commanderCaptured) {
    return "Change the identity relationship, then test whether the protocol still accepts the write.";
  }

  if (manipulation.profileScope === "wallet-bound") {
    return "A wallet-bound profile would isolate ownership. The current program does not use that seed model.";
  }

  if (manipulation.writer === "outsider") {
    return "An unrelated signer can still write the same static profile, but verification only rewards the connected player when commander equals their wallet.";
  }

  if (manipulation.commanderTarget === "wallet" || commanderCaptured) {
    return "The commander field now points at the connected wallet. The verifier treats that overwritten global state as proof of control.";
  }

  return "The static profile is visible, but the exploit condition is not satisfied until commander is remapped to the player wallet.";
}

function getActiveCodeLines(activeFocus: FocusKey) {
  if (activeFocus === "profile") return [0, 1];
  if (activeFocus === "signer") return [3];
  if (activeFocus === "commander") return [3, 6];
  return [5, 6, 7, 8];
}

function getMissReason(miss: SequenceMiss) {
  if (miss.attempted === "verifier") {
    return "The verifier cannot pass before the profile target and commander rewrite are understood.";
  }
  if (miss.attempted === "commander") {
    return "The commander field only matters after identifying who can write the static profile.";
  }
  if (miss.attempted === "signer") {
    return "Signer authority comes after identifying the shared account being written.";
  }
  return `Start with ${FOCUS_LABELS[miss.expected]} to anchor the exploit target.`;
}

function getFocusDetail(key: FocusKey) {
  if (key === "profile") {
    return "The account is global because the seed set is only [profile].";
  }
  if (key === "signer") {
    return "Any signer can submit the vulnerable update instruction.";
  }
  if (key === "commander") {
    return "The write replaces profile.commander with the player's wallet.";
  }
  return "Verification trusts profile.commander and closes the player instance.";
}
