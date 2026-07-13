"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import ELK from "elkjs/lib/elk.bundled.js";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleDollarSign,
  CircleAlert,
  Landmark,
  Play,
  WalletCards,
} from "lucide-react";
import {
  Background,
  Handle,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
  Position,
} from "@xyflow/react";
import { SkeletonLine, StatusTextRow, compactAddress } from "./level-ui";

type Level1Snapshot = {
  bankPda: string;
  level1StatePda: string;
  hasBank: boolean;
  expectedMint: string | null;
  hasLevel1State: boolean;
  depositedAmount: bigint;
};

type StageConfig = {
  badge: string;
  title: string;
  description: string;
  actionLabel: string | null;
  actionKind: "primary" | "secondary";
  level1Mode?: "prepare" | "sequence" | "execute" | "complete";
  onAction?: () => Promise<void>;
};

type LabStage = 1 | 2 | 3;
type AccountTone = "neutral" | "valid" | "fake" | "corrupt";
type ActivityTone = "waiting" | "active" | "done" | "warning" | "corrupt";

type ProtocolAccount = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: AccountTone;
  active?: boolean;
  inactive?: boolean;
  relation?: string;
  stageReveal?: boolean;
};

type ProtocolActivityEvent = {
  detail?: string;
  title: string;
  tone: ActivityTone;
};

type VariableKey = "vault" | "mint" | "source" | "authority";
type SequenceMiss = {
  attempted: VariableKey;
  attemptedOrder: number;
  expected: VariableKey;
  id: number;
};

type ManipulationState = Record<VariableKey, string>;

type ProtocolGraphNodeData = ProtocolAccount & {
  icon: "bank" | "mint" | "token" | "vault" | "wallet";
};

type ProtocolEdgeTone = "green" | "muted" | "yellow";

const LEVEL_1_TARGET = 1_000_000n;

const STAGE_LABELS: Record<LabStage, string> = {
  1: "Observe",
  2: "Manipulate",
  3: "Inspect",
};

const STAGE_REVEAL_TIMING = {
  initialDelayMs: 260,
  stepDelayMs: 260,
};

const SELECT_OPTIONS = {
  vault: [
    { label: "Official Vault", value: "official" },
    { label: "Fake Vault (User Controlled)", value: "fake" },
  ],
  mint: [
    { label: "Official Mint (USDC)", value: "official" },
    { label: "Counterfeit Mint", value: "counterfeit" },
  ],
  source: [
    { label: "Official Token Account", value: "official" },
    { label: "Counterfeit Token Account", value: "counterfeit" },
  ],
  authority: [
    { label: "Valid Authority", value: "valid" },
    { label: "Fake Authority", value: "fake" },
  ],
};

const EXPLOIT_CODE = [
  "const vault = fakeVault;",
  "const mint = counterfeitMint;",
  "const userTokenAccount = counterfeitUserTokenAccount;",
  "const authority = wallet;",
  "",
  "await program.methods",
  "  .deposit(new BN(1_000_000))",
  "  .accounts({ vault, userTokenAccount, authority })",
  "  .rpc();",
];

const EXPLOIT_MANIPULATION: ManipulationState = {
  authority: "valid",
  mint: "counterfeit",
  source: "counterfeit",
  vault: "fake",
};

const EXPLOIT_SEQUENCE: VariableKey[] = [
  "vault",
  "mint",
  "source",
  "authority",
];

const elk = new ELK();

export function Level1Panel({
  address,
  copied,
  isLoading,
  isSending,
  level1Error,
  level1State,
  onCopy,
  stage,
  status,
}: {
  address?: string;
  copied: string | null;
  isLoading: boolean;
  isSending: boolean;
  level1Error: unknown;
  level1State?: Level1Snapshot;
  onCopy: (label: string, value: string) => Promise<void>;
  onDeposit: () => Promise<void>;
  onInitBank: () => Promise<void>;
  onInitLevel1: () => Promise<void>;
  onVerify: () => Promise<void>;
  stage: StageConfig;
  status: string;
}) {
  const startsComplete = stage.level1Mode === "complete";
  const [labStage, setLabStage] = useState<LabStage>(
    startsComplete ? 3 : 1
  );
  const [normalDepositObserved, setNormalDepositObserved] = useState(false);
  const [manipulationTested, setManipulationTested] = useState(false);
  const [exploitPreviewed, setExploitPreviewed] = useState(startsComplete);
  const [stageOneRevealRun, setStageOneRevealRun] = useState(0);
  const [stageOneRevealStep, setStageOneRevealStep] = useState(0);
  const [activeVariable, setActiveVariable] = useState<VariableKey>("vault");
  const [exploitSequence, setExploitSequence] = useState<VariableKey[]>(
    startsComplete ? EXPLOIT_SEQUENCE : []
  );
  const [sequenceFeedback, setSequenceFeedback] = useState<string | null>(null);
  const [sequenceMiss, setSequenceMiss] = useState<SequenceMiss | null>(null);
  const [manipulation, setManipulation] = useState<ManipulationState>(
    startsComplete
      ? EXPLOIT_MANIPULATION
      : {
          authority: "valid",
          mint: "official",
          source: "official",
          vault: "official",
        }
  );

  const isConnected = status === "connected";
  const exploitReady =
    manipulation.vault === "fake" &&
    manipulation.mint === "counterfeit" &&
    manipulation.source === "counterfeit" &&
    manipulation.authority === "valid";
  const authorityRejected = manipulation.authority === "fake";
  const effectiveManipulation =
    labStage === 3 ? EXPLOIT_MANIPULATION : manipulation;
  const effectiveCounterfeitPath =
    effectiveManipulation.vault === "fake" ||
    effectiveManipulation.mint === "counterfeit" ||
    effectiveManipulation.source === "counterfeit";
  const exploitPrepared =
    stage.level1Mode === "sequence" ||
    stage.level1Mode === "execute" ||
    stage.level1Mode === "complete";
  const exploitSequenceComplete =
    exploitSequence.length === EXPLOIT_SEQUENCE.length;

  const accounts = useMemo(
    () =>
      buildProtocolAccounts({
        activeVariable,
        address,
        isCounterfeitPath: effectiveCounterfeitPath,
        labStage,
        manipulation: effectiveManipulation,
        normalDepositObserved,
      }),
    [
      activeVariable,
      address,
      effectiveCounterfeitPath,
      effectiveManipulation,
      labStage,
      normalDepositObserved,
    ]
  );

  const activity = useMemo(
    () =>
      buildProtocolActivity({
        authorityRejected,
        activeVariable,
        exploitPreviewed,
        exploitPrepared,
        exploitReady,
        exploitSequence,
        isConnected,
        labStage,
        manipulation,
        manipulationTested,
        normalDepositObserved,
        sequenceFeedback,
        sequenceMiss,
        stageOneRevealStep,
      }),
    [
      activeVariable,
      authorityRejected,
      exploitPreviewed,
      exploitPrepared,
      exploitReady,
      exploitSequence,
      isConnected,
      labStage,
      manipulation,
      manipulationTested,
      normalDepositObserved,
      sequenceFeedback,
      sequenceMiss,
      stageOneRevealStep,
    ]
  );

  const activeCodeLines = getActiveExploitCodeLines(activeVariable);
  const creditedAmount = level1State?.depositedAmount ?? 0n;
  const progress = Math.min(
    Number((creditedAmount * 100n) / LEVEL_1_TARGET),
    100
  );
  useEffect(() => {
    if (labStage !== 1 || !normalDepositObserved) return;

    const revealTimers = [1, 2, 3, 4, 5].map((step) =>
      window.setTimeout(
        () => setStageOneRevealStep(step),
        STAGE_REVEAL_TIMING.initialDelayMs +
          step * STAGE_REVEAL_TIMING.stepDelayMs
      )
    );

    return () => revealTimers.forEach((timer) => window.clearTimeout(timer));
  }, [labStage, normalDepositObserved, stageOneRevealRun]);

  const handleStageChange = (nextStage: LabStage) => {
    setLabStage(nextStage);

    if (nextStage === 1) {
      setActiveVariable("vault");
      setExploitPreviewed(false);
      setExploitSequence([]);
      setManipulationTested(false);
      setNormalDepositObserved(false);
      setSequenceFeedback(null);
      setSequenceMiss(null);
      setStageOneRevealRun(0);
      setStageOneRevealStep(0);
      setManipulation({
        authority: "valid",
        mint: "official",
        source: "official",
        vault: "official",
      });
    }
  };

  const handleExploitVariableSelect = (key: VariableKey) => {
    if (!exploitPrepared) {
      setSequenceFeedback("Prepare the exploit challenge before mapping dependencies.");
      return;
    }

    if (exploitSequence.includes(key)) {
      const selectedIndex = exploitSequence.indexOf(key);
      const nextSequence = exploitSequence.slice(0, selectedIndex);
      const nextRequired = EXPLOIT_SEQUENCE[nextSequence.length] ?? key;

      setExploitSequence(nextSequence);
      setActiveVariable(nextRequired);
      setSequenceFeedback(
        `${selectedIndex + 1} unmapped: ${getVariableLabel(
          key
        )}. Continue from ${getVariableLabel(nextRequired)}.`
      );
      return;
    }

    const nextKey = EXPLOIT_SEQUENCE[exploitSequence.length];
    if (key !== nextKey) {
      setActiveVariable(key);
      const miss = {
        attempted: key,
        attemptedOrder: exploitSequence.length + 1,
        expected: nextKey,
        id: Date.now(),
      };
      setSequenceMiss(miss);
      setSequenceFeedback(getSequenceMissReason(miss));
      return;
    }

    setActiveVariable(key);
    setExploitSequence((current) => [...current, key]);
    setSequenceMiss(null);
    setSequenceFeedback(
      `${getVariableLabel(key)} dependency mapped.`
    );
  };

  return (
    <section className="space-y-8">
      <Level1Header activeStage={labStage} onStageChange={handleStageChange} />

      <StageInteractionShell
        left={
          labStage === 1 ? (
            <StageOneUnderstandingPanel
              normalDepositObserved={normalDepositObserved}
              onContinue={() => handleStageChange(2)}
              onObserve={() => {
                setNormalDepositObserved(true);
                setStageOneRevealRun((current) => current + 1);
                setStageOneRevealStep(0);
              }}
              revealStep={stageOneRevealStep}
            />
          ) : labStage === 2 ? (
            <ManipulationPanel
              authorityRejected={authorityRejected}
              exploitReady={exploitReady}
              manipulation={manipulation}
              manipulationTested={manipulationTested}
              onChange={(key, value) => {
                setManipulation((current) => ({ ...current, [key]: value }));
                setManipulationTested(false);
              }}
              onContinue={() => handleStageChange(3)}
              onTest={() => setManipulationTested(true)}
            />
          ) : (
            <ExploitCodeWalkthrough
              activeCodeLines={activeCodeLines}
              activeVariable={activeVariable}
              exploitPrepared={exploitPrepared}
              exploitSequence={exploitSequence}
              exploitSequenceComplete={exploitSequenceComplete}
              isSending={isSending}
              onExecute={async () => {
                if (stage.level1Mode === "prepare") {
                  setExploitSequence([]);
                  setSequenceFeedback(null);
                  setExploitPreviewed(false);
                }
                if (stage.actionLabel && stage.onAction) {
                  await stage.onAction();
                }
                if (stage.level1Mode !== "prepare") {
                  setExploitPreviewed(true);
                }
              }}
              onVariableFocus={handleExploitVariableSelect}
              sequenceFeedback={sequenceFeedback}
              sequenceMiss={sequenceMiss}
              stage={stage}
            />
          )
        }
        center={
          <ProtocolVisualization
            activeVariable={labStage === 3 ? activeVariable : undefined}
            accounts={accounts}
            isCorrupted={
              labStage === 3 ||
              (labStage === 2 && manipulationTested && exploitReady)
            }
            manipulation={labStage === 3 ? effectiveManipulation : manipulation}
            mode={labStage}
            stageOneRevealStep={stageOneRevealStep}
            showFlow={
              labStage === 1
                ? normalDepositObserved
                : labStage === 2
                  ? manipulationTested
                  : true
            }
          />
        }
        right={
          <ProtocolActivityPanel
            activity={activity}
            footer={
              labStage === 1 ? null : (
                <div className="space-y-4">
                  <Level1StateFooter
                    copied={copied}
                    isLoading={labStage === 2 ? isLoading : false}
                    level1Error={labStage === 2 ? level1Error : null}
                    level1State={level1State}
                    onCopy={onCopy}
                    progress={progress}
                  />
                </div>
              )
            }
          />
        }
      />
    </section>
  );
}

function Level1Header({
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
          Account substitution and forged ledger credit
        </p>
        <h1 className="text-5xl font-semibold tracking-[-0.08em] sm:text-6xl">
          Level 1: The Illusionist
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
          Discover how a protocol can accept worthless token accounts when it
          validates account shape but not token legitimacy.
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

function StageOneUnderstandingPanel({
  normalDepositObserved,
  onContinue,
  onObserve,
  revealStep,
}: {
  normalDepositObserved: boolean;
  onContinue: () => void;
  onObserve: () => void;
  revealStep: number;
}) {
  const validationItems = [
    { label: "Wallet signer verified", visible: normalDepositObserved },
    { label: "Token account structure valid", visible: revealStep >= 1 },
    { label: "Vault relationship accepted", visible: revealStep >= 2 },
    { label: "Ledger updated successfully", visible: revealStep >= 4 },
  ];
  const vulnerabilityVisible = revealStep >= 5;

  return (
    <section className="space-y-4 rounded-[28px] border border-border bg-card/72 p-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
          Observe
        </p>
        <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em]">
          Establish the legitimate trust path.
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Run a clean deposit first. The topology will reveal each relationship
          as the protocol accepts it.
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
              vulnerabilityVisible ? "opacity-100" : "opacity-35"
            }`}
          >
            <CircleAlert
              className="h-4 w-4 text-amber-300"
              aria-hidden="true"
            />
            <span>Mint legitimacy never checked</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onObserve}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Play className="h-4 w-4" aria-hidden="true" />
        Simulate deposit
      </button>
      <button
        type="button"
        onClick={onContinue}
        disabled={!normalDepositObserved}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45"
      >
        Manipulate assumptions
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </section>
  );
}

function ManipulationPanel({
  authorityRejected,
  exploitReady,
  manipulation,
  manipulationTested,
  onChange,
  onContinue,
  onTest,
}: {
  authorityRejected: boolean;
  exploitReady: boolean;
  manipulation: ManipulationState;
  manipulationTested: boolean;
  onChange: (key: VariableKey, value: string) => void;
  onContinue: () => void;
  onTest: () => void;
}) {
  const response = getManipulationResponse({
    authorityRejected,
    exploitReady,
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
          Swap relationships and test trust.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          These controls expose protocol assumptions without forcing exploit
          code.
        </p>

        <div className="mt-5 grid gap-3">
          <ProtocolSelect
            label="Vault"
            value={manipulation.vault}
            options={SELECT_OPTIONS.vault}
            onChange={(value) => onChange("vault", value)}
          />
          <ProtocolSelect
            label="Mint"
            value={manipulation.mint}
            options={SELECT_OPTIONS.mint}
            onChange={(value) => onChange("mint", value)}
          />
          <ProtocolSelect
            label="Deposit source"
            value={manipulation.source}
            options={SELECT_OPTIONS.source}
            onChange={(value) => onChange("source", value)}
          />
          <ProtocolSelect
            label="Authority"
            value={manipulation.authority}
            options={SELECT_OPTIONS.authority}
            onChange={(value) => onChange("authority", value)}
          />
        </div>
      </div>

      <div className="rounded-[20px] border border-border bg-background/72 p-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
            What just happened?
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">{response}</p>
        </div>
        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={onTest}
            className="min-h-12 w-full rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Test modified deposit
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={!manipulationTested || !exploitReady}
            className="min-h-12 w-full rounded-full border border-border bg-card px-5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45"
          >
            Inspect exploit structure
          </button>
        </div>
      </div>
    </section>
  );
}

function getManipulationResponse({
  authorityRejected,
  exploitReady,
  manipulation,
  manipulationTested,
}: {
  authorityRejected: boolean;
  exploitReady: boolean;
  manipulation: ManipulationState;
  manipulationTested: boolean;
}) {
  const hasCounterfeitStructure =
    manipulation.vault === "fake" &&
    manipulation.mint === "counterfeit" &&
    manipulation.source === "counterfeit";

  if (!manipulationTested) {
    return "Change one relationship, then test the modified deposit to observe which assumption actually fails.";
  }

  if (authorityRejected && hasCounterfeitStructure) {
    return "The counterfeit account path is structurally dangerous, but the fake authority breaks signer validation before ledger credit can be written.";
  }

  if (authorityRejected) {
    return "The token transfer fails at authority validation. The protocol never reaches the mint or vault trust mistake.";
  }

  if (exploitReady) {
    return "The protocol accepts the forged account shape and credits internal balance even though the deposited asset is counterfeit.";
  }

  return "The modified relationship is visible in the graph, but this setup is not enough to corrupt ledger state yet.";
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
  const isCounterfeit = value === "fake" || value === "counterfeit";

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
            isCounterfeit
              ? "border-red-400/24 text-red-100 dark:bg-red-500/8"
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

function ProtocolVisualization({
  activeVariable,
  accounts,
  isCorrupted,
  manipulation,
  mode,
  stageOneRevealStep,
  showFlow,
}: {
  activeVariable?: VariableKey;
  accounts: ProtocolAccount[];
  isCorrupted: boolean;
  manipulation: ManipulationState;
  mode: LabStage;
  stageOneRevealStep?: number;
  showFlow: boolean;
}) {
  const [layoutNodes, setLayoutNodes] = useState<Node<ProtocolGraphNodeData>[]>(
    []
  );
  const [layoutEdges, setLayoutEdges] = useState<Edge[]>([]);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<
    Node<ProtocolGraphNodeData>,
    Edge
  > | null>(null);
  const graphElements = useMemo(
    () =>
      buildProtocolGraph({
        accounts,
        activeVariable,
        isCorrupted,
        manipulation,
        mode,
        stageOneRevealStep,
        showFlow,
      }),
    [
      accounts,
      activeVariable,
      isCorrupted,
      manipulation,
      mode,
      showFlow,
      stageOneRevealStep,
    ]
  );
  const canvasHeightClass =
    mode === 1 ? "h-[600px]" : mode === 2 ? "h-[760px]" : "h-[720px]";
  const fitViewPadding = mode === 2 ? 0.12 : 0.18;
  const fitViewMaxZoom = mode === 2 ? 0.86 : 1;

  useEffect(() => {
    let cancelled = false;

    async function layoutGraph() {
      const graph = {
        id: "level-1-protocol",
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": "DOWN",
          "elk.layered.spacing.nodeNodeBetweenLayers": "58",
          "elk.spacing.nodeNode": "42",
        },
        children: graphElements.nodes.map((node) => ({
          id: node.id,
          height: node.height ?? 126,
          width: node.width ?? 286,
        })),
        edges: graphElements.edges.map((edge) => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        })),
      };

      const result = await elk.layout(graph);
      if (cancelled) return;

      const positionedNodes = graphElements.nodes.map((node) => {
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

      setLayoutNodes(alignProtocolGraphLayout(positionedNodes));
      setLayoutEdges(graphElements.edges);
    }

    void layoutGraph();

    return () => {
      cancelled = true;
    };
  }, [graphElements]);

  useEffect(() => {
    if (!flowInstance || layoutNodes.length === 0) return;

    const fitTimer = window.setTimeout(() => {
      void flowInstance.fitView({
        duration: 360,
        maxZoom: fitViewMaxZoom,
        minZoom: 0.45,
        padding: fitViewPadding,
      });
    }, 40);

    return () => window.clearTimeout(fitTimer);
  }, [
    fitViewMaxZoom,
    fitViewPadding,
    flowInstance,
    layoutEdges.length,
    layoutNodes,
    mode,
  ]);

  return (
    <section className="overflow-hidden rounded-[28px] border border-border bg-card/72">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
          Interactive Protocol Visualization
        </p>
      </div>
      <div className={`relative ${canvasHeightClass}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_35%,rgba(20,241,149,0.08),transparent_32%),radial-gradient(circle_at_70%_62%,rgba(153,69,255,0.08),transparent_30%)]" />
        <ReactFlow
          className="level1-flow"
          nodes={layoutNodes}
          edges={layoutEdges}
          nodeTypes={{ protocolAccount: ProtocolAccountNode }}
          fitView
          fitViewOptions={{
            maxZoom: fitViewMaxZoom,
            minZoom: 0.45,
            padding: fitViewPadding,
          }}
          minZoom={0.45}
          maxZoom={1.1}
          onInit={setFlowInstance}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="rgba(255,255,255,0.035)" gap={28} size={1} />
        </ReactFlow>
      </div>
    </section>
  );
}

function ProtocolAccountNode({ data }: NodeProps<Node<ProtocolGraphNodeData>>) {
  const toneClass =
    data.tone === "fake" || data.tone === "corrupt"
      ? "border-orange-300/34 bg-orange-500/10 text-orange-50 shadow-[0_0_34px_-28px_rgba(251,146,60,0.65),inset_0_0_0_1px_rgba(251,146,60,0.06)]"
      : data.tone === "valid"
        ? "border-emerald-400/28 bg-emerald-400/8"
        : "border-border bg-background/80";
  const iconClass =
    data.tone === "fake" || data.tone === "corrupt"
      ? "border-orange-300/42 bg-orange-500/10 text-orange-200"
      : data.tone === "valid"
        ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-300"
        : "border-border bg-accent text-muted";
  const motionClass =
    data.tone === "fake" || data.tone === "corrupt"
      ? "level1-protocol-node-fake"
      : data.tone === "valid"
        ? "level1-protocol-node-official"
        : "";
  const revealClass = data.stageReveal
    ? "level1-protocol-node-stage-reveal"
    : "";

  return (
    <article
      className={`level1-protocol-node ${
        data.active ? "level1-protocol-node-active" : ""
      } ${
        data.inactive ? "level1-protocol-node-inactive" : ""
      } ${motionClass} ${revealClass} ${toneClass} relative flex h-[126px] w-[286px] flex-col justify-center rounded-[20px] border p-4`}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${iconClass}`}
        >
          {data.icon === "wallet" ? (
            <WalletCards className="h-5 w-5" aria-hidden="true" />
          ) : data.icon === "bank" || data.icon === "vault" ? (
            <Landmark className="h-5 w-5" aria-hidden="true" />
          ) : data.icon === "mint" ? (
            <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
          ) : (
            <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold">{data.label}</p>
            {data.tone === "fake" || data.tone === "corrupt" ? (
              <CircleAlert
                className="mt-0.5 h-4 w-4 shrink-0 text-orange-200"
                aria-hidden="true"
              />
            ) : (
              <Check
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"
                aria-hidden="true"
              />
            )}
          </div>
          <p className="mt-1 font-mono text-base text-emerald-200">
            {data.detail}
          </p>
          <p className="mt-2 font-mono text-xs text-muted">{data.value}</p>
        </div>
      </div>

      {data.relation ? (
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          {data.relation}
        </p>
      ) : null}
      {data.tone === "fake" || data.tone === "corrupt" ? (
        <span className="mt-2 text-[11px] uppercase tracking-[0.22em] text-orange-100/75">
          substituted
        </span>
      ) : null}
    </article>
  );
}

function buildProtocolGraph({
  accounts,
  activeVariable,
  isCorrupted,
  manipulation,
  mode,
  stageOneRevealStep = 0,
  showFlow,
}: {
  accounts: ProtocolAccount[];
  activeVariable?: VariableKey;
  isCorrupted: boolean;
  manipulation: ManipulationState;
  mode: LabStage;
  stageOneRevealStep?: number;
  showFlow: boolean;
}): {
  edges: Edge[];
  nodes: Node<ProtocolGraphNodeData>[];
} {
  const officialWallet = accountById(accounts, "wallet");
  const treasury = accountById(accounts, "treasury");
  const fakeBranchVisible =
    mode === 3 ||
    manipulation.vault === "fake" ||
    manipulation.mint === "counterfeit" ||
    manipulation.source === "counterfeit";
  const fakeSourceVisible = mode === 3 || manipulation.source === "counterfeit";
  const fakeVaultVisible = mode === 3 || manipulation.vault === "fake";
  const fakeMintVisible = mode === 3 || manipulation.mint === "counterfeit";
  const executedPathNodeIds = new Set<string>();
  const markExecutedPath = (...nodeIds: string[]) => {
    nodeIds.forEach((nodeId) => executedPathNodeIds.add(nodeId));
  };
  const isDisconnectedAfterTest = (nodeId: string) =>
    showFlow &&
    fakeBranchVisible &&
    executedPathNodeIds.size > 0 &&
    !executedPathNodeIds.has(nodeId);

  const nodes: Node<ProtocolGraphNodeData>[] = [
    toFlowNode("wallet", {
      ...officialWallet,
      active:
        activeVariable === "authority" ||
        officialWallet.active ||
        fakeBranchVisible,
      icon: "wallet",
    }),
    toFlowNode("official-source", {
      active: !fakeBranchVisible || activeVariable === "source",
      detail: "100.00 USDC",
      icon: "token",
      id: "official-source",
      inactive: isDisconnectedAfterTest("official-source"),
      label: "User Token Account",
      stageReveal: mode === 1 && showFlow,
      tone: "valid",
      value: "Official mint source",
    }),
    toFlowNode("official-vault", {
      active: !fakeBranchVisible || activeVariable === "vault",
      detail: "Expected custody",
      icon: "vault",
      id: "official-vault",
      inactive: isDisconnectedAfterTest("official-vault"),
      label: "Official Vault",
      relation: fakeVaultVisible ? "expected custody" : undefined,
      stageReveal: mode === 1 && showFlow,
      tone: "valid",
      value: "250,000.00 USDC",
    }),
    toFlowNode("official-mint", {
      active: !fakeBranchVisible || activeVariable === "mint",
      detail: "USDC",
      icon: "mint",
      id: "official-mint",
      inactive: isDisconnectedAfterTest("official-mint"),
      label: "Official Mint",
      stageReveal: mode === 1 && showFlow,
      tone: "valid",
      value: "USDC",
    }),
    toFlowNode("treasury", {
      ...treasury,
      active: showFlow || fakeBranchVisible,
      icon: "bank",
      label: "Protocol Treasury",
      stageReveal: mode === 1 && showFlow,
      tone: isCorrupted ? "corrupt" : "neutral",
      value: isCorrupted ? "Credit can inflate" : "250,000.00 USDC",
    }),
  ];

  if (fakeSourceVisible) {
    nodes.push(
      toFlowNode("fake-source", {
        active: activeVariable === "source" || fakeBranchVisible,
        detail: "100.00 FAKEUSDC",
        icon: "token",
        id: "fake-source",
        label: "User Token Account",
        relation: "counterfeit source",
        tone: "fake",
        value: "Counterfeit mint source",
      })
    );
  }

  if (fakeVaultVisible) {
    nodes.push(
      toFlowNode("fake-vault", {
        active: activeVariable === "vault" || fakeBranchVisible,
        detail: "250,000.00 FAKEUSDC",
        icon: "vault",
        id: "fake-vault",
        label: "Fake Vault",
        relation: "expected custody",
        tone: "fake",
        value: "User controlled",
      })
    );
  }

  if (fakeMintVisible) {
    nodes.push(
      toFlowNode("fake-mint", {
        active: activeVariable === "mint" || fakeBranchVisible,
        detail: "FAKEUSDC",
        icon: "mint",
        id: "fake-mint",
        label: "Fake Mint",
        relation: "counterfeit asset",
        tone: "fake",
        value: "No real value",
      })
    );
  }

  const counterfeitStructureSelected =
    manipulation.vault === "fake" &&
    manipulation.mint === "counterfeit" &&
    manipulation.source === "counterfeit";
  const officialEdgeTone: ProtocolEdgeTone =
    showFlow && !fakeBranchVisible ? "green" : "muted";
  const fakeEdgeTone: ProtocolEdgeTone = !showFlow
    ? "muted"
    : counterfeitStructureSelected || isCorrupted
      ? "yellow"
      : "green";
  const edges: Edge[] = [
    flowEdge(
      "wallet-official-source",
      "wallet",
      "official-source",
      officialEdgeTone
    ),
    flowEdge(
      "official-source-official-vault",
      "official-source",
      "official-vault",
      officialEdgeTone
    ),
    flowEdge(
      "official-vault-official-mint",
      "official-vault",
      "official-mint",
      officialEdgeTone
    ),
    flowEdge(
      "official-mint-treasury",
      "official-mint",
      "treasury",
      officialEdgeTone
    ),
  ];

  if (fakeBranchVisible) {
    markExecutedPath(
      "wallet",
      fakeSourceVisible ? "fake-source" : "official-source",
      fakeVaultVisible ? "fake-vault" : "official-vault",
      fakeMintVisible ? "fake-mint" : "official-mint",
      "treasury"
    );

    nodes.forEach((node) => {
      node.data.inactive = isDisconnectedAfterTest(node.id);
      if (node.data.inactive) {
        node.data.active = false;
      }
    });

    edges.push(
      flowEdge(
        "wallet-fake-source",
        "wallet",
        fakeSourceVisible ? "fake-source" : "official-source",
        fakeEdgeTone
      ),
      flowEdge(
        "fake-source-fake-vault",
        fakeSourceVisible ? "fake-source" : "official-source",
        fakeVaultVisible ? "fake-vault" : "official-vault",
        fakeEdgeTone
      ),
      flowEdge(
        "fake-vault-fake-mint",
        fakeVaultVisible ? "fake-vault" : "official-vault",
        fakeMintVisible ? "fake-mint" : "official-mint",
        fakeEdgeTone
      ),
      flowEdge(
        "fake-mint-treasury",
        fakeMintVisible ? "fake-mint" : "official-mint",
        "treasury",
        fakeEdgeTone
      )
    );
  }

  if (mode === 1) {
    const visibleNodeIds = new Set(["wallet"]);

    if (showFlow && stageOneRevealStep >= 1) {
      visibleNodeIds.add("official-source");
    }
    if (showFlow && stageOneRevealStep >= 2) {
      visibleNodeIds.add("official-vault");
    }
    if (showFlow && stageOneRevealStep >= 3) {
      visibleNodeIds.add("official-mint");
    }
    if (showFlow && stageOneRevealStep >= 4) {
      visibleNodeIds.add("treasury");
    }

    return {
      edges: edges.filter(
        (edge) =>
          visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
      ),
      nodes: nodes.filter((node) => visibleNodeIds.has(node.id)),
    };
  }

  return { edges, nodes };
}

function accountById(accounts: ProtocolAccount[], id: string): ProtocolAccount {
  const account = accounts.find((item) => item.id === id);
  if (account) return account;

  return {
    detail: "",
    id,
    label: id,
    tone: "neutral",
    value: "",
  };
}

function toFlowNode(
  id: string,
  data: ProtocolGraphNodeData
): Node<ProtocolGraphNodeData> {
  return {
    data,
    height: 126,
    id,
    position: { x: 0, y: 0 },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    type: "protocolAccount",
    width: 286,
  };
}

function alignProtocolGraphLayout(
  nodes: Node<ProtocolGraphNodeData>[]
): Node<ProtocolGraphNodeData>[] {
  const fakeBranchVisible = nodes.some((node) => node.id.startsWith("fake-"));
  if (!fakeBranchVisible) return nodes;

  const minX = Math.min(...nodes.map((node) => node.position.x));
  const maxX = Math.max(...nodes.map((node) => node.position.x));
  const centerX = (minX + maxX) / 2;
  const branchOffset = 190;
  const rowYByNodeId: Record<string, number> = {
    "fake-mint": 648,
    "fake-source": 204,
    "fake-vault": 426,
    "official-mint": 648,
    "official-source": 204,
    "official-vault": 426,
    treasury: 870,
    wallet: 12,
  };
  const xByNodeId: Record<string, number> = {
    "fake-mint": centerX + branchOffset,
    "fake-source": centerX + branchOffset,
    "fake-vault": centerX + branchOffset,
    "official-mint": centerX - branchOffset,
    "official-source": nodes.some((node) => node.id === "fake-source")
      ? centerX - branchOffset
      : centerX,
    "official-vault": centerX - branchOffset,
    treasury: centerX,
    wallet: centerX,
  };

  return nodes.map((node) => ({
    ...node,
    position: {
      ...node.position,
      x: xByNodeId[node.id] ?? node.position.x,
      y: rowYByNodeId[node.id] ?? node.position.y,
    },
  }));
}

function flowEdge(
  id: string,
  source: string,
  target: string,
  tone: ProtocolEdgeTone
): Edge {
  const isGreen = tone === "green";
  const isYellow = tone === "yellow";
  const isMuted = tone === "muted";
  const isActive = isGreen || isYellow;

  return {
    animated: isActive,
    id,
    source,
    target,
    type: "smoothstep",
    style: {
      filter: isGreen
        ? "drop-shadow(0 0 12px rgba(20,241,149,0.38))"
        : isYellow
          ? "drop-shadow(0 0 12px rgba(250,204,21,0.34))"
          : "none",
      opacity: isMuted ? 0.22 : 0.92,
      stroke: isGreen
        ? "#14f195"
        : isYellow
          ? "#facc15"
          : "rgba(255,255,255,0.2)",
      strokeWidth: isActive ? 2.6 : 1.35,
    },
  };
}

function ProtocolActivityPanel({
  activity,
  footer,
}: {
  activity: ProtocolActivityEvent[];
  footer?: ReactNode;
}) {
  return (
    <aside className="flex min-h-[360px] flex-col rounded-[28px] border border-border bg-card/72">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
          Protocol Activity
        </p>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]">
          Live
        </span>
      </div>

      <div className="flex-1 px-5 py-4">
        <div className="space-y-0">
          {activity.map((event, index) => (
            <ProtocolActivityRow
              event={event}
              isLast={index === activity.length - 1}
              key={`${event.title}-${index}`}
            />
          ))}
        </div>
      </div>

      {footer ? (
        <div className="border-t border-border p-4">{footer}</div>
      ) : null}
    </aside>
  );
}

function ProtocolActivityRow({
  event,
  isLast,
}: {
  event: ProtocolActivityEvent;
  isLast: boolean;
}) {
  const toneClass =
    event.tone === "corrupt"
      ? "border-red-400 bg-red-400"
      : event.tone === "warning"
        ? "border-amber-300 bg-amber-300"
        : event.tone === "active"
          ? "border-emerald-300 bg-emerald-300/20"
          : event.tone === "done"
            ? "border-emerald-300 bg-emerald-300"
            : "border-muted bg-transparent";

  return (
    <div className="level1-activity-entry grid grid-cols-[22px_minmax(0,1fr)] gap-4">
      <div className="flex flex-col items-center">
        <span className={`mt-1 h-3 w-3 rounded-full border ${toneClass}`} />
        {!isLast ? <span className="h-full min-h-10 w-px bg-border" /> : null}
      </div>
      <div className="pb-5">
        <p className="text-sm font-medium">{event.title}</p>
        {event.detail ? (
          <p className="mt-1 text-sm leading-6 text-muted">{event.detail}</p>
        ) : null}
      </div>
    </div>
  );
}

function Level1StateFooter({
  copied,
  isLoading,
  level1Error,
  level1State,
  onCopy,
  progress,
}: {
  copied: string | null;
  isLoading: boolean;
  level1Error: unknown;
  level1State?: Level1Snapshot;
  onCopy: (label: string, value: string) => Promise<void>;
  progress: number;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonLine className="h-10" />
        <SkeletonLine className="h-16" />
      </div>
    );
  }

  if (level1Error) {
    return (
      <div className="rounded-[18px] border border-destructive/20 bg-destructive/5 p-4">
        <p className="text-sm font-medium">Could not read Level 1 state</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          {level1Error instanceof Error
            ? level1Error.message
            : "The selected cluster returned an unexpected Level 1 account response."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <StatusTextRow
        label="Ledger"
        value={`${(level1State?.depositedAmount ?? 0n).toString()} / ${LEVEL_1_TARGET.toString()}`}
      />
      <div className="h-1.5 rounded-full bg-accent">
        <div
          className="h-full rounded-full bg-foreground transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      {level1State?.bankPda ? (
        <button
          type="button"
          onClick={() => {
            void onCopy("level1-bank", level1State.bankPda);
          }}
          className="min-h-10 rounded-full border border-border px-3 text-xs font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {copied === "level1-bank"
            ? "Bank PDA copied"
            : `Bank ${compactAddress(level1State.bankPda, 4, 4)}`}
        </button>
      ) : null}
    </div>
  );
}

function ExecutionButton({
  disabled,
  label,
  onClick,
}: {
  disabled: boolean;
  label: string;
  onClick: () => Promise<void> | void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-11 w-full rounded-full bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
    >
      {label}
    </button>
  );
}

function ExploitSequenceButton({
  active,
  badgeLabel,
  children,
  disabled,
  mapped,
  onClick,
  rejected,
}: {
  active: boolean;
  badgeLabel?: string;
  children: ReactNode;
  disabled: boolean;
  mapped: boolean;
  onClick: () => void;
  rejected: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 rounded-full border px-3 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45 ${
        rejected
          ? "level1-sequence-rejected border-red-300/60 bg-red-400/[0.075] text-red-100 shadow-[0_0_26px_-16px_rgba(248,113,113,0.75)]"
          : mapped
            ? "level1-sequence-mapped border-emerald-300/34 bg-emerald-400/[0.055] text-foreground shadow-[0_0_30px_-20px_rgba(52,211,153,0.8)]"
            : active
              ? "border-cyan-300/35 bg-background text-foreground"
              : "border-border bg-background text-muted hover:border-cyan-300/26 hover:text-foreground"
      }`}
    >
      <span className="flex items-center justify-center gap-2">
        {badgeLabel ? (
          <span
            className={`inline-flex h-4 min-w-4 items-center justify-center rounded-[6px] text-[9px] font-semibold ring-1 ${
              mapped
                ? "bg-emerald-400/13 text-emerald-200 ring-emerald-300/28"
                : rejected
                  ? "bg-red-400/12 text-red-200 ring-red-300/30"
                  : "bg-foreground/[0.035] text-muted ring-border"
            }`}
          >
            {badgeLabel}
          </span>
        ) : null}
        <span>{children}</span>
      </span>
    </button>
  );
}

function ExploitCodeWalkthrough({
  activeCodeLines,
  activeVariable,
  exploitPrepared,
  exploitSequence,
  exploitSequenceComplete,
  isSending,
  onExecute,
  onVariableFocus,
  sequenceFeedback,
  sequenceMiss,
  stage,
}: {
  activeCodeLines: number[];
  activeVariable: VariableKey;
  exploitPrepared: boolean;
  exploitSequence: VariableKey[];
  exploitSequenceComplete: boolean;
  isSending: boolean;
  onExecute: () => Promise<void> | void;
  onVariableFocus: (key: VariableKey) => void;
  sequenceFeedback: string | null;
  sequenceMiss: SequenceMiss | null;
  stage: StageConfig;
}) {
  const activeSet = new Set(activeCodeLines);
  const activeContext = getExploitVariableContext(activeVariable);
  const variableRows = [
    {
      key: "vault" as const,
      label: "Vault",
      line: 1,
      prefix: "const vault = ",
      value: "fakeVault",
    },
    {
      key: "mint" as const,
      label: "Mint",
      line: 2,
      prefix: "const mint = ",
      value: "counterfeitMint",
    },
    {
      key: "source" as const,
      label: "Source",
      line: 3,
      prefix: "const userTokenAccount = ",
      value: "counterfeitUserTokenAccount",
    },
    {
      key: "authority" as const,
      label: "Authority",
      line: 4,
      prefix: "const authority = ",
      value: "wallet",
    },
  ];
  const remainingLines = EXPLOIT_CODE.slice(4);

  return (
    <section className="overflow-hidden rounded-[28px] border border-foreground/10 bg-card/82 shadow-[0_22px_70px_-58px_rgba(0,0,0,0.8)]">
      <div className="border-b border-border px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
          Guided Exploit Anatomy
        </p>
      </div>
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-2">
          {variableRows.map(({ key, label }) => {
            const mappedIndex = exploitSequence.indexOf(key);
            const rejected = sequenceMiss?.attempted === key;
            const badgeLabel =
              mappedIndex >= 0
                ? String(mappedIndex + 1)
                : rejected
                  ? String(sequenceMiss.attemptedOrder)
                  : undefined;

            return (
              <ExploitSequenceButton
                key={key}
                active={activeVariable === key}
                badgeLabel={badgeLabel}
                disabled={!exploitPrepared}
                mapped={mappedIndex >= 0}
                rejected={rejected}
                onClick={() => onVariableFocus(key)}
              >
                {label}
              </ExploitSequenceButton>
            );
          })}
        </div>

        <pre className="overflow-x-auto rounded-[20px] border border-border bg-background/74 p-4 font-mono text-[13px] leading-7">
          <code className="block min-w-max">
            {variableRows.map(({ key, line, prefix, value }) => {
              const isActive = activeVariable === key;
              const mapped = exploitSequence.includes(key);
              return (
                <span
                  key={key}
                  className={`grid grid-cols-[2rem_minmax(0,1fr)] rounded-md px-2 transition-opacity ${
                    isActive
                      ? "level1-code-line-active bg-emerald-400/[0.055] text-foreground"
                      : "text-foreground/58"
                  }`}
                >
                  <span className="select-none text-right text-[11px] text-muted/60">
                    {line}
                  </span>
                  <span className="whitespace-pre pl-4">
                    {prefix}
                    <button
                      type="button"
                      disabled={!exploitPrepared}
                      onClick={() => onVariableFocus(key)}
                      className={`rounded-md px-1.5 py-0.5 font-mono transition-colors ${
                        mapped
                          ? "bg-emerald-400/10 text-emerald-100 ring-1 ring-emerald-300/18"
                          : isActive
                          ? "bg-emerald-400/12 text-emerald-100"
                          : "text-foreground hover:bg-accent"
                      } disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      {value}
                    </button>
                    ;
                  </span>
                </span>
              );
            })}
            {remainingLines.map((line, index) => {
              const lineNumber = index + 5;
              const isActive = activeSet.has(lineNumber);
              return (
                <span
                  key={`${lineNumber}-${line}`}
                  className={`grid grid-cols-[2rem_minmax(0,1fr)] rounded-md px-2 ${
                    isActive
                      ? "level1-code-line-active bg-emerald-400/[0.055] text-foreground"
                      : "text-foreground/72"
                  }`}
                >
                  <span className="select-none text-right text-[11px] text-muted/60">
                    {lineNumber}
                  </span>
                  <span className="whitespace-pre pl-4">{line || " "}</span>
                </span>
              );
            })}
          </code>
        </pre>

        <div className="rounded-[20px] border border-border bg-background/55 p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
            Exploit sequence
          </p>
          <p className="mt-2 text-sm font-medium">
            {exploitPrepared
              ? activeContext.title
              : "Prepare the challenge to unlock dependency mapping."}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {sequenceFeedback ?? activeContext.detail}
          </p>
        </div>

        {stage.description || stage.actionLabel ? (
          <div className="rounded-[20px] border border-emerald-400/12 bg-emerald-400/[0.035] p-4">
            {stage.description ? (
              <p className="text-sm leading-6 text-muted">
                {stage.description}
              </p>
            ) : null}
            {stage.actionLabel ? (
              <div className="mt-4">
                <ExecutionButton
                  disabled={
                    isSending ||
                    (stage.level1Mode !== "prepare" && !exploitSequenceComplete)
                  }
                  label={
                    isSending ? "Submitting instruction" : stage.actionLabel
                  }
                  onClick={onExecute}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function buildProtocolAccounts({
  activeVariable,
  address,
  isCounterfeitPath,
  labStage,
  manipulation,
  normalDepositObserved,
}: {
  activeVariable: VariableKey;
  address?: string;
  isCounterfeitPath: boolean;
  labStage: LabStage;
  manipulation: ManipulationState;
  normalDepositObserved: boolean;
}): ProtocolAccount[] {
  const fakeVault = labStage > 1 && manipulation.vault === "fake";
  const counterfeitMint = labStage > 1 && manipulation.mint === "counterfeit";
  const counterfeitSource =
    labStage > 1 && manipulation.source === "counterfeit";

  return [
    {
      active: activeVariable === "authority" || labStage < 3,
      detail: "Signer authority",
      id: "wallet",
      label: "User Wallet",
      tone: "neutral",
      relation:
        labStage === 3 && activeVariable === "authority"
          ? "signs transfer authority"
          : undefined,
      value: address ? compactAddress(address, 4, 4) : "Detached",
    },
    {
      active:
        activeVariable === "source" ||
        normalDepositObserved ||
        isCounterfeitPath,
      detail: counterfeitSource ? "100.00 FAKE" : "100.00 USDC",
      id: "source",
      label: counterfeitSource
        ? "Counterfeit Token Account"
        : "User Token Account",
      tone: counterfeitSource ? "fake" : "valid",
      relation:
        labStage === 3 && activeVariable === "source"
          ? "deposit source"
          : counterfeitSource
            ? "forged source"
            : undefined,
      value: counterfeitSource ? "Fake mint source" : "Official mint source",
    },
    {
      active: activeVariable === "vault" || labStage > 1,
      detail: fakeVault ? "User controlled" : "Expected custody",
      id: "vault",
      label: fakeVault ? "Fake Vault" : "Official Vault",
      tone: fakeVault ? "fake" : "valid",
      relation:
        labStage === 3 && activeVariable === "vault"
          ? "custody remapped"
          : fakeVault
            ? "untrusted custody"
            : undefined,
      value: fakeVault ? "0.00 FAKE" : "250,000.00 USDC",
    },
    {
      active: activeVariable === "mint" || counterfeitMint,
      detail: counterfeitMint ? "No real value" : "USDC",
      id: "mint",
      label: counterfeitMint ? "Counterfeit Mint" : "Official Mint",
      tone: counterfeitMint ? "fake" : "valid",
      relation:
        labStage === 3 && activeVariable === "mint"
          ? "asset legitimacy"
          : counterfeitMint
            ? "counterfeit asset"
            : undefined,
      value: counterfeitMint ? "FAKE" : "USDC",
    },
    {
      active:
        activeVariable === "vault" ||
        activeVariable === "mint" ||
        normalDepositObserved ||
        isCounterfeitPath,
      detail: "Internal ledger",
      id: "treasury",
      label: "Protocol Treasury",
      tone: isCounterfeitPath ? "corrupt" : "neutral",
      relation: isCounterfeitPath ? "ledger weakened" : undefined,
      value: isCounterfeitPath ? "Credit can inflate" : "250,000.00 USDC",
    },
  ];
}

function buildProtocolActivity({
  activeVariable,
  authorityRejected,
  exploitPreviewed,
  exploitPrepared,
  exploitReady,
  exploitSequence,
  isConnected,
  labStage,
  manipulation,
  manipulationTested,
  normalDepositObserved,
  sequenceFeedback,
  sequenceMiss,
  stageOneRevealStep,
}: {
  activeVariable: VariableKey;
  authorityRejected: boolean;
  exploitPreviewed: boolean;
  exploitPrepared: boolean;
  exploitReady: boolean;
  exploitSequence: VariableKey[];
  isConnected: boolean;
  labStage: LabStage;
  manipulation: ManipulationState;
  manipulationTested: boolean;
  normalDepositObserved: boolean;
  sequenceFeedback: string | null;
  sequenceMiss: SequenceMiss | null;
  stageOneRevealStep: number;
}): ProtocolActivityEvent[] {
  if (!isConnected && labStage === 1) {
    return [
      {
        detail: "Connect your wallet to begin.",
        title: "Waiting for action",
        tone: "waiting",
      },
    ];
  }

  if (labStage === 1 && !normalDepositObserved) {
    return [
      {
        detail: "Run a legitimate deposit to establish the baseline.",
        title: "Wallet connected",
        tone: "active",
      },
    ];
  }

  if (labStage === 1) {
    const events: ProtocolActivityEvent[] = [
      { title: "Wallet connected", tone: "done" },
    ];

    if (stageOneRevealStep >= 1) {
      events.push({ title: "Deposit instruction received", tone: "done" });
    }

    if (stageOneRevealStep >= 2) {
      events.push({ title: "Vault validation passed", tone: "done" });
    }

    if (stageOneRevealStep >= 3) {
      events.push({ title: "Tokens transferred", tone: "done" });
    }

    if (stageOneRevealStep >= 4) {
      events.push({ title: "Internal balance credited", tone: "done" });
    }

    if (stageOneRevealStep >= 5) {
      events.push({ title: "State updated successfully", tone: "done" });
    }

    return events;
  }

  if (labStage === 2 && !manipulationTested) {
    const events: ProtocolActivityEvent[] = [
      { title: "Manipulation surface active", tone: "active" },
    ];

    if (manipulation.vault === "fake") {
      events.push({ title: "Vault relationship remapped", tone: "warning" });
    }

    if (manipulation.mint === "counterfeit") {
      events.push({ title: "Counterfeit mint introduced", tone: "warning" });
    }

    if (manipulation.source === "counterfeit") {
      events.push({
        title: "Counterfeit token account linked",
        tone: "warning",
      });
    }

    if (manipulation.authority === "fake") {
      events.push({ title: "Authority relationship broken", tone: "warning" });
    }

    events.push({
      detail:
        events.length === 1
          ? "Swap account relationships to test protocol assumptions."
          : "The graph is reflecting the substituted trust relationships.",
      title:
        events.length === 1
          ? "Protocol relationships editable"
          : "Validation bypass candidate forming",
      tone: events.length === 1 ? "waiting" : "active",
    });

    return events;
  }

  if (labStage === 2 && authorityRejected) {
    return [
      { title: "Modified deposit received", tone: "done" },
      {
        detail: "The token program rejects the signer relationship.",
        title: "Authority mismatch detected",
        tone: "warning",
      },
    ];
  }

  if (labStage === 2 && exploitReady) {
    return [
      { title: "Modified deposit received", tone: "done" },
      { title: "Vault validation insufficient", tone: "warning" },
      { title: "Counterfeit mint accepted", tone: "corrupt" },
      { title: "Internal balance credited", tone: "corrupt" },
      { title: "Protocol state corrupted", tone: "corrupt" },
    ];
  }

  if (labStage === 2) {
    return [
      { title: "Modified deposit received", tone: "done" },
      {
        detail:
          "The selected substitutions are not enough to demonstrate ledger corruption.",
        title: "Protocol state unchanged",
        tone: "active",
      },
    ];
  }

  const focusedEvent = getFocusedVariableActivity(activeVariable);

  if (!exploitPrepared) {
    return [
      {
        detail: "Start the backend session and receive deterministic challenge accounts.",
        title: "Prepare For Exploit required",
        tone: "active",
      },
      {
        detail: "Exploit dependencies remain locked until setup completes.",
        title: "Sequence reconstruction locked",
        tone: "waiting",
      },
    ];
  }

  const sequenceEvents = exploitSequence.map((key) => ({
    detail: getFocusedVariableActivity(key).detail,
    title: `${getVariableLabel(key)} dependency mapped`,
    tone: "done" as const,
  }));

  const missEvent = sequenceMiss
    ? {
        detail: getSequenceMissReason(sequenceMiss),
        title: `${getVariableLabel(sequenceMiss.attempted)} selected too early`,
        tone: "warning" as const,
      }
    : null;

  if (exploitSequence.length < EXPLOIT_SEQUENCE.length) {
    const nextKey = EXPLOIT_SEQUENCE[exploitSequence.length];
    return [
      { title: "Exploit challenge prepared", tone: "done" },
      ...sequenceEvents,
      ...(missEvent ? [missEvent] : []),
      {
        detail:
          sequenceFeedback ??
          `Select ${getVariableLabel(nextKey)} as the next dependency.`,
        title: `Next dependency: ${getVariableLabel(nextKey)}`,
        tone: missEvent ? "warning" : "active",
      },
    ];
  }

  if (!exploitPreviewed) {
    return [
      { title: "Exploit challenge prepared", tone: "done" },
      ...sequenceEvents,
      {
        detail:
          "The exploit path has been reconstructed. Execution is now unlocked.",
        title: "Exploit execution unlocked",
        tone: "active",
      },
    ];
  }

  return [
    { title: "Exploit sequence reconstructed", tone: "done" },
    focusedEvent,
    { title: "Forged account structure accepted", tone: "corrupt" },
    { title: "Deposit instruction executed", tone: "done" },
    { title: "Worthless tokens accepted", tone: "corrupt" },
    { title: "Internal protocol credit inflated", tone: "corrupt" },
  ];
}

function getFocusedVariableActivity(
  activeVariable: VariableKey
): ProtocolActivityEvent {
  if (activeVariable === "vault") {
    return {
      detail: "The custody account now resolves to user-controlled state.",
      title: "Vault relationship remapped",
      tone: "corrupt",
    };
  }

  if (activeVariable === "mint") {
    return {
      detail: "The transferred asset no longer represents the expected mint.",
      title: "Counterfeit mint routed",
      tone: "corrupt",
    };
  }

  if (activeVariable === "source") {
    return {
      detail:
        "The source account carries worthless tokens with valid structure.",
      title: "Counterfeit token account linked",
      tone: "corrupt",
    };
  }

  return {
    detail: "The signer remains valid, so the fake asset path can execute.",
    title: "Authority validation satisfied",
    tone: "done",
  };
}

function getVariableLabel(activeVariable: VariableKey) {
  if (activeVariable === "vault") return "Vault";
  if (activeVariable === "mint") return "Mint";
  if (activeVariable === "source") return "Source";
  return "Authority";
}

function getSequenceMissReason({
  attempted,
  expected,
}: SequenceMiss): string {
  if (attempted === "authority") {
    return "Authority validation cannot occur before source substitution.";
  }

  if (attempted === "source" && expected === "vault") {
    return "Counterfeit source selection needs the custody path to be remapped first.";
  }

  if (attempted === "source" && expected === "mint") {
    return "Counterfeit asset path is incomplete until the mint dependency is mapped.";
  }

  if (attempted === "mint" && expected === "vault") {
    return "Counterfeit asset routing depends on vault substitution first.";
  }

  if (attempted === "vault") {
    return "Vault substitution is already behind the current dependency cursor.";
  }

  return `${getVariableLabel(attempted)} cannot be mapped before ${getVariableLabel(expected)}.`;
}

function getActiveExploitCodeLines(activeVariable: VariableKey) {
  if (activeVariable === "vault") return [1, 8];
  if (activeVariable === "mint") return [2];
  if (activeVariable === "source") return [3, 8];
  return [4, 8];
}

function getExploitVariableContext(activeVariable: VariableKey) {
  if (activeVariable === "vault") {
    return {
      detail:
        "The vault variable redirects custody to a user-controlled token account. The protocol still sees a valid token account shape, so the trust boundary moves without an explicit mint check.",
      title: "Custody relationship is substituted.",
    };
  }

  if (activeVariable === "mint") {
    return {
      detail:
        "The transferred asset is counterfeit, but the vulnerable instruction never compares it with the bank's expected mint. Legitimacy is assumed from structure.",
      title: "Mint legitimacy is never enforced.",
    };
  }

  if (activeVariable === "source") {
    return {
      detail:
        "The source account belongs to the signer and carries worthless tokens. That keeps authority valid while the asset value becomes meaningless.",
      title: "Counterfeit source remains structurally valid.",
    };
  }

  return {
    detail:
      "The authority intentionally remains the real wallet. This is why the exploit is accepted by token-program signer validation before corrupting protocol credit.",
    title: "Signer validation still passes.",
  };
}
