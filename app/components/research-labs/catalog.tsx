"use client";

import { Spinner } from "@solana-commerce/connector";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { trackAnalyticsEvent } from "../../lib/analytics";
import type { ResearchLabManifest } from "../../lib/research-labs/lab-state";
import { useWallet } from "../../lib/wallet/context";
import { getResearchLabAdapter } from "./lab-adapters";

const CATALOG_LOCKED_LABS = [
  {
    id: "rl-011",
    code: "TBD",
    title: "Oracle Drift",
    difficulty: "Advanced",
    estimatedTime: "3-5 hours",
    xpReward: 350,
    summary:
      "Investigate stale price confidence and liquidation boundary assumptions.",
  },
  {
    id: "rl-014",
    code: "TBD",
    title: "Escrow Shadow",
    difficulty: "Intermediate",
    estimatedTime: "2-3 hours",
    xpReward: 275,
    summary:
      "Trace escrow authority constraints through a constrained CPI surface.",
  },
];

const CATALOG_COPY = {
  titleFallback: "Configured Research Lab",
  scenario:
    "A protocol has reported state transitions that should not satisfy its normal account requirements. Review the source, inspect account relationships, test an exploit hypothesis, and document the cause if you can prove impact.",
};

type CatalogCardStatus = "available" | "completed" | "locked";
type ResearchLabCertificateLevel = 1 | 2 | 3;

export function ResearchLabCatalog({
  catalogError,
  isAuthenticated,
  isLoading,
  labs,
  level1BadgeCollected,
  level2BadgeCollected,
  onGoToLevel1Module,
  onGoToLevel2Module,
  onLoadCatalog,
  onOpenLab,
  researchLabCertificateMintedByLevel,
  walletStatus,
}: {
  catalogError: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  labs: ResearchLabManifest[];
  level1BadgeCollected: boolean;
  level2BadgeCollected: boolean;
  onGoToLevel1Module: () => void;
  onGoToLevel2Module: () => void;
  onLoadCatalog: () => void;
  onOpenLab: (lab: ResearchLabManifest) => void;
  researchLabCertificateMintedByLevel: Partial<
    Record<ResearchLabCertificateLevel, boolean>
  >;
  walletStatus: string;
}) {
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const isWalletConnected = walletStatus === "connected";
  const shouldGateLabs = !isAuthenticated;

  const handleCatalogAction = () => {
    if (!isWalletConnected) {
      setWalletModalOpen(true);
      return;
    }

    onLoadCatalog();
  };

  return (
    <section className="relative min-h-[calc(100vh-88px)] overflow-hidden border-t border-white/10 bg-[#070808] px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(153,69,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(20,241,149,0.045)_1px,transparent_1px)] bg-[size:48px_48px] opacity-35" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_26%_20%,rgba(153,69,255,0.14),transparent_32%),radial-gradient(circle_at_72%_30%,rgba(20,241,149,0.1),transparent_35%)]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-semibold tracking-[-0.04em] text-white md:text-6xl">
            Supported protocol investigations.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
            Inspect a focused Solana protocol scenario, prove impact inside an
            isolated sandbox, and submit a structured finding report.
          </p>
        </div>

        {catalogError ? (
          <div className="mt-8 max-w-2xl rounded-2xl border border-red-400/20 bg-red-500/8 p-4 text-sm text-red-200">
            {catalogError}
          </div>
        ) : null}

        <div className="relative mt-8">
          <div
            className={`grid gap-x-10 gap-y-12 transition duration-300 lg:grid-cols-3 ${
              shouldGateLabs
                ? "pointer-events-none select-none blur-sm opacity-45"
                : ""
            }`}
            aria-hidden={shouldGateLabs}
          >
            {labs.map((lab) => {
              const adapter = getResearchLabAdapter(lab);
              const prerequisiteBadgeCollected =
                adapter.prerequisiteBadgeLevel === 2
                  ? level2BadgeCollected
                  : level1BadgeCollected;
              const labUnlocked = prerequisiteBadgeCollected;
              const labCompleted =
                lab.status === "completed" ||
                Boolean(
                  researchLabCertificateMintedByLevel[
                    adapter.certificate.level
                  ]
                );
              const catalogStatus: CatalogCardStatus = labCompleted
                ? "completed"
                : labUnlocked
                  ? "available"
                  : "locked";
              const goToPrerequisiteModule =
                adapter.prerequisiteBadgeLevel === 2
                  ? onGoToLevel2Module
                  : onGoToLevel1Module;

              return (
                <article
                  key={lab.id}
                  className={`group relative p-8 text-left transition duration-300 ${
                    catalogStatus === "locked"
                      ? "opacity-45 grayscale"
                      : "hover:-translate-y-0.5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span
                      className={`text-sm font-semibold tracking-[0.16em] ${
                        catalogStatus === "locked"
                          ? "text-red-200/45"
                          : catalogStatus === "completed"
                            ? "text-[#d7c0ff]"
                            : "text-[#b892ff]"
                      }`}
                    >
                      {displayLabCode(lab)}
                    </span>
                    <StatusBadge
                      className="px-3 py-1 text-sm"
                      status={catalogStatus}
                    />
                  </div>
                  <h2
                    className={`mt-10 text-2xl font-semibold leading-[1.04] tracking-[-0.06em] ${
                      catalogStatus === "locked" ? "text-zinc-500" : "text-white"
                    }`}
                  >
                    {lab.title || CATALOG_COPY.titleFallback}
                  </h2>
                  <p
                    className={`mt-5 max-w-[90%] text-sm leading-6 ${
                      catalogStatus === "locked"
                        ? "text-zinc-600"
                        : "text-zinc-400"
                    }`}
                  >
                    {lab.summary || CATALOG_COPY.scenario}
                  </p>
                  <p
                    className={`mt-5 text-xs font-semibold ${
                      catalogStatus === "locked"
                        ? "text-zinc-600"
                        : "text-zinc-500"
                    }`}
                  >
                    {formatLabMetadata(lab)}
                  </p>
                  {catalogStatus === "locked" ? (
                    <p className="mt-5 text-xs font-medium text-red-200/65">
                      Requires Level {adapter.prerequisiteBadgeLevel} badge
                    </p>
                  ) : null}
                  <div className="mt-8 text-sm">
                    {catalogStatus === "available" ||
                    catalogStatus === "completed" ? (
                      <button
                        type="button"
                        onClick={() => onOpenLab(lab)}
                        disabled={isLoading || !isAuthenticated}
                        className="inline-flex items-center gap-3 text-xl font-semibold tracking-[-0.03em] text-[#b892ff] transition hover:text-white focus:outline-none focus:ring-2 focus:ring-[#9945ff]/50 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {isAuthenticated
                          ? catalogStatus === "completed"
                            ? "Review lab"
                            : "Open lab"
                          : "Auth required"}
                        <ArrowRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={goToPrerequisiteModule}
                        className="inline-flex items-center gap-3 text-xl font-semibold tracking-[-0.03em] text-red-200/75 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-red-300/40"
                      >
                        Go to Module
                        <ArrowRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}

            {CATALOG_LOCKED_LABS.map((lab) => (
              <div
                key={lab.id}
                className="group relative p-8 text-left opacity-35 grayscale"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold tracking-[0.16em] text-red-200/45">
                    {lab.code}
                  </span>
                  <StatusBadge className="px-3 py-1 text-sm" status="locked" />
                </div>
                <h2 className="mt-10 text-2xl font-semibold leading-[1.04] tracking-[-0.06em] text-zinc-500">
                  {lab.title}
                </h2>
                <p className="mt-5 max-w-[90%] text-sm leading-6 text-zinc-600">
                  {lab.summary}
                </p>
                <p className="mt-5 text-xs font-semibold text-zinc-600">
                  {lab.difficulty} · {lab.estimatedTime} · {lab.xpReward} XP
                </p>
                <div className="mt-8 text-sm text-red-200/45">
                  Unlocks through certificate badges
                </div>
              </div>
            ))}
          </div>

          {shouldGateLabs ? (
            <div className="absolute inset-0 z-10 flex min-h-80 items-center justify-center rounded-[28px] border border-white/10 bg-black/45 p-6 backdrop-blur-sm">
              <div className="max-w-md rounded-[24px] border border-[#9945ff]/25 bg-[#101014]/95 p-6 text-center shadow-2xl shadow-black/50">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#9945ff]/30 bg-[#9945ff]/12 text-[#c7a6ff]">
                  <LockKeyhole className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white">
                  Unlock Research Labs.
                </h2>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  Labs unlock from wallet-bound badges and sandbox access is
                  tied to the connected wallet.
                </p>
                <button
                  type="button"
                  onClick={handleCatalogAction}
                  disabled={isLoading}
                  className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#9945ff] px-5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101014] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Resolving access..." : "Unlock labs"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <ResearchLabWalletConnectorDialog
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />
    </section>
  );
}

function displayLabCode(lab: ResearchLabManifest) {
  return getResearchLabAdapter(lab).code;
}

function formatLabMetadata(lab: ResearchLabManifest) {
  return [lab.difficulty, lab.estimatedTime, `${lab.xpReward} XP`]
    .filter(Boolean)
    .join(" · ");
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
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/8 font-medium text-red-200/75 ${className}`}
      >
        <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
        Locked
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-[#14f195]/25 bg-[#14f195]/8 font-medium text-[#8fffd0] shadow-[0_0_0_rgba(20,241,149,0)] motion-safe:animate-[availabilityPillBreath_2.8s_ease-in-out_infinite] ${className}`}
    >
      <span className="h-2 w-2 rounded-full bg-[#14f195] motion-safe:animate-[availabilityDotBlink_1.35s_ease-in-out_infinite]" />
      Available
    </span>
  );
}

function ResearchLabWalletConnectorDialog({
  onClose,
  open,
}: {
  onClose: () => void;
  open: boolean;
}) {
  const { connectors, connect, error, status } = useWallet();

  useEffect(() => {
    if (open && status === "connected") {
      onClose();
    }
  }, [onClose, open, status]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="research-lab-wallet-title"
    >
      <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#101014] p-5 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b892ff]">
              Wallet Connector
            </p>
            <h2
              id="research-lab-wallet-title"
              className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white"
            >
              Choose a wallet
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Research Labs use your wallet badges to resolve unlocked labs and
              bind sandbox sessions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-zinc-500 transition hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101014]"
            aria-label="Close wallet connector"
          >
            ×
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {connectors.length ? (
            connectors.map((connector) => (
              <button
                key={connector.id}
                type="button"
                onClick={() => {
                  trackAnalyticsEvent({
                    eventName: "wallet_connect_started",
                    properties: {
                      connectorId: connector.id,
                      surface: "research_labs_modal",
                    },
                  });
                  void connect(connector.id);
                }}
                disabled={status === "connecting"}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-left text-sm font-medium text-zinc-200 transition hover:border-[#9945ff]/35 hover:bg-[#9945ff]/10 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101014] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex min-w-0 items-center gap-3">
                  {connector.icon ? (
                    <span
                      className="h-7 w-7 shrink-0 rounded-full bg-white/10 bg-cover bg-center"
                      style={{ backgroundImage: `url(${connector.icon})` }}
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs text-zinc-500">
                      {connector.name.slice(0, 1)}
                    </span>
                  )}
                  <span className="truncate">{connector.name}</span>
                </span>
                {status === "connecting" ? (
                  <Spinner size={16} color="#14f195" />
                ) : (
                  <span className="text-xs text-zinc-500">Connect</span>
                )}
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-zinc-400">
              No supported Solana wallet was detected. Install Phantom,
              Solflare, Backpack, or another Wallet Standard compatible wallet.
            </div>
          )}
        </div>

        {error != null ? (
          <p className="mt-4 rounded-xl border border-red-400/20 bg-red-500/8 p-3 text-xs leading-5 text-red-200">
            {error instanceof Error ? error.message : String(error)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
