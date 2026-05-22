"use client";

import type { ReactNode } from "react";
import {
  Award,
  BarChart3,
  Check,
  Clock3,
  LockKeyhole,
} from "lucide-react";

const RESEARCH_LABS = [
  {
    title: "Vault Mirage",
    difficulty: "Intermediate",
    experienceTime: "2-4 hours",
    certificationAwarded: "Yes",
    description:
      "Oracle manipulation and vault health factor distortion leading to under-collateralized liquidations and potential treasury drain.",
    objectives: [
      "Analyze account logic",
      "Trace oracle price dependency",
      "Manipulate health factor",
      "Drain the protocol treasury",
    ],
  },
  {
    title: "Governance Takeover",
    difficulty: "Advanced",
    experienceTime: "3-5 hours",
    certificationAwarded: "Yes",
    description:
      "Social engineering and durable nonce abuse to gain governance authority and execute malicious proposals.",
    objectives: [
      "Analyze governance flow",
      "Abuse durable nonce",
      "Escalate governance authority",
      "Execute malicious proposal",
    ],
  },
  {
    title: "Lending Market Manipulation",
    difficulty: "Intermediate",
    experienceTime: "2-3 hours",
    certificationAwarded: "Yes",
    description:
      "Price manipulation and collateral validation flaw used to drain lending market liquidity.",
    objectives: [
      "Manipulate oracle price",
      "Review collateral validation",
      "Borrow against inflated value",
      "Drain lending pool",
    ],
  },
];

export function ResearchLabsSection() {
  return (
    <section className="space-y-8">
      <div className="max-w-3xl space-y-4">
        <h1 className="text-5xl font-semibold tracking-[-0.08em] sm:text-6xl">
          Research Labs
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
          Practice incident research as a structured security workflow: trace
          the failure mode, map the exploit path, and prepare for certification.
        </p>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-[28px] border border-border bg-card/70 shadow-[0_24px_90px_-70px_rgba(0,0,0,0.9)]">
        {RESEARCH_LABS.map((lab) => (
          <article
            key={lab.title}
            className="grid gap-0 lg:grid-cols-[0.92fr_0.9fr_1.18fr]"
          >
            <div className="flex min-h-[220px] flex-col justify-between gap-8 p-6">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-semibold tracking-[-0.05em]">
                  {lab.title}
                </h2>
                <span className="inline-flex min-h-8 shrink-0 items-center rounded-full border border-yellow-300/25 bg-yellow-400/10 px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-yellow-200 shadow-[0_0_28px_-12px_rgba(250,204,21,0.95)]">
                  TBD
                </span>
              </div>

              <div className="grid gap-4 text-xs text-muted sm:grid-cols-3">
                <LabMetric
                  icon={<BarChart3 className="h-4 w-4" aria-hidden="true" />}
                  label="Difficulty"
                  value={lab.difficulty}
                />
                <LabMetric
                  icon={<Clock3 className="h-4 w-4" aria-hidden="true" />}
                  label="Exp-Time"
                  value={lab.experienceTime}
                />
                <LabMetric
                  icon={<Award className="h-4 w-4" aria-hidden="true" />}
                  label="Certification Awarded"
                  value={lab.certificationAwarded}
                />
              </div>
            </div>

            <div className="border-t border-border p-6 lg:border-l lg:border-t-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted">
                Description
              </p>
              <p className="mt-5 max-w-prose text-sm leading-7 text-muted sm:text-base">
                {lab.description}
              </p>
            </div>

            <div className="border-t border-border p-6 lg:border-l lg:border-t-0">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted">
                  Objectives
                </p>
                <p className="text-xs font-medium text-muted">
                  0 / {lab.objectives.length} completed
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {lab.objectives.map((objective) => (
                  <div key={objective} className="flex items-center gap-3">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border bg-background/80 text-transparent"
                      aria-hidden="true"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="text-sm leading-6 text-foreground">
                      {objective}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-start lg:justify-end">
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-border bg-muted/20 px-4 text-sm font-medium text-muted/55 sm:w-auto sm:min-w-44"
                >
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  Start Researching
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function LabMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-muted" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] leading-4 text-muted">{label}</span>
        <span className="mt-0.5 block text-sm font-medium leading-5 text-foreground">
          {value}
        </span>
      </span>
    </div>
  );
}
