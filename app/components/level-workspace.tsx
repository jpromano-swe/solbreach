"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronDown, WalletCards } from "lucide-react";
import { StatusChip } from "./level-ui";
import { useWallet } from "../lib/wallet/context";

export type LevelGuideContent = {
  cloneCommand: string;
  codeSnippet: string;
  hints: string[];
  lore: string[];
  missionTitle: string;
  subtitle: string;
  title: string;
  vulnerabilityActiveLabel?: string;
  vulnerabilityLabel?: string;
  vulnerabilityNote?: string;
  vulnerabilityTone?: "cyan" | "red";
  vulnerableLines?: number[];
  winCondition: string;
};

export type MissionStatusData = {
  badge: string;
  chipLabel: string;
  mintDisabled: boolean;
  mintLabel: string;
  onMint: () => void;
  progressValue: number;
  rows: Array<{ label: string; value: string }>;
};

export type Level0ProtocolActivityData = {
  certificateMinted: boolean;
  isLevel0Loading: boolean;
  isMinting: boolean;
  isSending: boolean;
  level0Error: unknown;
  level0State?: {
    hasUserStats: boolean;
    hasLevel0State: boolean;
    isCompleted: boolean;
  };
  mintDisabled: boolean;
  mintLabel: string;
  onContinueToLevel1: () => void;
  onMint: () => void;
  stage: {
    actionLabel: string | null;
    description: string;
    onAction?: () => Promise<void>;
    title: string;
  };
  status: string;
};

const RUST_CODE_KEYWORDS = new Set([
  "Account",
  "AccountMeta",
  "Context",
  "CpiContext",
  "Instruction",
  "Ok",
  "Program",
  "Pubkey",
  "Result",
  "Signer",
  "System",
  "Token",
  "TokenAccount",
  "UncheckedAccount",
  "Vec",
  "bump",
  "fn",
  "let",
  "msg",
  "mut",
  "pub",
  "seeds",
  "struct",
  "token",
  "vec",
]);

export function LevelWorkspacePage({
  guide,
  levelId,
  level0Activity,
  missionStatus,
}: {
  guide: LevelGuideContent;
  levelId?: string;
  level0Activity?: Level0ProtocolActivityData;
  missionStatus: MissionStatusData;
}) {
  if (levelId === "level0" && level0Activity) {
    return (
      <Level0WorkspacePage guide={guide} level0Activity={level0Activity} />
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-5xl font-semibold tracking-[-0.08em] sm:text-6xl">
          {guide.missionTitle}
        </h1>
      </div>

      <div className="h-px bg-border" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-stretch">
        <div className="space-y-6">
          <InfoCard title="Lore">
            <div className="space-y-4 text-base leading-8 text-muted">
              {guide.lore.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </InfoCard>

          <InfoCard title="Hints">
            <ul className="space-y-4 text-base leading-8 text-muted">
              {guide.hints.map((hint) => (
                <li key={hint} className="flex items-start gap-3">
                  <span
                    className="mt-3 h-1.5 w-1.5 rounded-full bg-foreground/80"
                    aria-hidden="true"
                  />
                  <span>{hint}</span>
                </li>
              ))}
            </ul>
          </InfoCard>
        </div>

        <MissionStatusCard
          badge={missionStatus.badge}
          chipLabel={missionStatus.chipLabel}
          mintDisabled={missionStatus.mintDisabled}
          mintLabel={missionStatus.mintLabel}
          onMint={missionStatus.onMint}
          progressValue={missionStatus.progressValue}
          rows={missionStatus.rows}
          winCondition={guide.winCondition}
        />
      </div>

      <CodeSnippetCard
        key={guide.title}
        code={guide.codeSnippet}
        vulnerabilityActiveLabel={guide.vulnerabilityActiveLabel}
        vulnerabilityLabel={guide.vulnerabilityLabel}
        vulnerabilityNote={guide.vulnerabilityNote}
        vulnerabilityTone={guide.vulnerabilityTone}
        vulnerableLines={guide.vulnerableLines}
      />
      <PlaygroundCommandBar command={guide.cloneCommand} />
    </section>
  );
}

function Level0WorkspacePage({
  guide,
  level0Activity,
}: {
  guide: LevelGuideContent;
  level0Activity: Level0ProtocolActivityData;
}) {
  return (
    <section className="grid gap-y-7 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-start xl:gap-x-8">
      <div className="max-w-3xl space-y-4 xl:col-start-1 xl:row-start-1">
        <h1 className="text-5xl font-semibold tracking-[-0.08em] sm:text-6xl">
          {guide.missionTitle}
        </h1>
        <div className="max-w-2xl space-y-2 text-base leading-7 text-muted sm:text-lg">
          {guide.lore.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>

      <div className="min-w-0 xl:col-start-1 xl:row-start-2">
        <ProtocolNotes notes={guide.hints} />
      </div>

      <div className="xl:hidden">
        <ProtocolActivityPanel data={level0Activity} />
      </div>

      <div className="min-w-0 xl:col-start-1 xl:row-start-3">
        <CodeSnippetCard
          key={guide.title}
          activeProtocolLines={getLevel0ActiveCodeLines(level0Activity)}
          code={guide.codeSnippet}
          vulnerabilityActiveLabel={guide.vulnerabilityActiveLabel}
          vulnerabilityLabel={guide.vulnerabilityLabel}
          vulnerabilityNote={guide.vulnerabilityNote}
          vulnerabilityTone={guide.vulnerabilityTone}
          vulnerableLines={guide.vulnerableLines}
        />
      </div>

      <div className="hidden xl:col-start-2 xl:row-span-2 xl:row-start-2 xl:block">
        <ProtocolActivityPanel data={level0Activity} />
      </div>
    </section>
  );
}

function ProtocolNotes({ notes }: { notes: string[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-[20px] border border-border/80 bg-card/55 px-4 py-3">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-10 w-full items-center justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span>
          <span className="block text-[11px] uppercase tracking-[0.3em] text-muted">
            Protocol Notes
          </span>
          <span className="mt-1 block text-sm text-foreground">
            View protocol notes
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-reduce:transition-none ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      <div
        className={`grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <ul className="space-y-3 pb-2 pt-4 text-sm leading-6 text-muted">
            {notes.map((note) => (
              <li key={note} className="flex items-start gap-3">
                <span
                  className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#14f195]/80"
                  aria-hidden="true"
                />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

type ProtocolEventState = "waiting" | "active" | "done" | "complete" | "error";

type ProtocolEvent = {
  detail?: string;
  state: ProtocolEventState;
  title: string;
};

function ProtocolActivityPanel({ data }: { data: Level0ProtocolActivityData }) {
  const events = useMemo(() => buildLevel0ProtocolEvents(data), [data]);
  const isConnected = data.status === "connected";
  const isProtocolComplete = Boolean(data.level0State?.isCompleted);
  const showContinueButton = isConnected && isProtocolComplete;

  return (
    <aside className="flex min-h-[360px] flex-col rounded-[24px] border border-border/90 bg-card/72 shadow-[0_20px_70px_-52px_rgba(0,0,0,0.72)] xl:sticky xl:top-28 xl:min-h-[320px]">
      <div className="flex items-center justify-between gap-3 border-b border-border/75 px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.32em] text-muted">
          Protocol Activity
        </p>
        <StatusChip>{isConnected ? "Live" : "Ready"}</StatusChip>
      </div>

      <div className="flex-1 px-5 py-6">
        <div className="space-y-0">
          {events.map((event, index) => (
            <ProtocolActivityEvent
              event={event}
              isLast={index === events.length - 1}
              key={`${event.title}-${index}`}
              order={index}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-border/75 px-5 py-5">
        {data.status !== "connected" ? (
          <ProtocolWalletConnectButton />
        ) : data.stage.actionLabel && data.stage.onAction ? (
          <ProtocolPrimaryButton
            disabled={data.isSending}
            label={
              data.isSending ? "Submitting instruction" : data.stage.actionLabel
            }
            onClick={() => {
              void data.stage.onAction?.();
            }}
          />
        ) : !showContinueButton ? (
          <button
            type="button"
            disabled
            className="min-h-13 w-full rounded-full border border-border bg-background/65 px-5 text-sm font-medium text-muted"
          >
            Protocol settled
          </button>
        ) : null}
        {showContinueButton ? (
          <ContinueToLevelButton onClick={data.onContinueToLevel1} />
        ) : null}
        {isConnected ? (
          <p className="mt-3 text-center text-xs leading-5 text-muted">
            {data.stage.description}
          </p>
        ) : null}
      </div>
    </aside>
  );
}

function ProtocolActivityEvent({
  event,
  isLast,
  order,
}: {
  event: ProtocolEvent;
  isLast: boolean;
  order: number;
}) {
  const isDone = event.state === "done";
  const isActive = event.state === "active";
  const isComplete = event.state === "complete";
  const isError = event.state === "error";
  const nodeClass = isError
    ? "border-destructive bg-destructive/20"
    : isComplete
      ? "protocol-activity-node-complete border-[#14f195] bg-[#14f195]"
      : isDone
        ? "border-[#14f195] bg-[#14f195]"
        : isActive
          ? "protocol-activity-node-active border-[#14f195] bg-[#14f195]/14"
          : "border-muted bg-background";

  return (
    <div
      className="protocol-activity-entry grid grid-cols-[28px_minmax(0,1fr)] gap-4"
      style={{ animationDelay: `${Math.min(order * 70, 280)}ms` }}
    >
      <div className="flex flex-col items-center">
        <span
          className={`mt-1 h-5 w-5 rounded-full border ${nodeClass}`}
          aria-hidden="true"
        />
        {!isLast ? (
          <span
            className={`protocol-activity-line mt-2 w-px flex-1 min-h-12 ${
              isDone
                ? "bg-[#14f195]/35"
                : isComplete
                  ? "bg-[#14f195]/28"
                  : isActive
                    ? "bg-gradient-to-b from-[#14f195]/35 to-border"
                    : "bg-border"
            }`}
            aria-hidden="true"
          />
        ) : null}
      </div>
      <div className={`${isLast ? "" : "pb-9"}`}>
        <p className="text-sm font-medium text-foreground">{event.title}</p>
        {event.detail ? (
          <p className="mt-1 text-sm leading-6 text-muted">{event.detail}</p>
        ) : null}
      </div>
    </div>
  );
}

function buildLevel0ProtocolEvents(data: Level0ProtocolActivityData) {
  if (data.status !== "connected") {
    return [
      {
        detail: "Connect your wallet to begin.",
        state: "waiting",
        title: "Waiting for action",
      },
    ] satisfies ProtocolEvent[];
  }

  const events: ProtocolEvent[] = [
    { state: "done", title: "Wallet signature received" },
  ];

  if (data.level0Error) {
    events.push({
      detail: "Retry the account read before submitting another instruction.",
      state: "error",
      title: "Registry state read failed",
    });
    return events;
  }

  if (data.isLevel0Loading) {
    events.push({
      detail: "Resolving deterministic account state.",
      state: "active",
      title: "Deriving Player Registry PDA",
    });
    return events;
  }

  events.push({ state: "done", title: "Deriving Player Registry PDA" });

  if (!data.level0State?.hasUserStats) {
    events.push({
      detail: "Initialize the registry PDA to continue.",
      state: "active",
      title: "UserStats account ready",
    });
    return events;
  }

  events.push({ state: "done", title: "UserStats account initialized" });

  if (data.level0State.isCompleted) {
    events.push(
      { state: "done", title: "Temporary Level PDA created" },
      { state: "done", title: "Verifier instruction executed" },
      { state: "done", title: "Level PDA closed successfully" },
      { state: "done", title: "Registry state updated" },
      { state: "complete", title: "Protocol warmup completed" }
    );

    return events;
  }

  if (!data.level0State.hasLevel0State) {
    events.push({
      detail: "Create the temporary level account.",
      state: "active",
      title: "Temporary Level PDA ready",
    });
    return events;
  }

  events.push(
    { state: "done", title: "Temporary Level PDA created" },
    {
      detail: "Close temporary state and record completion.",
      state: "active",
      title: "Verifier instruction ready",
    }
  );

  return events;
}

function getLevel0ActiveCodeLines(data: Level0ProtocolActivityData) {
  if (data.status !== "connected" || data.level0Error) return [];

  if (data.isLevel0Loading) {
    return [8];
  }

  if (!data.level0State?.hasUserStats) {
    return [8, 11];
  }

  if (data.level0State.isCompleted) {
    return [23, 25];
  }

  if (!data.level0State.hasLevel0State) {
    return [14, 17, 20];
  }

  return [23, 25];
}

function ProtocolWalletConnectButton() {
  const { connectors, connect, error, status } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((current) => !current)}
        className="group inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-5 text-sm font-medium text-white shadow-[0_18px_50px_-24px_rgba(153,69,255,0.9)] transition-colors hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <WalletCards className="h-4 w-4" aria-hidden="true" />
        {status === "connecting" ? "Connecting Wallet" : "Connect Wallet"}
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute inset-x-0 bottom-full z-20 mb-3 rounded-[18px] border border-border bg-popover p-3 shadow-lg"
        >
          <p className="px-2 pb-2 pt-1 text-xs font-medium text-muted">
            Choose a wallet
          </p>
          <div className="space-y-1" role="none">
            {connectors.map((connector) => (
              <button
                type="button"
                role="menuitem"
                key={connector.id}
                onClick={async () => {
                  try {
                    await connect(connector.id);
                    setIsOpen(false);
                  } catch {
                    /* connection errors are surfaced below */
                  }
                }}
                disabled={status === "connecting"}
                className="flex min-h-11 w-full items-center gap-3 rounded-[14px] px-3 text-left text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              >
                {connector.icon ? (
                  <span
                    className="h-5 w-5 shrink-0 rounded bg-cover bg-center"
                    style={{ backgroundImage: `url(${connector.icon})` }}
                    aria-hidden="true"
                  />
                ) : (
                  <WalletCards
                    className="h-5 w-5 shrink-0 text-muted"
                    aria-hidden="true"
                  />
                )}
                <span>{connector.name}</span>
              </button>
            ))}
          </div>
          {connectors.length === 0 ? (
            <p className="px-2 py-2 text-xs leading-5 text-muted">
              No supported wallet detected.
            </p>
          ) : null}
          {status === "connecting" ? (
            <p className="px-2 pt-2 text-xs text-muted">Connecting...</p>
          ) : null}
          {error ? (
            <p className="px-2 pt-2 text-xs text-destructive">
              {error instanceof Error ? error.message : String(error)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ProtocolPrimaryButton({
  disabled,
  label,
  onClick,
}: {
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-13 w-full items-center justify-center rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-5 text-sm font-medium text-white shadow-[0_18px_50px_-24px_rgba(153,69,255,0.9)] transition-colors hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
    >
      {label}
    </button>
  );
}

function ContinueToLevelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="protocol-completion-cta mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-background/72 px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      Continue to Level 1
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function MissionStatusCard({
  badge,
  chipLabel,
  mintDisabled,
  mintLabel,
  onMint,
  progressValue,
  rows,
  winCondition,
}: {
  badge: string;
  chipLabel: string;
  mintDisabled: boolean;
  mintLabel: string;
  onMint: () => void;
  progressValue: number;
  rows: Array<{ label: string; value: string }>;
  winCondition: string;
}) {
  const mintButtonTone = mintDisabled
    ? "border-border bg-card text-muted"
    : "border-emerald-400/20 bg-emerald-400/8 text-foreground shadow-[inset_0_0_0_1px_rgba(74,222,128,0.16)]";

  return (
    <aside className="flex h-full flex-col rounded-[28px] border border-border bg-card/92 p-5 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.45)] xl:sticky xl:top-28">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
            Mission Status
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.05em]">
            {badge}
          </p>
        </div>
        <StatusChip>{chipLabel}</StatusChip>
      </div>

      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0"
          >
            <span className="text-[11px] uppercase tracking-[0.24em] text-muted">
              {row.label}
            </span>
            <span className="truncate text-right text-sm font-medium text-foreground">
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.22em] text-muted">
          <span>Win condition</span>
          <span>{Math.round(progressValue)}%</span>
        </div>
        <div className="h-2 rounded-full bg-accent">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(45,212,191,0.95),rgba(74,222,128,0.95))]"
            style={{ width: `${Math.max(0, Math.min(progressValue, 100))}%` }}
          />
        </div>
        <p className="text-sm leading-6 text-muted">{winCondition}</p>
      </div>

      <button
        type="button"
        onClick={onMint}
        disabled={mintDisabled}
        className={`mt-auto min-h-12 w-full rounded-full border px-5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed ${mintButtonTone} ${
          mintDisabled ? "" : "hover:bg-emerald-400/12"
        }`}
      >
        {mintLabel}
      </button>
    </aside>
  );
}

function InfoCard({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-[28px] border border-border bg-card/90 p-5 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.45)]">
      <h2 className="text-3xl font-semibold tracking-[-0.05em]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CodeSnippetCard({
  activeProtocolLines = [],
  code,
  vulnerabilityActiveLabel,
  vulnerabilityLabel = "Vulnerability",
  vulnerabilityNote,
  vulnerabilityTone = "red",
  vulnerableLines = [],
}: {
  activeProtocolLines?: number[];
  code: string;
  vulnerabilityActiveLabel?: string;
  vulnerabilityLabel?: string;
  vulnerabilityNote?: string;
  vulnerabilityTone?: "cyan" | "red";
  vulnerableLines?: number[];
}) {
  const [showVulnerableCode, setShowVulnerableCode] = useState(false);
  const vulnerableLineSet = useMemo(
    () => new Set(vulnerableLines),
    [vulnerableLines]
  );
  const activeProtocolLineSet = useMemo(
    () => new Set(activeProtocolLines),
    [activeProtocolLines]
  );
  const lines = useMemo(() => code.split("\n"), [code]);
  const hasVulnerableLines = vulnerableLines.length > 0;
  const isRedHighlight = vulnerabilityTone === "red";
  const revealToneClass = isRedHighlight
    ? "border-amber-300/20 bg-amber-300/8 text-amber-200"
    : "border-cyan-300/12 bg-cyan-300/[0.035] text-cyan-100/78";
  const revealBodyClass = isRedHighlight ? "text-amber-50/78" : "text-muted";

  return (
    <section className="overflow-hidden rounded-[22px] border border-border/85 bg-card/72 shadow-[0_18px_60px_-52px_rgba(0,0,0,0.55)]">
      <div className="flex flex-col gap-3 border-b border-border/75 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
          Code Snippet (lib.rs)
        </p>
        {hasVulnerableLines ? (
          <button
            type="button"
            aria-pressed={showVulnerableCode}
            onClick={() => setShowVulnerableCode((current) => !current)}
            className={`min-h-10 rounded-full border px-4 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              showVulnerableCode
                ? "border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/14"
                : "border-border bg-background/70 text-foreground hover:bg-accent"
            }`}
          >
            {showVulnerableCode
              ? (vulnerabilityActiveLabel ?? "Hide Vulnerable Code")
              : isRedHighlight
                ? "Show Vulnerable Code"
                : "Show Review Notes"}
          </button>
        ) : null}
      </div>
      <div className="overflow-x-auto bg-background/22 px-4 py-5 sm:px-5">
        {vulnerabilityNote ? (
          <div
            className={`overflow-hidden motion-safe:transition-[max-height,opacity,transform,margin] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none ${
              showVulnerableCode
                ? "mb-4 max-h-40 translate-y-0 opacity-100"
                : "mb-0 max-h-0 -translate-y-1 opacity-0"
            }`}
            aria-hidden={!showVulnerableCode}
          >
            <div className={`rounded-2xl border px-4 py-3 ${revealToneClass}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em]">
                {vulnerabilityLabel}
              </p>
              <p className={`mt-1 text-sm leading-6 ${revealBodyClass}`}>
                {vulnerabilityNote}
              </p>
            </div>
          </div>
        ) : null}
        <pre className="min-w-full font-mono text-[13px] leading-7">
          <code className="block min-w-max">
            {lines.map((line, index) => {
              const lineNumber = index + 1;
              const isVulnerableLine = vulnerableLineSet.has(lineNumber);
              const isActiveProtocolLine =
                activeProtocolLineSet.has(lineNumber);
              const shouldDimLine =
                showVulnerableCode && hasVulnerableLines && !isVulnerableLine;

              return (
                <span
                  key={`${lineNumber}-${line}`}
                  className={`grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4 rounded-md border px-3 motion-safe:transition-[border-color,background-color,color,opacity,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none ${
                    showVulnerableCode && isVulnerableLine
                      ? isRedHighlight
                        ? "border-red-400/30 bg-red-500/10 text-red-100 shadow-[0_0_34px_-22px_rgba(248,113,113,0.95)]"
                        : "border-cyan-300/12 bg-cyan-300/[0.035] text-foreground"
                      : isActiveProtocolLine
                        ? "protocol-code-line-active border-[#14f195]/16 bg-[#14f195]/[0.045] text-foreground"
                        : "border-transparent text-foreground"
                  } ${shouldDimLine ? "opacity-35" : "opacity-100"}`}
                >
                  <span
                    className={`select-none text-right text-[11px] ${
                      showVulnerableCode && isVulnerableLine
                        ? isRedHighlight
                          ? "text-red-200/80"
                          : "text-cyan-100/80"
                        : isActiveProtocolLine
                          ? "text-[#14f195]/70"
                          : "text-muted/55"
                    }`}
                    aria-hidden="true"
                  >
                    {lineNumber}
                  </span>
                  <span className="whitespace-pre">
                    {renderRustLine(line, {
                      isDimmed: shouldDimLine,
                      isVulnerable: showVulnerableCode && isVulnerableLine,
                      tone: vulnerabilityTone,
                    })}
                  </span>
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </section>
  );
}

function renderRustLine(
  line: string,
  {
    isDimmed,
    isVulnerable,
    tone,
  }: {
    isDimmed: boolean;
    isVulnerable: boolean;
    tone: "cyan" | "red";
  }
) {
  if (line.trim().length === 0) {
    return "\u00A0";
  }

  if (isDimmed) {
    return <span className="text-muted">{line}</span>;
  }

  if (isVulnerable) {
    return (
      <span className={tone === "red" ? "text-red-100" : "text-cyan-100"}>
        {line}
      </span>
    );
  }

  const commentStart = line.indexOf("//");
  if (commentStart >= 0) {
    const beforeComment = line.slice(0, commentStart);
    const comment = line.slice(commentStart);

    return (
      <>
        {renderRustTokens(beforeComment)}
        <span className="text-emerald-300/70">{comment}</span>
      </>
    );
  }

  return renderRustTokens(line);
}

function renderRustTokens(line: string) {
  const parts = line
    .split(/(#\[[^\]]+\]|b?"[^"]*"|\b[A-Za-z_][A-Za-z0-9_]*\b|\d+)/g)
    .filter(Boolean);

  return parts.map((part, index) => {
    const key = `${part}-${index}`;

    if (/^#\[/.test(part)) {
      return (
        <span key={key} className="text-violet-300">
          {part}
        </span>
      );
    }

    if (/^b?"[^"]*"$/.test(part)) {
      return (
        <span key={key} className="text-emerald-300">
          {part}
        </span>
      );
    }

    if (/^\d+$/.test(part)) {
      return (
        <span key={key} className="text-cyan-200">
          {part}
        </span>
      );
    }

    if (RUST_CODE_KEYWORDS.has(part)) {
      return (
        <span key={key} className="text-[#14f195]">
          {part}
        </span>
      );
    }

    return <span key={key}>{part}</span>;
  });
}

function PlaygroundCommandBar({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-[24px] border border-border bg-card/90 p-3 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.45)] sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1 rounded-[18px] border border-border bg-background/75 px-4 py-3 font-mono text-sm text-foreground">
        <span className="block truncate">{command}</span>
      </div>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(command);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        }}
        className="min-h-12 rounded-[18px] border border-emerald-500/25 bg-emerald-500/15 px-5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {copied ? "Copied" : "Copy playground command"}
      </button>
    </div>
  );
}
