"use client";

import Image from "next/image";
import {
  useCallback,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Clock3,
  Code2,
  Download,
  ExternalLink,
  GitPullRequestArrow,
  Play,
  Search,
  Send,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

type RoomTab = "details" | "knownIssues" | "scope";
type RoomView = "list" | "room";
type ReviewState = "notSubmitted" | "judged";

type ReportFields = {
  impact: ReportDraft["impact"];
  likelihood: ReportDraft["likelihood"];
  reportMarkdown: string;
  scope: string;
  title: string;
};

type ReportDraft = {
  category: string;
  impact: "High" | "Medium" | "Low";
  likelihood: "High" | "Medium" | "Low";
  mitigation: string;
  proof: string;
  reportMarkdown: string;
  rootImpact: string;
  scope: string;
  title: string;
};

const ROOM_TABS: Array<{
  icon: LucideIcon;
  id: RoomTab;
  label: string;
}> = [
  { id: "details", label: "Contest Details", icon: ClipboardList },
  { id: "knownIssues", label: "Known Issues", icon: ShieldCheck },
  { id: "scope", label: "Scope", icon: Code2 },
];

const BREACH_ROOM = {
  id: "br-1",
  title: "Breach Room 1",
  subtitle: "Vault Bridge",
  category: "Rust / Anchor",
  difficulty: "Beginner Friendly",
  xp: 100,
  nsloc: 290,
  repoPath: "local-breach-rooms/breach-room-1",
  description:
    "Vault Bridge coordinates contributor task approvals, receipt reopening, and payout routing through a compact Anchor treasury workflow.",
  tags: ["Rust", "Anchor"],
};

const AUDITOR_SKILL_SETUP = [
  {
    title: "Install the Solana auditor skill",
    command: "Install: https://github.com/solanabr/auditor-skill",
    description: "Add the auditor workflow before opening the room codebase.",
  },
  {
    title: "Run it from the Rust codebase",
    command: "/auditor:audit-cycle",
    description: "Use this slash command after cloning the Breach Room repo.",
  },
];

const SCOPE_FILES = [
  "programs/breach_room_1/src/lib.rs",
  "tests/breach_room_1.ts",
  "Anchor.toml",
  "Cargo.toml",
  "package.json",
];

const REVIEW_FINDINGS = {
  matched: [
    {
      severity: "High",
      title: "Caller-selected payout program is accepted during CPI execution",
      reference: "Matched: execute_payout_via_cpi route",
    },
  ],
  missed: [
    {
      severity: "Medium",
      title:
        "Task approval accepts valid but mismatched category and vault accounts",
    },
    {
      severity: "Low",
      title:
        "Receipt lifecycle can reopen a reused PDA without a one-way generation guard",
    },
  ],
};

const BREACH_ROOM_REPORT_TEMPLATE = `# Root + Impact

## Description
- Describe the normal behavior in one or more sentences.
- Explain the specific issue or problem in one or more sentences.

## Root Cause
\`\`\`rust
// Root cause in the codebase with @> marks to highlight the relevant section
\`\`\`

## Risk
**Likelihood:**
- Reason 1 // Describe when this will occur. Avoid using "if" statements.
- Reason 2

**Impact:**
- Impact 1
- Impact 2

## Proof of Concept
\`\`\`rust
// Add reproduction steps, test code, or transaction-building logic here.
\`\`\`

## Recommended Mitigation
\`\`\`rust
// Replace the vulnerable path with the required validation or constraint.
\`\`\`

## Evidence
- Source reference:
- Test or transaction evidence:
- Account/state delta:

## Notes
Add any assumptions, reproduction limits, or extra reviewer context.
`;

const INITIAL_REPORT_FIELDS: ReportFields = {
  impact: "Medium",
  likelihood: "Medium",
  reportMarkdown: BREACH_ROOM_REPORT_TEMPLATE,
  scope: "",
  title: "",
};

const INITIAL_REPORT_DRAFT: ReportDraft = {
  category: "",
  impact: "Medium",
  likelihood: "Medium",
  mitigation: "",
  proof: "",
  reportMarkdown: BREACH_ROOM_REPORT_TEMPLATE,
  rootImpact: "",
  scope: "",
  title: "",
};

function StatusPill({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: "amber" | "blue" | "green" | "purple" | "red" | "zinc";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
      : tone === "purple"
        ? "border-primary/30 bg-primary/15 text-primary"
        : tone === "amber"
          ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-200"
          : tone === "red"
            ? "border-red-400/30 bg-red-400/10 text-red-200"
            : tone === "blue"
              ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
              : "border-white/10 bg-white/[0.04] text-zinc-300";

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold ${toneClass}`}
    >
      {children}
    </span>
  );
}

function LiveStatusPill() {
  return (
    <span className="inline-flex min-h-7 items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 text-xs font-semibold text-emerald-200">
      <span className="relative flex h-2 w-2" aria-hidden={true}>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
      </span>
      Live
    </span>
  );
}

function RoomMark() {
  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/30 bg-[radial-gradient(circle_at_38%_25%,rgba(20,241,149,0.45),transparent_35%),linear-gradient(135deg,rgba(153,69,255,0.75),rgba(20,241,149,0.35),rgba(0,0,0,0.82))] shadow-[0_18px_60px_-26px_rgba(20,241,149,0.75)]">
      <div className="absolute inset-[6px] rounded-xl border border-white/15" />
      <ShieldCheck className="relative h-8 w-8 text-white" aria-hidden={true} />
    </div>
  );
}

function TutorialModal({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-md">
      <section
        aria-label="Breach Room 1 setup"
        className="relative max-h-[calc(100vh-3rem)] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-white/[0.12] bg-[#07090b] p-6 shadow-[0_34px_110px_-42px_rgba(153,69,255,0.55)] sm:p-8"
      >
        <div className="mb-7 flex items-center gap-3">
          <Image
            src="/logo_crop.png"
            alt="SolBreach"
            width={1480}
            height={304}
            className="h-10 w-auto"
            priority
          />
          <StatusPill tone="purple">Breach Room 1</StatusPill>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary">
            Before You Audit
          </p>
          <h2 className="max-w-xl text-4xl font-semibold tracking-[-0.07em] text-foreground sm:text-5xl">
            Install the auditor workflow.
          </h2>
        </div>

        <div className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-black/60">
          <div className="flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(153,69,255,0.22),transparent_38%),linear-gradient(135deg,rgba(20,241,149,0.11),rgba(153,69,255,0.09),rgba(0,0,0,0.78))]">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-black/50 text-primary">
                <Play className="h-7 w-7 fill-current" aria-hidden={true} />
              </span>
              <div>
                <p className="text-lg font-semibold text-foreground">
                  Room briefing placeholder
                </p>
                <p className="mt-1 text-sm text-muted">
                  Add the walkthrough video when the first room is final.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm font-semibold text-zinc-300">
          Clone the repo as you would normally do.
        </p>

        <div className="mt-7 space-y-4">
          {AUDITOR_SKILL_SETUP.map((item, index) => (
            <div
              key={item.title}
              className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-sm font-semibold text-primary">
                {index + 1}
              </span>
              <div>
                <p className="font-semibold text-foreground">{item.title}</p>
                <code className="mt-2 block rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-xs text-zinc-200">
                  {item.command}
                </code>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onStart}
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_18px_52px_-22px_rgba(153,69,255,0.75)] transition-transform hover:-translate-y-0.5 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Open Breach Room 1
          <ArrowRight className="h-4 w-4" aria-hidden={true} />
        </button>
      </section>
    </div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        active
          ? "border-primary/45 bg-primary/[0.18] text-primary"
          : "border-white/10 bg-white/[0.03] text-muted hover:bg-white/[0.06] hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden={true} />
      {label}
    </button>
  );
}

function BreachRoomList({ onOpenRoom }: { onOpenRoom: () => void }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        <div className="mb-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.36em] text-primary">
            Breach Rooms
          </p>
          <h1 className="text-5xl font-semibold tracking-[-0.08em] sm:text-6xl">
            Choose your audit room.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">
            Practice real security review loops: clone a scoped repo, audit it
            with tooling, submit evidence, and wait for manual judging.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.035] p-1">
            <button
              type="button"
              className="min-h-10 rounded-xl bg-white text-sm font-semibold text-black px-4"
            >
              Live Rooms
            </button>
            <button
              type="button"
              className="min-h-10 rounded-xl px-4 text-sm font-semibold text-muted"
            >
              Reviewed Rooms
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-zinc-300"
            >
              <CircleDot className="h-4 w-4" aria-hidden={true} />
              Status 1/1
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-zinc-300"
            >
              <Search className="h-4 w-4" aria-hidden={true} />
              Filter
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenRoom}
          className="group grid w-full gap-5 rounded-[24px] border border-white/10 bg-[#090d13]/90 p-6 text-left shadow-[0_32px_90px_-60px_rgba(0,0,0,0.9)] transition-[transform,border-color,background-color] hover:-translate-y-1 hover:border-primary/35 hover:bg-[#0b1118] active:scale-[0.96] md:grid-cols-[auto_minmax(0,1fr)_11rem]"
        >
          <RoomMark />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">
                {BREACH_ROOM.title}: {BREACH_ROOM.subtitle}
              </h2>
              <StatusPill tone="green">Live</StatusPill>
            </div>
            <p className="mt-1 text-sm font-semibold text-muted">
              First SolBreach audit room
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
              {BREACH_ROOM.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusPill tone="green">{BREACH_ROOM.difficulty}</StatusPill>
              {BREACH_ROOM.tags.map((tag) => (
                <StatusPill key={tag} tone="zinc">
                  {tag}
                </StatusPill>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-5 md:items-end">
            <div className="text-left md:text-right">
              <p className="text-2xl font-semibold text-foreground">
                {BREACH_ROOM.xp}
                <span className="ml-1 text-base text-muted">XP</span>
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-zinc-500">
                Flat reward
              </p>
            </div>

            <span className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-300 transition-colors group-hover:text-primary">
              View room
              <ArrowRight className="h-4 w-4" aria-hidden={true} />
            </span>
          </div>
        </button>
      </div>

      <aside className="h-fit rounded-[24px] border border-white/10 bg-[#090b0d]/85 p-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Auditor profile</h2>
          <Trophy className="h-5 w-5 text-primary" aria-hidden={true} />
        </div>
        <div className="space-y-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted">Rank</span>
            <span className="font-semibold text-foreground">Unranked</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">Total earned</span>
            <span className="font-semibold text-foreground">0 XP</span>
          </div>
          <div className="border-t border-white/10 pt-4">
            {[
              ["High", "0", "red"],
              ["Medium", "0", "amber"],
              ["Low", "0", "green"],
            ].map(([label, value, tone]) => (
              <div
                key={label}
                className="mb-3 flex items-center justify-between last:mb-0"
              >
                <StatusPill tone={tone as "amber" | "green" | "red"}>
                  {label}
                </StatusPill>
                <span className="font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between gap-4 border-t border-white/10 pt-4">
            <span className="text-muted">Valid submissions</span>
            <span className="font-semibold text-foreground">0</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

function SeverityField({
  name,
  onChange,
  value,
}: {
  name: "impact" | "likelihood";
  onChange: (value: ReportDraft["impact"]) => void;
  value: ReportDraft["impact"];
}) {
  const severityOptions = [
    {
      label: "High" as const,
      className:
        "has-[:checked]:border-red-400/50 has-[:checked]:bg-red-400/[0.16] has-[:checked]:text-red-100",
    },
    {
      label: "Medium" as const,
      className:
        "has-[:checked]:border-amber-300/50 has-[:checked]:bg-amber-300/[0.16] has-[:checked]:text-amber-100",
    },
    {
      label: "Low" as const,
      className:
        "has-[:checked]:border-emerald-300/50 has-[:checked]:bg-emerald-300/[0.14] has-[:checked]:text-emerald-100",
    },
  ];

  return (
    <div className="flex flex-nowrap gap-2">
      {severityOptions.map((option) => (
        <label
          key={option.label}
          className={`flex min-h-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-[#0a0c0e] px-3 text-xs font-semibold text-zinc-300 transition-colors ${option.className}`}
        >
          <input
            type="radio"
            name={name}
            value={option.label}
            checked={value === option.label}
            onChange={() => onChange(option.label)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

function ContestDetails({
  onStartReporting,
}: {
  onStartReporting: () => void;
}) {
  return (
    <article className="space-y-10">
      <div className="max-w-5xl space-y-8 text-sm leading-7 text-zinc-300">
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">
            About the Project
          </h2>
          <p>
            RustFund is a decentralized crowdfunding platform built on the
            Solana blockchain. It enables creators to launch fundraising
            campaigns and contributors to support projects they believe in, all
            in a trustless and transparent manner.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Features</h3>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong className="text-zinc-100">
                Create Fundraising Campaigns:
              </strong>{" "}
              Creators can launch campaigns with custom names, descriptions, and
              funding goals.
            </li>
            <li>
              <strong className="text-zinc-100">Contribute to Projects:</strong>{" "}
              Users can contribute SOL to any active campaign.
            </li>
            <li>
              <strong className="text-zinc-100">Refund Mechanism:</strong>{" "}
              Contributors can get refunds if deadlines are reached and goals
              aren&apos;t met.
            </li>
            <li>
              <strong className="text-zinc-100">Secure Withdrawals:</strong>{" "}
              Creators can withdraw funds once their campaign succeeds.
            </li>
          </ul>
        </section>

        <section className="space-y-5">
          <h3 className="text-xl font-semibold text-foreground">Actors</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-semibold text-foreground">Creator</h4>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>Creates new fundraising campaigns.</li>
                <li>Sets campaign deadline.</li>
                <li>Withdraws raised funds after successful campaigns.</li>
                <li>Has exclusive rights to manage their campaign settings.</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Contributor</h4>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>Contributes SOL to campaigns.</li>
                <li>
                  Can request refunds if the campaign fails to meet the goal and
                  the deadline is reached.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      <section className="space-y-5">
        <h2 className="text-3xl font-semibold tracking-[-0.05em] text-foreground">
          Submissions
        </h2>

        <div className="rounded-[24px] border border-white/10 bg-[#0b111a]/70 p-5 shadow-[0_24px_80px_-60px_rgba(0,0,0,0.95)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">
                My Submissions
              </h3>
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-white/15 bg-white/[0.035] px-2 text-sm font-semibold text-zinc-300">
                0
              </span>
            </div>

            <button
              type="button"
              aria-label="Download submissions"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-foreground active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Download className="h-4.5 w-4.5" aria-hidden={true} />
            </button>
          </div>

          <button
            type="button"
            onClick={onStartReporting}
            className="mt-6 flex min-h-[11rem] w-full items-center justify-center rounded-2xl border border-white/15 bg-[#090d13]/70 px-5 text-center transition-[border-color,background-color,transform] duration-200 ease-in-out hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/[0.035] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span>
              <span className="block text-base font-semibold text-foreground">
                You have no submissions.
              </span>
              <span className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-zinc-300">
                Click here to submit your first vulnerability
                <ArrowRight className="h-4 w-4" aria-hidden={true} />
              </span>
            </span>
          </button>
        </div>
      </section>
    </article>
  );
}

function FindingReportForm({
  canSubmit,
  onFieldsChange,
  onSubmit,
  reportFields,
  reviewState,
}: {
  canSubmit: boolean;
  onFieldsChange: (fields: ReportFields) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  reportFields: ReportFields;
  reviewState: ReviewState;
}) {
  const updateFields = (patch: Partial<ReportFields>) => {
    onFieldsChange({ ...reportFields, ...patch });
  };

  return (
    <div className="-m-5 sm:-m-7">
      <form
        id="breach-room-report-form"
        onSubmit={onSubmit}
        className="bg-[#121619]/85 px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:px-7 sm:py-7"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-foreground">
                Title
              </span>
              <input
                name="title"
                placeholder="One-line vulnerability title"
                maxLength={250}
                value={reportFields.title}
                onChange={(event) =>
                  updateFields({ title: event.target.value })
                }
                className="min-h-12 w-full rounded-xl border border-white/10 bg-[#0a0c0e] px-4 text-sm text-foreground outline-none transition-colors placeholder:text-zinc-600 focus:border-primary/55"
                required
              />
            </label>
            <div className="flex justify-end">
              <span className="text-xs text-muted">
                {reportFields.title.length}/250
              </span>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          <div className="grid gap-5 lg:grid-cols-[14rem_14rem_minmax(14rem,0.8fr)]">
            <div>
              <fieldset className="space-y-2.5">
                <legend className="text-sm font-semibold text-foreground">
                  Impact
                </legend>
                <SeverityField
                  name="impact"
                  value={reportFields.impact}
                  onChange={(impact) => updateFields({ impact })}
                />
              </fieldset>
            </div>

            <div>
              <fieldset className="space-y-2.5">
                <legend className="text-sm font-semibold text-foreground">
                  Likelihood
                </legend>
                <SeverityField
                  name="likelihood"
                  value={reportFields.likelihood}
                  onChange={(likelihood) => updateFields({ likelihood })}
                />
              </fieldset>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">
                Scope
              </span>
              <select
                name="scope"
                value={reportFields.scope}
                onChange={(event) =>
                  updateFields({
                    scope: event.target.value,
                  })
                }
                className="min-h-12 w-full rounded-xl border border-white/10 bg-[#0a0c0e] px-4 text-sm text-foreground outline-none transition-colors focus:border-primary/55"
              >
                <option value="">Select affected file from scope</option>
                {SCOPE_FILES.map((file) => (
                  <option key={file} value={file}>
                    {file}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">
              Description
            </span>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0c0e]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.035] px-4 py-3">
                <span className="text-xs font-semibold text-muted">
                  Report body
                </span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                    <Image
                      src="/rust-logo.png"
                      alt=""
                      width={3000}
                      height={2000}
                      className="h-4 w-5 object-contain brightness-0 invert"
                      aria-hidden={true}
                    />
                    Rust
                  </span>
                </div>
              </div>
              <textarea
                name="reportMarkdown"
                value={reportFields.reportMarkdown}
                onChange={(event) =>
                  updateFields({ reportMarkdown: event.target.value })
                }
                className="min-h-[34rem] w-full resize-y bg-transparent px-4 py-4 font-mono text-sm leading-7 text-zinc-200 outline-none placeholder:text-zinc-600"
                required
              />
            </div>
          </label>

          <div className="flex justify-end border-t border-white/10 pt-5">
            <button
              type="submit"
              disabled={!canSubmit || reviewState === "judged"}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_18px_52px_-24px_rgba(153,69,255,0.8)] transition-transform hover:-translate-y-0.5 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {reviewState === "judged"
                ? "Finding submitted"
                : "Submit Finding"}
              <Send className="h-4 w-4" aria-hidden={true} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function KnownIssuesPanel({ reviewState }: { reviewState: ReviewState }) {
  if (reviewState === "judged") {
    return <ReviewResultsPanel />;
  }

  return (
    <div className="flex items-center gap-3 text-sm font-semibold text-zinc-200">
      <CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden={true} />
      No known issues
    </div>
  );
}

function ScopePanel() {
  return (
    <section>
      <h3 className="text-2xl font-semibold tracking-[-0.04em]">Scope</h3>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
        Clone the room repository locally, inspect only the scoped files, and
        use code references in your submitted finding package.
      </p>

      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/45">
        {SCOPE_FILES.map((file, index) => (
          <div
            key={file}
            className={`grid grid-cols-[3rem_minmax(0,1fr)] items-center ${
              index > 0 ? "border-t border-white/10" : ""
            }`}
          >
            <span className="border-r border-white/10 py-4 text-center text-xs text-zinc-500">
              {index + 1}
            </span>
            <code className="truncate px-4 py-4 text-sm text-zinc-300">
              {file}
            </code>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReviewResultsPanel() {
  const found = REVIEW_FINDINGS.matched.length;
  const total = REVIEW_FINDINGS.matched.length + REVIEW_FINDINGS.missed.length;
  const percent = Math.round((found / total) * 100);

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-white/10 bg-black/35 p-5">
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
            <div className="absolute inset-2 rounded-full border-4 border-white/10" />
            <div className="text-center">
              <p className="text-xl font-semibold text-foreground">
                {percent}%
              </p>
              <p className="text-[10px] font-semibold uppercase text-zinc-500">
                found
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-semibold tracking-[-0.04em]">
              You identified {found} of {total} vulnerabilities.
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
              Manual review matched one finding from your package. Missed items
              are shown so you can improve the next audit pass.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-emerald-400/20 bg-emerald-400/[0.045] p-5">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2
            className="h-5 w-5 text-emerald-300"
            aria-hidden={true}
          />
          <h3 className="font-semibold text-foreground">Your submissions</h3>
          <StatusPill tone="green">{found}</StatusPill>
        </div>
        {REVIEW_FINDINGS.matched.map((finding) => (
          <article key={finding.title} className="rounded-2xl bg-black/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold text-foreground">
                  {finding.title}
                </h4>
                <p className="mt-1 text-sm text-muted">{finding.reference}</p>
              </div>
              <StatusPill tone="red">{finding.severity}</StatusPill>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[24px] border border-yellow-400/20 bg-yellow-400/[0.035] p-5">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle
            className="h-5 w-5 text-yellow-300"
            aria-hidden={true}
          />
          <h3 className="font-semibold text-foreground">
            Missed vulnerabilities
          </h3>
          <StatusPill tone="amber">{REVIEW_FINDINGS.missed.length}</StatusPill>
        </div>
        <div className="space-y-3">
          {REVIEW_FINDINGS.missed.map((finding) => (
            <article
              key={finding.title}
              className="rounded-2xl border border-white/10 bg-black/35 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h4 className="font-semibold text-foreground">
                  {finding.title}
                </h4>
                <StatusPill
                  tone={finding.severity === "Medium" ? "amber" : "green"}
                >
                  {finding.severity}
                </StatusPill>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReviewPipeline({ reviewState }: { reviewState: ReviewState }) {
  const steps = [
    {
      title: "Live",
      description: "The room is open for submissions.",
      complete: true,
    },
    {
      title: "Submission PR",
      description: "Finding package is sent to the Breach Room repo.",
      complete: reviewState === "judged",
    },
    {
      title: "Manual judging",
      description: "The SolBreach team reviews matched and missed issues.",
      complete: reviewState === "judged",
    },
    {
      title: "Results",
      description: "Review feedback becomes visible on the room page.",
      complete: reviewState === "judged",
    },
  ];

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#090b0d]/80 p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Review pipeline</h2>
        <GitPullRequestArrow
          className="h-5 w-5 text-primary"
          aria-hidden={true}
        />
      </div>

      <div className="space-y-5">
        {steps.map((step) => (
          <div
            key={step.title}
            className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3"
          >
            <span
              className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                step.complete
                  ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                  : "border-white/15 bg-white/[0.04] text-zinc-500"
              }`}
            >
              {step.complete ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden={true} />
              ) : (
                <Clock3 className="h-3.5 w-3.5" aria-hidden={true} />
              )}
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {step.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RewardsBreakdown() {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#090b0d]/80 p-5 shadow-[0_24px_72px_-56px_rgba(0,0,0,0.9)]">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Rewards breakdown</h2>
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted">nSLOC</span>
          <span className="font-semibold text-foreground">
            {BREACH_ROOM.nsloc}
          </span>
        </div>
        <div className="space-y-3 border-t border-white/10 pt-3">
          <div className="flex justify-between gap-4">
            <StatusPill tone="red">High</StatusPill>
            <span className="font-semibold text-foreground">100 XP</span>
          </div>
          <div className="flex justify-between gap-4">
            <StatusPill tone="amber">Medium</StatusPill>
            <span className="font-semibold text-foreground">20 XP</span>
          </div>
          <div className="flex justify-between gap-4">
            <StatusPill tone="green">Low</StatusPill>
            <span className="font-semibold text-foreground">2 XP</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoomHeaderCard({
  canSubmit,
  reportingStarted,
  reviewState,
  onStartReporting,
}: {
  canSubmit: boolean;
  onStartReporting: () => void;
  reportingStarted: boolean;
  reviewState: ReviewState;
}) {
  return (
    <section className="mb-7 rounded-[24px] border border-white/10 bg-[#090d13]/90 p-5 shadow-[0_32px_90px_-60px_rgba(0,0,0,0.9)] sm:p-6">
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-1 gap-5">
          <RoomMark />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
                {BREACH_ROOM.subtitle}
              </h1>
              <LiveStatusPill />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill tone="green">{BREACH_ROOM.difficulty}</StatusPill>
              {BREACH_ROOM.tags.map((tag) => (
                <StatusPill key={tag} tone="zinc">
                  {tag}
                </StatusPill>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-end justify-between gap-5">
        <p className="max-w-3xl text-sm leading-7 text-zinc-300">
          {BREACH_ROOM.description}
        </p>

        <div className="flex shrink-0 flex-wrap justify-end gap-3">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-5 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/[0.08] hover:text-foreground active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            View repo
            <ExternalLink className="h-4 w-4" aria-hidden={true} />
          </button>
          <button
            type={reportingStarted ? "submit" : "button"}
            form={reportingStarted ? "breach-room-report-form" : undefined}
            disabled={
              reportingStarted && (!canSubmit || reviewState === "judged")
            }
            onClick={reportingStarted ? undefined : onStartReporting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_18px_52px_-24px_rgba(153,69,255,0.8)] transition-transform hover:-translate-y-0.5 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {reportingStarted ? "Submit Finding" : "Start Reporting"}
            <Send className="h-4 w-4" aria-hidden={true} />
          </button>
        </div>
      </div>
    </section>
  );
}

function RoomWorkspace({
  activeTab,
  onBack,
  onSubmit,
  onTabChange,
  reviewState,
}: {
  activeTab: RoomTab;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTabChange: (tab: RoomTab) => void;
  reviewState: ReviewState;
}) {
  const [reportingStarted, setReportingStarted] = useState(false);
  const [stageTransitioning, setStageTransitioning] = useState(false);
  const [reportFields, setReportFields] = useState<ReportFields>(
    INITIAL_REPORT_FIELDS
  );

  const canSubmit =
    reportingStarted &&
    reportFields.title.trim().length > 0 &&
    reportFields.scope.trim().length > 0 &&
    reportFields.reportMarkdown.trim().length > 0;

  const handleStartReporting = useCallback(() => {
    if (reportingStarted || stageTransitioning) {
      return;
    }

    setStageTransitioning(true);
    window.setTimeout(() => {
      setReportingStarted(true);
      onTabChange("details");
      window.setTimeout(() => setStageTransitioning(false), 20);
    }, 180);
  }, [onTabChange, reportingStarted, stageTransitioning]);

  const activeTabContent = useMemo(() => {
    if (reportingStarted) {
      return (
        <FindingReportForm
          canSubmit={canSubmit}
          onFieldsChange={setReportFields}
          onSubmit={onSubmit}
          reportFields={reportFields}
          reviewState={reviewState}
        />
      );
    }

    if (activeTab === "details") {
      return <ContestDetails onStartReporting={handleStartReporting} />;
    }
    if (activeTab === "knownIssues") {
      return <KnownIssuesPanel reviewState={reviewState} />;
    }

    return <ScopePanel />;
  }, [
    activeTab,
    canSubmit,
    handleStartReporting,
    onSubmit,
    reportFields,
    reportingStarted,
    reviewState,
  ]);

  return (
    <>
      <div className="mb-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-foreground active:scale-[0.96]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden={true} />
          All Breach Rooms
        </button>
      </div>

      <RoomHeaderCard
        canSubmit={canSubmit}
        onStartReporting={handleStartReporting}
        reportingStarted={reportingStarted}
        reviewState={reviewState}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#090b0d]/[0.88] shadow-[0_32px_90px_-60px_rgba(0,0,0,0.9)]">
          <div
            className={`transition-[opacity,transform,filter] duration-200 ease-in-out ${
              stageTransitioning
                ? "translate-y-1 opacity-0 blur-[2px]"
                : "translate-y-0 opacity-100 blur-0"
            }`}
          >
            {reportingStarted ? (
              <div className="flex min-h-[65px] items-center border-b border-white/10 px-5">
                <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                  Finding Submission
                </h2>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 border-b border-white/10 p-3">
                {ROOM_TABS.map((tab) => (
                  <TabButton
                    key={tab.id}
                    active={activeTab === tab.id}
                    icon={tab.icon}
                    label={tab.label}
                    onClick={() => onTabChange(tab.id)}
                  />
                ))}
              </div>
            )}

            <div className="p-5 sm:p-7">{activeTabContent}</div>
          </div>
        </div>

        <aside className="space-y-4">
          <RewardsBreakdown />
          <ReviewPipeline reviewState={reviewState} />
        </aside>
      </div>
    </>
  );
}

export function BreachRoomsSection() {
  const [view, setView] = useState<RoomView>("list");
  const [activeTab, setActiveTab] = useState<RoomTab>("details");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [reviewState, setReviewState] = useState<ReviewState>("notSubmitted");
  const [, setDraft] = useState<ReportDraft>(INITIAL_REPORT_DRAFT);

  const handleOpenRoom = () => {
    setView("room");
    setActiveTab("details");
    setTutorialOpen(true);
  };

  const handleStartTutorial = () => {
    setTutorialOpen(false);
  };

  const handleBack = () => {
    setView("list");
    setTutorialOpen(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setDraft({
      category: "Breach Room Finding",
      impact: (formData.get("impact")?.toString() ||
        "Medium") as ReportDraft["impact"],
      likelihood: (formData.get("likelihood")?.toString() ||
        "Medium") as ReportDraft["likelihood"],
      mitigation: "",
      proof: formData.get("reportMarkdown")?.toString() || "",
      reportMarkdown: formData.get("reportMarkdown")?.toString() || "",
      rootImpact: formData.get("reportMarkdown")?.toString() || "",
      scope: formData.get("scope")?.toString() || "",
      title: formData.get("title")?.toString() || "",
    });
    setReviewState("judged");
    setActiveTab("knownIssues");

    toast.success("Finding package sent for judging.", {
      description:
        "Frontend mock: backend should create the review PR in the Breach Room repo.",
    });
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#050708] text-foreground">
      {tutorialOpen ? <TutorialModal onStart={handleStartTutorial} /> : null}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(153,69,255,0.16),transparent_35%),radial-gradient(circle_at_82%_16%,rgba(20,241,149,0.12),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {view === "list" ? (
          <BreachRoomList onOpenRoom={handleOpenRoom} />
        ) : (
          <RoomWorkspace
            activeTab={activeTab}
            onBack={handleBack}
            onSubmit={handleSubmit}
            onTabChange={setActiveTab}
            reviewState={reviewState}
          />
        )}
      </div>
    </section>
  );
}
