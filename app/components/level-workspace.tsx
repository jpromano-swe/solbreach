"use client";

import { useMemo, useState, type ReactNode } from "react";
import { StatusChip } from "./level-ui";

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
  missionStatus,
}: {
  guide: LevelGuideContent;
  missionStatus: MissionStatusData;
}) {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.32em] text-muted">
          {guide.subtitle}
        </p>
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

function InfoCard({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-[28px] border border-border bg-card/90 p-5 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.45)]">
      <h2 className="text-3xl font-semibold tracking-[-0.05em]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CodeSnippetCard({
  code,
  vulnerabilityActiveLabel,
  vulnerabilityLabel = "Vulnerability",
  vulnerabilityNote,
  vulnerabilityTone = "red",
  vulnerableLines = [],
}: {
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
  const lines = useMemo(() => code.split("\n"), [code]);
  const hasVulnerableLines = vulnerableLines.length > 0;
  const isRedHighlight = vulnerabilityTone === "red";
  const revealToneClass = isRedHighlight
    ? "border-amber-300/20 bg-amber-300/8 text-amber-200"
    : "border-cyan-300/20 bg-cyan-300/8 text-cyan-200";
  const revealBodyClass = isRedHighlight
    ? "text-amber-50/78"
    : "text-cyan-50/78";

  return (
    <section className="overflow-hidden rounded-[28px] border border-border bg-card/90 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
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
      <div className="overflow-x-auto px-5 py-5">
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
              const shouldDimLine =
                showVulnerableCode && hasVulnerableLines && !isVulnerableLine;

              return (
                <span
                  key={`${lineNumber}-${line}`}
                  className={`grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4 rounded-lg border px-3 motion-safe:transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none ${
                    showVulnerableCode && isVulnerableLine
                      ? isRedHighlight
                        ? "border-red-400/30 bg-red-500/10 text-red-100 shadow-[0_0_34px_-22px_rgba(248,113,113,0.95)]"
                        : "border-cyan-300/25 bg-cyan-300/8 text-cyan-100 shadow-[0_0_34px_-22px_rgba(103,232,249,0.75)]"
                      : "border-transparent text-foreground"
                  } ${shouldDimLine ? "opacity-35" : "opacity-100"}`}
                >
                  <span
                    className={`select-none text-right text-[11px] ${
                      showVulnerableCode && isVulnerableLine
                        ? isRedHighlight
                          ? "text-red-200/80"
                          : "text-cyan-100/80"
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
