"use client";

import { ArrowLeft, Check, MoreHorizontal, RefreshCcw } from "lucide-react";
import { useState } from "react";

import type { ResearchLabManifest } from "../../lib/research-labs/lab-state";
import type { LabPhase, SandboxStatus } from "./types";

const LAB_SHELL_COPY = {
  labCode: "RL1",
  titleFallback: "Configured Research Lab",
  scenario:
    "A borrow market appears to trust caller-supplied account relationships more than its approved custody configuration. Review the source, inspect the account path, test an exploit hypothesis, and document the cause if you can prove impact.",
};

export function ResearchLabSessionHeader({
  lab,
  phase,
  sandboxStatus,
  onBack,
  onReset,
  onLeave,
}: {
  lab: ResearchLabManifest;
  phase: LabPhase;
  sandboxStatus: SandboxStatus;
  onBack: () => void;
  onReset: () => void;
  onLeave: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm text-zinc-400 transition hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070808]"
        >
          <ArrowLeft className="h-4 w-4" />
          Labs
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <p className="truncate text-sm font-semibold text-white">
              {displayLabCode(lab)}:{" "}
              {lab.title || LAB_SHELL_COPY.titleFallback}
            </p>
            <PhaseBadge phase={phase} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SandboxStatusPill status={sandboxStatus} />
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-zinc-400 transition hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070808]"
            aria-label="Session options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-12 z-20 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#101112] p-1 shadow-2xl shadow-black/50">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onReset();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/[0.06]"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset session
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onLeave();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-zinc-400 hover:bg-white/[0.06]"
              >
                Leave lab
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function displayLabCode(lab: ResearchLabManifest) {
  if (lab.slug === "account-substitution") return "RL1";
  return (lab.id || LAB_SHELL_COPY.labCode).toUpperCase();
}

export function LabScenarioBriefing({
  lab,
  phase,
}: {
  lab: ResearchLabManifest;
  phase: LabPhase;
}) {
  return (
    <section className="border-b border-white/10 py-5">
      <div className="grid items-end gap-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#b892ff]">
            Scenario Briefing
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white 2xl:text-3xl">
            Investigate the protocol behavior.
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            {lab.summary || LAB_SHELL_COPY.scenario}
          </p>
        </div>
        {/* <InvestigationStepper phase={phase} /> */}
      </div>
    </section>
  );
}

function InvestigationStepper({ phase }: { phase: LabPhase }) {
  const steps: Array<{ id: LabPhase; label: string }> = [
    { id: "INSPECT", label: "Inspect" },
    { id: "EXECUTE_EXPLOIT", label: "Execute Exploit" },
    { id: "VERIFY_IMPACT", label: "Evidence Review" },
    { id: "SUBMIT_FINDING", label: "Report Finding" },
  ];
  const currentIndex =
    phase === "COMPLETED"
      ? steps.length
      : steps.findIndex((step) => step.id === phase);

  return (
    <div className="flex justify-start overflow-x-auto lg:justify-end">
      <div className="flex min-w-max items-center gap-x-6">
        {steps.map((step, index) => {
          const isComplete = phase === "COMPLETED" || index < currentIndex;
          const isActive = index === currentIndex;
          return (
            <div key={step.id} className="flex shrink-0 items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
                  isComplete
                    ? "border-[#14f195]/35 bg-[#14f195]/18 text-[#8fffd0]"
                    : isActive
                      ? "border-[#9945ff]/70 bg-[#9945ff]/12 text-[#c7a6ff]"
                      : "border-white/10 bg-white/[0.035] text-zinc-600"
                }`}
              >
                {isComplete ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={`min-w-0 truncate text-sm ${
                  isActive
                    ? "text-[#c7a6ff]"
                    : isComplete
                      ? "text-zinc-300"
                      : "text-zinc-600"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhaseBadge({ phase }: { phase: LabPhase }) {
  return (
    <span className="rounded-full border border-[#9945ff]/30 bg-[#9945ff]/10 px-3 py-1 text-xs font-semibold text-[#c7a6ff]">
      Phase: {phaseLabel(phase)}
    </span>
  );
}

function SandboxStatusPill({ status }: { status: SandboxStatus }) {
  const live = status === "READY" || status === "RUNNING";
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-medium ${
        live ? "text-[#8fffd0]" : "text-zinc-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          live ? "bg-[#14f195]" : "bg-zinc-500"
        }`}
      />
      Sandbox {formatShellValue(status.toLowerCase())}
    </span>
  );
}

function phaseLabel(phase: LabPhase) {
  switch (phase) {
    case "INSPECT":
      return "Inspect";
    case "EXECUTE_EXPLOIT":
      return "Execute exploit";
    case "VERIFY_IMPACT":
      return "Evidence review";
    case "SUBMIT_FINDING":
      return "Report finding";
    case "COMPLETED":
      return "Completed";
  }
}

function formatShellValue(value: string) {
  if (!value) return "Unavailable";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
