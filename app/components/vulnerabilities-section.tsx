"use client";

import {
  ArrowRight,
  Clock3,
  FileCode2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import { LEVEL_GUIDES } from "../lib/levels/level-guides";
import type { LevelId } from "../lib/levels/course-status";

type VulnerabilityCard = {
  difficulty: string;
  id: string;
  status: "available" | "locked";
  target?: LevelId;
  title: string;
  summary: string;
  time: string;
  theme: string;
};

const VULNERABILITY_CARDS: VulnerabilityCard[] = [
  {
    id: "level-0",
    target: "level0",
    title: LEVEL_GUIDES.level0.missionTitle,
    summary:
      "Warm up with wallet-bound PDA state, temporary account lifecycle, and completion closeout.",
    difficulty: "Warmup",
    time: "10-15 min",
    theme: "PDA lifecycle",
    status: "available",
  },
  {
    id: "level-1",
    target: "level1",
    title: LEVEL_GUIDES.level1.missionTitle,
    summary:
      "Map account substitution, missing mint validation, and forged internal ledger credit.",
    difficulty: "Beginner",
    time: "25-35 min",
    theme: "Account substitution",
    status: "available",
  },
  {
    id: "level-2",
    target: "level2",
    title: LEVEL_GUIDES.level2.missionTitle,
    summary:
      "Inspect static PDA seeds and understand how shared authority state can be overwritten.",
    difficulty: "Intermediate",
    time: "30-45 min",
    theme: "Static PDA authority",
    status: "available",
  },
  {
    id: "level-3",
    target: "level3",
    title: LEVEL_GUIDES.level3.missionTitle,
    summary:
      "Reason through arbitrary CPI targets, delegated signer abuse, and external program trust.",
    difficulty: "Intermediate",
    time: "35-50 min",
    theme: "Delegated CPI",
    status: "available",
  },
  {
    id: "supply-chain",
    title: "Supply Chain Intrusion",
    summary:
      "Future modules will cover dependency takeover, CI secrets, and build integrity failures.",
    difficulty: "Advanced",
    time: "Coming soon",
    theme: "Build trust",
    status: "locked",
  },
  {
    id: "wallet-side",
    title: "Wallet Intent Attacks",
    summary:
      "Future modules will cover transaction spoofing, approval drains, and unsafe prompt design.",
    difficulty: "Advanced",
    time: "Coming soon",
    theme: "Client trust",
    status: "locked",
  },
];

export function VulnerabilitiesSection({
  onSelectLevel,
}: {
  onSelectLevel: (level: LevelId) => void;
}) {
  return (
    <section className="relative min-h-[calc(100vh-88px)] overflow-hidden border-t border-white/10 bg-[#070808] px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(153,69,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(20,241,149,0.045)_1px,transparent_1px)] bg-[size:48px_48px] opacity-35" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_24%_18%,rgba(153,69,255,0.14),transparent_32%),radial-gradient(circle_at_74%_30%,rgba(20,241,149,0.1),transparent_35%)]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-semibold tracking-[-0.04em] text-white md:text-6xl">
            Vulnerability modules.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
            Learn Solana security through focused protocol scenarios that move
            from lifecycle basics into exploit causality.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {VULNERABILITY_CARDS.map((card) =>
            card.status === "available" && card.target ? (
              <button
                key={card.id}
                type="button"
                onClick={() => onSelectLevel(card.target!)}
                className="group rounded-[22px] border border-white/10 bg-white/[0.045] p-6 text-left shadow-2xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-[#9945ff]/45 hover:bg-white/[0.065] focus:outline-none focus:ring-2 focus:ring-[#9945ff]/50"
              >
                <VulnerabilityCardContent card={card} />
                <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5 text-sm">
                  <span className="text-zinc-500">Interactive level</span>
                  <span className="inline-flex items-center gap-2 font-medium text-[#b892ff] transition group-hover:text-white">
                    Open module
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
              </button>
            ) : (
              <div
                key={card.id}
                className="rounded-[22px] border border-white/10 bg-white/[0.025] p-6 opacity-70"
              >
                <VulnerabilityCardContent card={card} locked />
                <div className="mt-7 border-t border-white/10 pt-5 text-sm text-zinc-600">
                  Unlocks in future curriculum tracks
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}

function VulnerabilityCardContent({
  card,
  locked = false,
}: {
  card: VulnerabilityCard;
  locked?: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            locked
              ? "border-white/10 bg-white/[0.04] text-zinc-500"
              : "border-[#9945ff]/30 bg-[#9945ff]/10 text-[#b892ff]"
          }`}
        >
          {card.id.toUpperCase()}
        </span>
        <span
          className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
            locked
              ? "border-white/10 bg-white/[0.04] text-zinc-500"
              : "border-[#14f195]/20 bg-[#14f195]/10 text-[#8fffd0]"
          }`}
        >
          {locked ? (
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {locked ? "Locked" : "Available"}
        </span>
      </div>
      <h2
        className={`mt-5 text-2xl font-semibold tracking-[-0.03em] ${
          locked ? "text-zinc-300" : "text-white"
        }`}
      >
        {card.title}
      </h2>
      <p
        className={`mt-3 min-h-20 text-sm leading-6 ${
          locked ? "text-zinc-500" : "text-zinc-400"
        }`}
      >
        {card.summary}
      </p>
      <div
        className={`mt-6 grid grid-cols-2 gap-3 text-xs ${
          locked ? "text-zinc-500" : "text-zinc-400"
        }`}
      >
        <Metric icon={<ShieldCheck />} label={card.difficulty} />
        <Metric icon={<Clock3 />} label={card.time} />
      </div>
      <div
        className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
          locked
            ? "border-white/10 bg-white/[0.025] text-zinc-500"
            : "border-white/10 bg-white/[0.035] text-zinc-400"
        }`}
      >
        <span className="inline-flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-[#b892ff]" aria-hidden="true" />
          {card.theme}
        </span>
      </div>
    </>
  );
}

function Metric({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
      <span className="text-[#b892ff] [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <span>{label}</span>
    </div>
  );
}
