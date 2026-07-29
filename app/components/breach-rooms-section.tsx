"use client";

import Image from "next/image";
import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Code2,
  FileText,
  Play,
  Send,
  ShieldCheck,
  Terminal,
  Video,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

type RoomTab = "details" | "setup" | "scope" | "report";

type ReportDraft = {
  impact: "High" | "Medium" | "Low";
  likelihood: "High" | "Medium" | "Low";
  mitigation: string;
  proof: string;
  rootImpact: string;
  scope: string;
  title: string;
};

const ROOM_TABS: Array<{
  icon: LucideIcon;
  id: RoomTab;
  label: string;
}> = [
  { id: "details", label: "Room Details", icon: ClipboardList },
  { id: "setup", label: "Tooling Setup", icon: Terminal },
  { id: "scope", label: "Scope", icon: Code2 },
  { id: "report", label: "Report Template", icon: FileText },
];

const ROOM_FLOW = [
  "Watch the setup briefing",
  "Map protocol scope",
  "Run agent-assisted review",
  "Execute manual fuzz checks",
  "Submit a finding report",
];

const AGENT_SETUP = [
  {
    title: "Load the Solana Auditing Skill",
    description:
      "Use it to map accounts, PDA seeds, CPI targets, signer assumptions, and missing validation boundaries.",
  },
  {
    title: "Ask for an audit plan first",
    description:
      "Start with a pass over trust boundaries before asking for exploit ideas or report text.",
  },
  {
    title: "Keep evidence manual",
    description:
      "Use the agent to guide coverage, then confirm behavior with tests, logs, state deltas, and code references.",
  },
];

const MANUAL_TOOLS = [
  "Anchor tests for deterministic happy-path and failure-path checks",
  "LiteSVM or Mollusk style local execution for account and instruction replay",
  "Trident-style fuzzing for account permutations, signer misuse, and boundary values",
  "Manual transaction review for accounts, authorities, and state mutations",
];

const REPORT_TEMPLATE = `# Finding Title

## Summary
Describe the vulnerable behavior in one or two sentences.

## Root Cause
Explain the missing validation, broken invariant, or incorrect trust assumption.

## Impact
Describe the concrete value movement, state corruption, or access control failure.

## Proof of Concept
List the exact steps, accounts, inputs, and observed state changes.

## Recommended Mitigation
Describe the validation or control that prevents this vulnerability class.

## Evidence
- Source reference:
- Transaction or test evidence:
- Account/state delta:
`;

const INITIAL_REPORT_DRAFT: ReportDraft = {
  impact: "Medium",
  likelihood: "Medium",
  mitigation: "",
  proof: "",
  rootImpact: "",
  scope: "",
  title: "",
};

function StatusPill({
  children,
  tone = "green",
}: {
  children: string;
  tone?: "green" | "purple" | "zinc";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
      : tone === "purple"
        ? "border-primary/30 bg-primary/15 text-primary"
        : "border-white/10 bg-white/[0.04] text-zinc-300";

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold ${toneClass}`}
    >
      {children}
    </span>
  );
}

function TutorialModal({
  onStart,
}: {
  onStart: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-md">
      <section
        aria-label="Breach Room tutorial"
        className="relative grid max-h-[calc(100vh-3rem)] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-white/[0.12] bg-[#07090b] shadow-[0_34px_110px_-42px_rgba(153,69,255,0.55)] md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
      >
        <div className="border-b border-white/10 p-6 md:border-b-0 md:border-r md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <Image
              src="/logo_crop.png"
              alt="SolBreach"
              width={1480}
              height={304}
              className="h-10 w-auto"
              priority
            />
            <StatusPill tone="purple">Breach Room 0</StatusPill>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/60">
            <div className="flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(153,69,255,0.22),transparent_38%),linear-gradient(135deg,rgba(20,241,149,0.11),rgba(153,69,255,0.09),rgba(0,0,0,0.78))]">
              <div className="flex flex-col items-center gap-4 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-black/50 text-primary">
                  <Play className="h-7 w-7 fill-current" aria-hidden={true} />
                </span>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    Tutorial video placeholder
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Add the walkthrough video here when the room content is final.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary">
              Before You Begin
            </p>
            <h2 className="max-w-xl text-4xl font-semibold tracking-[-0.07em] text-foreground sm:text-5xl">
              Prepare your audit workspace.
            </h2>
            <p className="max-w-xl text-base leading-7 text-muted">
              Breach Room 0 teaches the review loop before a real room starts:
              set up your agent, run manual checks, collect evidence, and write
              a concise finding report.
            </p>
          </div>

          <div className="mt-7 space-y-4">
            {AGENT_SETUP.map((item, index) => (
              <div
                key={item.title}
                className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-4"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
              Agent prompt starter
            </p>
            <pre className="whitespace-pre-wrap rounded-xl bg-black/55 p-4 text-xs leading-6 text-zinc-300">
{`Load the Solana Auditing Skill.
Map the accounts, authorities, CPI targets, PDA seeds, and signer assumptions.
Suggest fuzz cases, but separate hypotheses from verified evidence.`}
            </pre>
          </div>

          <button
            type="button"
            onClick={onStart}
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_18px_52px_-22px_rgba(153,69,255,0.75)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Start Breach Room 0
            <ArrowRight className="h-4 w-4" aria-hidden={true} />
          </button>
        </div>
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

function RoomDetails() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-2xl font-semibold tracking-[-0.04em]">
          About the room
        </h3>
        <p className="max-w-3xl text-sm leading-7 text-muted">
          BR0 is a tutorial room. The objective is not to solve a hidden exploit
          yet. It walks you through how a SolBreach audit room is structured,
          how to combine agentic review with manual verification, and how to
          turn evidence into a finding report.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            title: "Understand scope",
            body: "Start from protocol purpose, actors, assets, and files in scope.",
          },
          {
            icon: Wrench,
            title: "Test assumptions",
            body: "Use manual and fuzz checks to confirm behavior instead of relying on guesses.",
          },
          {
            icon: FileText,
            title: "Write the finding",
            body: "Connect root cause, impact, proof, and mitigation in a report format.",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/12 text-primary">
                <Icon className="h-5 w-5" aria-hidden={true} />
              </span>
              <h4 className="font-semibold text-foreground">{item.title}</h4>
              <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ToolingSetup() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <section className="space-y-5">
        <h3 className="text-2xl font-semibold tracking-[-0.04em]">
          Agent-assisted review
        </h3>
        <div className="space-y-3">
          {AGENT_SETUP.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <p className="font-semibold text-foreground">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <h3 className="text-2xl font-semibold tracking-[-0.04em]">
          Manual fuzzing checklist
        </h3>
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.045] p-5">
          <div className="space-y-4">
            {MANUAL_TOOLS.map((tool) => (
              <div key={tool} className="flex gap-3">
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300"
                  aria-hidden={true}
                />
                <p className="text-sm leading-6 text-zinc-300">{tool}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ScopePanel() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section>
        <h3 className="text-2xl font-semibold tracking-[-0.04em]">Scope</h3>
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/45">
          {[
            "programs/breach_room_0/src/lib.rs",
            "tests/breach_room_0.ts",
            "Anchor.toml",
          ].map((file, index) => (
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

      <aside className="h-fit rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
          Out of scope
        </p>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
          <li>No production funds.</li>
          <li>No live network targets.</li>
          <li>No social engineering.</li>
          <li>No dependency disclosure outside the room.</li>
        </ul>
      </aside>
    </div>
  );
}

function ReportTemplatePanel({
  draft,
  onDraftChange,
  onSubmit,
}: {
  draft: ReportDraft;
  onDraftChange: (draft: ReportDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="space-y-7" onSubmit={onSubmit}>
      <div>
        <h3 className="text-2xl font-semibold tracking-[-0.04em]">
          Finding report template
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
          Use this structure to turn the investigation into a concise report.
          The prototype stores the report locally until the backend room flow is
          connected.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/45 p-4">
        <pre className="whitespace-pre-wrap text-xs leading-6 text-zinc-400">
          {REPORT_TEMPLATE}
        </pre>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-foreground">Title</span>
          <input
            value={draft.title}
            onChange={(event) =>
              onDraftChange({ ...draft, title: event.target.value })
            }
            placeholder="One-line finding title"
            className="min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-foreground outline-none transition-colors placeholder:text-zinc-600 focus:border-primary/55"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-foreground">Impact</span>
          <select
            value={draft.impact}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                impact: event.target.value as ReportDraft["impact"],
              })
            }
            className="min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-foreground outline-none transition-colors focus:border-primary/55"
          >
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-foreground">
            Likelihood
          </span>
          <select
            value={draft.likelihood}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                likelihood: event.target.value as ReportDraft["likelihood"],
              })
            }
            className="min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-foreground outline-none transition-colors focus:border-primary/55"
          >
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-foreground">Scope</span>
          <input
            value={draft.scope}
            onChange={(event) =>
              onDraftChange({ ...draft, scope: event.target.value })
            }
            placeholder="Affected file, instruction, or account path"
            className="min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-foreground outline-none transition-colors placeholder:text-zinc-600 focus:border-primary/55"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-foreground">
            Root cause and impact
          </span>
          <textarea
            value={draft.rootImpact}
            onChange={(event) =>
              onDraftChange({ ...draft, rootImpact: event.target.value })
            }
            placeholder="Explain the normal behavior, the broken assumption, and why it matters."
            className="min-h-28 w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-zinc-600 focus:border-primary/55"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-foreground">
            Proof of concept
          </span>
          <textarea
            value={draft.proof}
            onChange={(event) =>
              onDraftChange({ ...draft, proof: event.target.value })
            }
            placeholder="List the steps, inputs, and observed account or state changes."
            className="min-h-28 w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-zinc-600 focus:border-primary/55"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-foreground">
            Recommended mitigation
          </span>
          <textarea
            value={draft.mitigation}
            onChange={(event) =>
              onDraftChange({ ...draft, mitigation: event.target.value })
            }
            placeholder="Describe the validation, constraint, or invariant that prevents this class of issue."
            className="min-h-24 w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-zinc-600 focus:border-primary/55"
          />
        </label>
      </div>

      <div className="flex justify-end border-t border-white/10 pt-5">
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_18px_52px_-24px_rgba(153,69,255,0.8)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Submit Finding
          <Send className="h-4 w-4" aria-hidden={true} />
        </button>
      </div>
    </form>
  );
}

export function BreachRoomsSection() {
  const [activeTab, setActiveTab] = useState<RoomTab>("details");
  const [tutorialOpen, setTutorialOpen] = useState(true);
  const [tutorialComplete, setTutorialComplete] = useState(false);
  const [draft, setDraft] = useState<ReportDraft>(INITIAL_REPORT_DRAFT);
  const [submittedDraft, setSubmittedDraft] = useState<ReportDraft | null>(
    null
  );

  const activeTabContent = useMemo(() => {
    if (activeTab === "details") return <RoomDetails />;
    if (activeTab === "setup") return <ToolingSetup />;
    if (activeTab === "scope") return <ScopePanel />;

    return (
      <ReportTemplatePanel
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={(event) => {
          event.preventDefault();

          if (!draft.title.trim()) {
            toast.error("Add a finding title before submitting.");
            return;
          }

          setSubmittedDraft(draft);
          toast.success("Finding report staged.", {
            description: "Backend submission will be wired after BR0 hardening.",
          });
        }}
      />
    );
  }, [activeTab, draft]);

  const handleStartTutorial = () => {
    setTutorialComplete(true);
    setTutorialOpen(false);
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#050708] text-foreground">
      {tutorialOpen ? <TutorialModal onStart={handleStartTutorial} /> : null}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(153,69,255,0.16),transparent_35%),radial-gradient(circle_at_82%_16%,rgba(20,241,149,0.12),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill tone="purple">Breach Room 0</StatusPill>
              <StatusPill tone="green">Tutorial</StatusPill>
              <StatusPill tone="zinc">100 XP</StatusPill>
            </div>
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.36em] text-primary">
                First Room Prototype
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.08em] sm:text-6xl">
                Learn the audit room workflow.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">
                Set up agent-assisted review, run manual checks, and submit a
                structured finding report before entering less-guided rooms.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setTutorialOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/35 bg-primary/15 px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Video className="h-4 w-4" aria-hidden={true} />
                View Tutorial
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("report")}
                disabled={!tutorialComplete}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Open Report Template
                <ArrowRight className="h-4 w-4" aria-hidden={true} />
              </button>
            </div>
          </div>

          <aside className="h-fit rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-sm font-semibold text-foreground">
              Room progress
            </p>
            <div className="mt-5 space-y-4">
              {ROOM_FLOW.map((step, index) => {
                const done =
                  (index === 0 && tutorialComplete) ||
                  (index === 4 && Boolean(submittedDraft));

                return (
                  <div
                    key={step}
                    className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3"
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
                        done
                          ? "border-emerald-400/40 bg-emerald-400/[0.15] text-emerald-200"
                          : "border-white/[0.12] bg-white/[0.03] text-zinc-500"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2
                          className="h-3.5 w-3.5"
                          aria-hidden={true}
                        />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <p
                      className={`text-sm leading-6 ${
                        done ? "text-zinc-200" : "text-muted"
                      }`}
                    >
                      {step}
                    </p>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#090b0d]/[0.88] shadow-[0_32px_90px_-60px_rgba(0,0,0,0.9)]">
            <div className="flex flex-wrap gap-2 border-b border-white/10 p-3">
              {ROOM_TABS.map((tab) => (
                <TabButton
                  key={tab.id}
                  active={activeTab === tab.id}
                  icon={tab.icon}
                  label={tab.label}
                  onClick={() => setActiveTab(tab.id)}
                />
              ))}
            </div>

            <div
              className={`p-5 sm:p-7 ${
                tutorialComplete ? "" : "pointer-events-none opacity-50"
              }`}
            >
              {activeTabContent}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-[#090b0d]/80 p-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-semibold text-foreground">
                  Rewards breakdown
                </h2>
                <StatusPill tone="purple">Prototype</StatusPill>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted">Accepted tutorial report</span>
                  <span className="font-semibold text-foreground">100 XP</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted">Certificate</span>
                  <span className="font-semibold text-zinc-500">TBD</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted">Room state</span>
                  <span className="font-semibold text-emerald-200">
                    Training
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[#090b0d]/80 p-5">
              <h2 className="font-semibold text-foreground">Submissions</h2>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/[0.35] p-4">
                {submittedDraft ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">
                      {submittedDraft.title}
                    </p>
                    <p className="text-sm text-muted">
                      Impact {submittedDraft.impact} / Likelihood{" "}
                      {submittedDraft.likelihood}
                    </p>
                    <StatusPill tone="green">Draft staged</StatusPill>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <BookOpen
                      className="mx-auto h-8 w-8 text-zinc-600"
                      aria-hidden={true}
                    />
                    <p className="mt-3 text-sm font-semibold text-foreground">
                      No findings submitted.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("report")}
                      disabled={!tutorialComplete}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:text-zinc-600"
                    >
                      Submit your first report
                      <ArrowRight className="h-4 w-4" aria-hidden={true} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
