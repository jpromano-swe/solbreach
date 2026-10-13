"use client";

import { CircleAlert } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type StepState = "idle" | "active" | "done";

export function useRejectedFlowPulse({
  rejected,
  trigger,
}: {
  rejected: boolean;
  trigger: number;
}) {
  const [pulseActive, setPulseActive] = useState(false);

  useEffect(() => {
    let startFrame = 0;
    let timer = 0;
    const resetFrame = window.requestAnimationFrame(() => {
      setPulseActive(false);
      if (!rejected || trigger === 0) return;

      startFrame = window.requestAnimationFrame(() => setPulseActive(true));
      timer = window.setTimeout(() => setPulseActive(false), 500);
    });

    return () => {
      window.cancelAnimationFrame(resetFrame);
      window.cancelAnimationFrame(startFrame);
      window.clearTimeout(timer);
    };
  }, [rejected, trigger]);

  return pulseActive;
}

export function ProtocolVisualizationHeader({
  label,
  rejected,
}: {
  label: string;
  rejected: boolean;
}) {
  return (
    <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
      <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
        {label}
      </p>
      {rejected ? (
        <span
          role="status"
          aria-live="polite"
          className="inline-flex min-h-8 items-center gap-2 rounded-full border border-red-400/35 bg-red-500/10 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200"
        >
          <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
          Flow rejected
        </span>
      ) : null}
    </div>
  );
}

export function AnimatedInstructionLine({ text }: { text: string }) {
  return (
    <p
      key={text}
      aria-atomic="true"
      aria-live="polite"
      className="protocol-instruction-line min-h-6 text-sm leading-6 text-muted"
      role="status"
    >
      {text}
    </p>
  );
}

export function MiniBlock({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-border bg-background/75 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.05em]">{value}</p>
      <p className="mt-2 text-sm text-muted">{detail}</p>
    </div>
  );
}

export function SequenceCard({
  index,
  title,
  body,
  state,
}: {
  index: string;
  title: string;
  body: string;
  state: StepState;
}) {
  const wrapperTone =
    state === "done"
      ? "border-foreground bg-foreground text-background"
      : state === "active"
        ? "border-foreground/25 bg-card text-foreground"
        : "border-border bg-background/75 text-foreground";

  const badgeTone =
    state === "done"
      ? "bg-background/15 text-background"
      : state === "active"
        ? "bg-foreground text-background"
        : "bg-accent text-muted";

  return (
    <article className={`rounded-[22px] border p-4 ${wrapperTone}`}>
      <div className="flex items-center justify-between gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone}`}
        >
          {index}
        </span>
        <span className="text-[11px] uppercase tracking-[0.28em] opacity-70">
          {state === "done" ? "Done" : state === "active" ? "Live" : "Queued"}
        </span>
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em]">{title}</h3>
      <p className="mt-2 text-sm leading-6 opacity-78">{body}</p>
    </article>
  );
}

export function BriefCard({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-[24px] border border-border bg-background/75 p-5">
      <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
        {eyebrow}
      </p>
      <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
    </article>
  );
}

export function TestingField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const inputId = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="text-[11px] uppercase tracking-[0.28em] text-muted"
      >
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-12 w-full rounded-[18px] border border-border bg-card/80 px-4 text-sm text-foreground outline-none transition placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
    </div>
  );
}

export function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-2 h-1.5 w-1.5 rounded-full bg-foreground/80"
        aria-hidden="true"
      />
      <p>{text}</p>
    </div>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-10 items-center rounded-full border border-border bg-background px-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
      {children}
    </span>
  );
}

export function StatusChip({ children }: { children: ReactNode }) {
  const isLocked = children === "Locked";
  const toneClass = isLocked
    ? "border-violet-400/22 bg-violet-500/8 text-violet-100 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.14)]"
    : "border-emerald-400/20 bg-emerald-400/8 text-foreground shadow-[inset_0_0_0_1px_rgba(74,222,128,0.16)]";

  return (
    <span
      className={`inline-flex min-h-10 items-center rounded-full border px-4 text-[11px] font-semibold uppercase tracking-[0.28em] ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function InlineStep({
  index,
  label,
  state,
}: {
  index: string;
  label: string;
  state: StepState;
}) {
  const dotTone =
    state === "done"
      ? "bg-foreground"
      : state === "active"
        ? "bg-foreground/80"
        : "bg-accent";

  return (
    <div className="flex items-center justify-between rounded-full border border-border bg-card/80 px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={`h-2.5 w-2.5 rounded-full ${dotTone}`}
          aria-hidden="true"
        />
        <span className="font-mono text-xs text-muted">{index}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-[11px] uppercase tracking-[0.26em] text-muted">
        {state === "done" ? "Done" : state === "active" ? "Active" : "Idle"}
      </span>
    </div>
  );
}

export function AddressRow({
  label,
  value,
  copied,
  explorerUrl,
  onCopy,
}: {
  label: string;
  value?: string | null;
  copied: boolean;
  explorerUrl: string | null;
  onCopy?: () => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center">
      <span className="text-[11px] uppercase tracking-[0.26em] text-muted">
        {label}
      </span>
      <div className="min-w-0">
        {value && explorerUrl ? (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate font-mono text-xs text-foreground underline underline-offset-2"
            title={value}
          >
            {compactAddress(value)}
          </a>
        ) : (
          <span className="text-sm text-muted">Pending</span>
        )}
      </div>
      <div>
        {value && onCopy ? (
          <button
            onClick={onCopy}
            className="min-h-10 rounded-full border border-border px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted transition hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {copied ? "Done" : "Copy"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function StatusTextRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-center">
      <span className="text-[11px] uppercase tracking-[0.26em] text-muted">
        {label}
      </span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

export function SkeletonLine({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-[20px] bg-accent ${className}`} />
  );
}

export function compactAddress(address: string, start = 8, end = 8) {
  const minLength = start + end + 3;
  if (address.length <= minLength) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}
