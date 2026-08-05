"use client";

import Image from "next/image";
import {
  ArrowRight,
  Clock3,
  FileCode2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useEffect, type CSSProperties, type ReactNode } from "react";

import { LEVEL_GUIDES } from "../lib/levels/level-guides";
import type { LevelId } from "../lib/levels/course-status";
import { trackAnalyticsEvent } from "../lib/analytics";

const GRID_DIVIDER_ONE = "calc((100% - 5rem) / 3 + 1.25rem)";
const GRID_DIVIDER_TWO = "calc(2 * (100% - 5rem) / 3 + 3.75rem)";
const GRID_ROW_DIVIDER = "calc(50% - 15px)";

type VulnerabilityCard = {
  compact?: {
    className?: string;
    cta?: string;
    ctaClassName?: string;
    imageClassName?: string;
    imageSrc?: string;
    levelLabel: string;
    metadata?: string;
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

type CatalogCardStatus = "available" | "completed" | "locked";

const VULNERABILITY_CARDS: VulnerabilityCard[] = [
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
      imageClassName:
        "!right-[-20px] !bottom-12 !w-[48%] !max-w-[150px] sm:!right-4 sm:!bottom-16 sm:!w-[132px] xl:!right-5 xl:!bottom-[4.25rem] xl:!w-[142px]",
      imageSrc: "/vulnerabilities/01-account-substitution.png",
      levelLabel: "LEVEL 1",
      metadata: "Beginner · 15-20 min · Account validation",
      summary:
        "Learn how untrusted\naccount inputs\ncan alter protocol\nbehavior and break it.",
      title: "The Illusionist",
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
      imageClassName:
        "sm:!right-[-10px] xl:!right-[-16px]",
      imageSrc: "/vulnerabilities/03-trojan-horse.png",
      levelLabel: "LEVEL 3",
      metadata: "Intermediate · 35-50 min · Delegated CPI",
      summary:
        "Reason through arbitrary CPI targets, delegated signer abuse, and external program trust.",
      title: "The Trojan Horse",
    },
  },
  {
    id: "level-4",
    target: "level4",
    title: LEVEL_GUIDES.level4.missionTitle,
    summary:
      "Inspect mismatched stored data across market, position, vault, and collateral accounts.",
    difficulty: "Advanced",
    time: "45-60 min",
    theme: "Data matching",
    status: "available",
    compact: {
      cta: "Start level",
      levelLabel: "LEVEL 4",
      metadata: "Advanced · 45-60 min · Data matching",
      summary:
        "Find valid-looking accounts whose stored relationships do not match.",
      title: "The Mirror Trap",
    },
  },
  {
    id: "level-5",
    target: "level5",
    title: LEVEL_GUIDES.level5.missionTitle,
    summary:
      "Map address reuse caused by unsafe PDA lifecycle and stale receipt recreation.",
    difficulty: "Advanced",
    time: "45-60 min",
    theme: "Address reuse",
    status: "available",
    compact: {
      cta: "Start level",
      levelLabel: "LEVEL 5",
      metadata: "Advanced · 45-60 min · Address reuse",
      summary:
        "Track how a PDA address can reappear and become trusted again.",
      title: "The Time Traveler",
    },
  },
  {
    id: "future-module-1",
    title: "To Be Delivered",
    summary: "Future modules to be added",
    difficulty: "Advanced",
    time: "Coming soon",
    theme: "Future track",
    status: "locked",
    compact: {
      imageSrc: "/vulnerabilities/11-to-be-delivered.png",
      levelLabel: "TBD",
      summary: "Future modules to be added",
      title: "To Be Delivered",
    },
  },
  {
    id: "future-module-2",
    title: "To Be Delivered",
    summary: "Future modules to be added",
    difficulty: "Advanced",
    time: "Coming soon",
    theme: "Future track",
    status: "locked",
    compact: {
      imageSrc: "/vulnerabilities/11-to-be-delivered.png",
      levelLabel: "TBD",
      summary: "Future modules to be added",
      title: "To Be Delivered",
    },
  },
];

export function VulnerabilitiesSection({
  completedLevels = {},
  onSelectLevel,
}: {
  completedLevels?: Partial<Record<LevelId, boolean>>;
  onSelectLevel: (level: LevelId) => void;
}) {
  useEffect(() => {
    trackAnalyticsEvent({ eventName: "vulnerability_catalog_viewed" });
  }, []);

  return (
    <section className="relative min-h-[calc(100vh-88px)] overflow-hidden border-t border-white/10 bg-[#050708] px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] opacity-35" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(153,69,255,0.16),transparent_28%),radial-gradient(circle_at_82%_10%,rgba(20,241,149,0.12),transparent_34%),linear-gradient(180deg,rgba(5,7,8,0)_0%,rgba(5,7,8,0.58)_58%,#050708_100%)]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-semibold tracking-[-0.04em] text-white md:text-6xl">
            Vulnerability modules.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
            Learn Solana security through focused protocol scenarios that move
            from account data relationships into exploit causality.
          </p>
        </div>

        <div className="relative mt-10 grid gap-x-10 gap-y-14 border-y border-white/[0.13] pb-10 pt-5 lg:grid-cols-3">
          <span
            className="pointer-events-none absolute inset-x-0 hidden h-px -translate-y-1/2 bg-white/[0.13] lg:block"
            style={{ top: GRID_ROW_DIVIDER }}
          />
          <span
            className="pointer-events-none absolute inset-y-0 hidden w-px -translate-x-1/2 bg-white/[0.13] lg:block"
            style={{ left: GRID_DIVIDER_ONE }}
          />
          <span
            className="pointer-events-none absolute inset-y-0 hidden w-px -translate-x-1/2 bg-white/[0.13] lg:block"
            style={{ left: GRID_DIVIDER_TWO }}
          />
          <GridCross className="left-0 top-0 -translate-x-1/2 -translate-y-1/2" />
          <GridCross
            className="top-0 -translate-x-1/2 -translate-y-1/2"
            style={{ left: GRID_DIVIDER_ONE }}
          />
          <GridCross
            className="top-0 -translate-x-1/2 -translate-y-1/2"
            style={{ left: GRID_DIVIDER_TWO }}
          />
          <GridCross className="right-0 top-0 translate-x-1/2 -translate-y-1/2" />
          <GridCross
            className="left-0 -translate-x-1/2 -translate-y-1/2"
            style={{ top: GRID_ROW_DIVIDER }}
          />
          <GridCross
            className="-translate-x-1/2 -translate-y-1/2"
            style={{ left: GRID_DIVIDER_ONE, top: GRID_ROW_DIVIDER }}
          />
          <GridCross
            className="-translate-x-1/2 -translate-y-1/2"
            style={{ left: GRID_DIVIDER_TWO, top: GRID_ROW_DIVIDER }}
          />
          <GridCross
            className="right-0 translate-x-1/2 -translate-y-1/2"
            style={{ top: GRID_ROW_DIVIDER }}
          />
          <GridCross className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <GridCross
            className="bottom-0 -translate-x-1/2 translate-y-1/2"
            style={{ left: GRID_DIVIDER_ONE }}
          />
          <GridCross
            className="bottom-0 -translate-x-1/2 translate-y-1/2"
            style={{ left: GRID_DIVIDER_TWO }}
          />
          <GridCross className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
          {VULNERABILITY_CARDS.map((card) => {
            const cardStatus = getVulnerabilityCardStatus(
              card,
              completedLevels
            );
            const isLocked = cardStatus === "locked";

            return !isLocked && card.target ? (
              <button
                key={card.id}
                type="button"
                onClick={() => onSelectLevel(card.target!)}
                className={
                  card.compact?.imageSrc
                    ? "group relative p-8 text-left transition duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#9945ff]/40"
                    : card.compact
                    ? "group self-start rounded-[18px] border border-white/10 bg-white/[0.04] p-6 text-left shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.055] focus:outline-none focus:ring-2 focus:ring-[#9945ff]/40"
                    : "group rounded-[22px] border border-white/10 bg-white/[0.045] p-6 text-left shadow-2xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-[#9945ff]/45 hover:bg-white/[0.065] focus:outline-none focus:ring-2 focus:ring-[#9945ff]/50"
                }
              >
                {card.compact ? (
                  <CompactVulnerabilityCardContent
                    compact={card.compact}
                    status={cardStatus}
                  />
                ) : (
                  <>
                    <VulnerabilityCardContent
                      card={card}
                      status={cardStatus}
                    />
                    <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5 text-sm">
                      <span className="text-zinc-500">Interactive level</span>
                      <span
                        className={`inline-flex items-center gap-2 font-medium transition ${
                          cardStatus === "available"
                            ? "text-[#8fffd0] group-hover:text-[#14f195]"
                            : "text-[#b892ff] group-hover:text-white"
                        }`}
                      >
                        {cardStatus === "completed"
                          ? "Review module"
                          : "Open module"}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </div>
                  </>
                )}
              </button>
            ) : (
              <div
                key={card.id}
                className={
                  card.compact?.imageSrc
                    ? "group relative p-8 text-left opacity-35 grayscale"
                    : "rounded-[22px] border border-red-400/10 bg-red-500/[0.025] p-6 opacity-55 grayscale"
                }
              >
                {card.compact ? (
                  <CompactVulnerabilityCardContent
                    compact={card.compact}
                    status="locked"
                  />
                ) : (
                  <>
                    <VulnerabilityCardContent card={card} status="locked" />
                    <div className="mt-7 border-t border-red-400/10 pt-5 text-sm text-red-200/45">
                      Unlocks in future curriculum tracks
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function getVulnerabilityCardStatus(
  card: VulnerabilityCard,
  completedLevels: Partial<Record<LevelId, boolean>>
): CatalogCardStatus {
  if (card.status === "locked") return "locked";
  if (card.target && completedLevels[card.target]) return "completed";
  return "available";
}

function StatusBadge({
  className = "",
  status,
}: {
  className?: string;
  status: CatalogCardStatus;
}) {
  if (status === "completed") {
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full border border-[#9945ff]/35 bg-[#9945ff]/12 font-medium text-[#d7c0ff] shadow-[0_0_24px_rgba(153,69,255,0.12)] ${className}`}
      >
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        Completed
      </span>
    );
  }

  if (status === "locked") {
    return <LockedBadge className={className} />;
  }

  return <AvailableBadge className={className} />;
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

function LockedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/8 font-medium text-red-200/75 ${className}`}
    >
      <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
      Locked
    </span>
  );
}

function GridCross({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`pointer-events-none absolute hidden h-4 w-4 lg:block ${className}`}
      style={style}
      aria-hidden="true"
    >
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/35" />
      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/35" />
    </span>
  );
}

function CompactVulnerabilityCardContent({
  compact,
  status = "available",
}: {
  compact: NonNullable<VulnerabilityCard["compact"]>;
  status?: CatalogCardStatus;
}) {
  const locked = status === "locked";
  const completed = status === "completed";
  const ctaToneClass = locked
    ? "text-red-200/55 group-hover:text-red-200/75"
    : completed
      ? "text-[#b892ff] group-hover:text-white"
      : "text-[#8fffd0] group-hover:text-[#14f195]";
  const pillCtaClass = locked
    ? "border-red-400/15 bg-red-500/5 text-red-200/55 group-hover:border-red-300/25 group-hover:bg-red-500/10 group-hover:text-red-200/75"
    : completed
      ? "border-[#9945ff]/20 bg-[#9945ff]/5 text-[#c7a6ff] group-hover:border-[#9945ff]/40 group-hover:bg-[#9945ff]/10 group-hover:text-white"
      : "border-[#14f195]/20 bg-[#14f195]/5 text-[#8fffd0] group-hover:border-[#14f195]/35 group-hover:bg-[#14f195]/10 group-hover:text-[#14f195]";

  if (compact.imageSrc) {
    return (
      <div className={`relative min-h-[300px] ${compact.className ?? ""}`}>
        <Image
          src={compact.imageSrc}
          alt=""
          width={860}
          height={520}
          className={`pointer-events-none absolute bottom-9 right-[-56px] z-0 w-[58%] max-w-[190px] object-contain opacity-25 transition duration-300 group-hover:scale-[1.02] sm:right-1 sm:bottom-12 sm:w-[152px] sm:opacity-90 xl:right-2 xl:w-[168px] ${locked ? "opacity-45 sm:opacity-45" : ""} ${compact.imageClassName ?? ""}`}
          sizes="(min-width: 1280px) 168px, (min-width: 640px) 152px, 58vw"
          priority={!locked}
        />

        <div className="relative z-10 flex min-h-[300px] flex-col">
          <div className="flex items-center justify-between gap-4">
            <span
              className={`text-sm font-semibold tracking-[0.16em] ${
                locked
                  ? "text-red-200/45"
                  : completed
                    ? "text-[#d7c0ff]"
                    : "text-[#b892ff]"
              }`}
            >
              {compact.levelLabel}
            </span>
            <StatusBadge className="px-3 py-1 text-sm" status={status} />
          </div>

          <div className="mt-10 max-w-[74%] sm:mt-10 sm:max-w-[52%]">
            <h2
              className={`text-2xl font-semibold leading-[1.04] tracking-[-0.06em] ${
                locked ? "text-zinc-500" : "text-white"
              }`}
            >
              {compact.title}
            </h2>
            <p
              className={`mt-5 whitespace-pre-line text-sm leading-6 ${
                locked ? "text-zinc-600" : "text-zinc-400"
              }`}
            >
              {compact.summary}
            </p>
            {compact.metadata ? (
              <p className="mt-5 whitespace-pre-line text-xs font-semibold text-zinc-500">
                {compact.metadata}
              </p>
            ) : null}
            {compact.cta ? (
              <span
                className={`mt-8 inline-flex items-center gap-3 text-xl font-semibold tracking-[-0.03em] transition ${ctaToneClass} ${compact.ctaClassName ?? ""}`}
              >
                {completed ? "Review level" : compact.cta}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </span>
            ) : null}
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
        <StatusBadge className="px-2.5 py-0.5 text-[10px]" status={status} />
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

      <span
        className={`mt-8 inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${pillCtaClass}`}
      >
        {completed ? "Review level" : compact.cta}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </div>
  );
}

function VulnerabilityCardContent({
  card,
  status = "available",
}: {
  card: VulnerabilityCard;
  status?: CatalogCardStatus;
}) {
  const locked = status === "locked";
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
        <StatusBadge className="px-3 py-1 text-xs" status={status} />
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
