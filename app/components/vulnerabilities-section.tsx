"use client";

import Image from "next/image";
import {
  ArrowRight,
  Clock3,
  FileCode2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

import { LEVEL_GUIDES } from "../lib/levels/level-guides";
import type { LevelId } from "../lib/levels/course-status";

type VulnerabilityCard = {
  compact?: {
    cta: string;
    imageSrc?: string;
    levelLabel: string;
    metadata: string;
    summary: string;
    title: string;
  };
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
    compact: {
      cta: "Start warmup",
      imageSrc: "/vulnerabilities/00-wallet-connection.png",
      levelLabel: "LEVEL 0",
      metadata: "Warmup · 10-15 min · PDA basics",
      summary:
        "Get familiar with wallet-bound state, PDA flow, and how SolBreach levels work.",
      title: "Hello SolBreach",
    },
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
    compact: {
      cta: "Start level",
      imageSrc: "/vulnerabilities/01-account-substitution.png",
      levelLabel: "LEVEL 1",
      metadata: "Beginner · 15-20 min · Account validation",
      summary:
        "Learn how untrusted account inputs can alter protocol behavior.",
      title: "Account Substitution",
    },
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
    compact: {
      cta: "Start level",
      imageSrc: "/vulnerabilities/02-identity-thief.png",
      levelLabel: "LEVEL 2",
      metadata: "Intermediate · 30-45 min · Static PDA authority",
      summary:
        "Inspect static PDA seeds and understand how shared authority state can be overwritten.",
      title: "The Identity Thief",
    },
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
    compact: {
      cta: "Start level",
      imageSrc: "/vulnerabilities/03-trojan-horse.png",
      levelLabel: "LEVEL 3",
      metadata: "Intermediate · 35-50 min · Delegated CPI",
      summary:
        "Reason through arbitrary CPI targets, delegated signer abuse, and external program trust.",
      title: "The Trojan Horse",
    },
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
                className={
                  card.compact?.imageSrc
                    ? "group relative overflow-hidden rounded-[22px] border border-white/10 bg-[#08090d] p-7 text-left shadow-2xl shadow-black/30 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-[#0b0d12] focus:outline-none focus:ring-2 focus:ring-[#9945ff]/40"
                    : card.compact
                    ? "group self-start rounded-[18px] border border-white/10 bg-white/[0.04] p-6 text-left shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.055] focus:outline-none focus:ring-2 focus:ring-[#9945ff]/40"
                    : "group rounded-[22px] border border-white/10 bg-white/[0.045] p-6 text-left shadow-2xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-[#9945ff]/45 hover:bg-white/[0.065] focus:outline-none focus:ring-2 focus:ring-[#9945ff]/50"
                }
              >
                {card.compact ? (
                  <CompactVulnerabilityCardContent
                    compact={card.compact}
                  />
                ) : (
                  <>
                    <VulnerabilityCardContent card={card} />
                    <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5 text-sm">
                      <span className="text-zinc-500">Interactive level</span>
                      <span className="inline-flex items-center gap-2 font-medium text-[#b892ff] transition group-hover:text-white">
                        Open module
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </div>
                  </>
                )}
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

function AvailableBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-[#14f195]/25 bg-[#14f195]/8 font-medium text-[#8fffd0] shadow-[0_0_0_rgba(20,241,149,0)] motion-safe:animate-[availabilityPillBreath_2.8s_ease-in-out_infinite] ${className}`}
    >
      <span className="h-2 w-2 rounded-full bg-[#14f195] motion-safe:animate-[availabilityDotBlink_1.35s_ease-in-out_infinite]" />
      Available
    </span>
  );
}

function CompactVulnerabilityCardContent({
  compact,
}: {
  compact: NonNullable<VulnerabilityCard["compact"]>;
}) {
  if (compact.imageSrc) {
    return (
      <div className="relative min-h-[300px] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(8,9,13,0.99)_0%,rgba(8,9,13,0.92)_38%,rgba(8,9,13,0.44)_66%,rgba(8,9,13,0.14)_100%)]" />
        <Image
          src={compact.imageSrc}
          alt=""
          width={860}
          height={520}
          className="pointer-events-none absolute bottom-9 right-[-56px] z-0 w-[58%] max-w-[190px] object-contain opacity-25 transition duration-300 group-hover:scale-[1.02] sm:right-1 sm:bottom-12 sm:w-[152px] sm:opacity-90 xl:right-2 xl:w-[168px]"
        />

        <div className="relative z-10 flex min-h-[300px] flex-col">
          <div className="flex items-start justify-between gap-4">
            <span className="pt-1 text-sm font-semibold tracking-[0.16em] text-[#b892ff]">
              {compact.levelLabel}
            </span>
            <AvailableBadge className="px-3 py-1 text-sm" />
          </div>

          <div className="mt-16 max-w-[74%] sm:mt-16 sm:max-w-[49%]">
            <h2 className="text-2xl font-semibold leading-[1.04] tracking-[-0.06em] text-white">
              {compact.title}
            </h2>
            <p className="mt-5 text-sm leading-6 text-zinc-400">
              {compact.summary}
            </p>
            <p className="mt-5 text-xs font-semibold text-zinc-500">
              {compact.metadata}
            </p>
            <span className="mt-8 inline-flex items-center gap-3 text-xl font-semibold tracking-[-0.03em] text-[#b892ff] transition group-hover:text-white">
              {compact.cta}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[235px] flex-col">
      <div className="flex items-center justify-between gap-4">
        <span className="rounded-full border border-[#9945ff]/20 bg-[#9945ff]/5 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-[#b892ff]">
          {compact.levelLabel}
        </span>
        <AvailableBadge className="px-2.5 py-0.5 text-[10px]" />
      </div>

      <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white">
        {compact.title}
      </h2>
      <p className="mt-3 max-w-[90%] text-sm leading-6 text-zinc-400">
        {compact.summary}
      </p>

      <p className="mt-6 text-xs font-medium text-zinc-400">
        {compact.metadata}
      </p>

      <span className="mt-8 inline-flex w-fit items-center gap-2 rounded-full border border-[#9945ff]/20 bg-[#9945ff]/5 px-3 py-1.5 text-sm font-semibold text-[#c7a6ff] transition group-hover:border-[#9945ff]/40 group-hover:bg-[#9945ff]/10 group-hover:text-white">
        {compact.cta}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </div>
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
        {locked ? (
          <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-500">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
            Locked
          </span>
        ) : (
          <AvailableBadge className="px-3 py-1 text-xs" />
        )}
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
