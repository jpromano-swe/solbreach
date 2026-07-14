"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Cpu,
  FileCode2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

const LANDING_RUST_CODE_KEYWORDS = new Set([
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

export function LandingPageSection({
  enableAppEntry,
  onPlayNow,
  documentationUrl,
}: {
  enableAppEntry: boolean;
  onPlayNow: () => void;
  documentationUrl: string;
}) {
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const heroSlides = [
    {
      code: `#[derive(Accounts)]
pub struct DepositTokens<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}`,
      highlightedLines: [6, 7],
      label: "Vulnerability Modules",
      panel: <HeroMissionStatusCard />,
      title: "levels/01-illusionist/lib.rs",
    },
    {
      code: `pub fn deposit_collateral(
    position: &mut Position,
    collateral: &TokenAccount,
    vault: &TokenAccount,
) -> Result<()> {
    position.credited_collateral = position
        .credited_collateral
        .saturating_add(collateral.amount);

    Ok(())
}`,
      highlightedLines: [6, 7, 8],
      label: "Research Labs",
      panel: <HeroResearchLabPanel />,
      title: "research-labs/rl1/account-substitution.rs",
    },
    {
      code: `# Account Substitution

Severity: Critical
Likelihood: High

Root cause:
The deposit path trusts caller-supplied collateral accounts.

Proof of impact:
Illegitimate credit enabled a treasury withdrawal.

Mitigation:
Bind collateral mint and vault accounts to protocol config.`,
      highlightedLines: [3, 4, 7, 10],
      label: "Audit Reports",
      panel: <HeroAuditReportPanel />,
      title: "research-labs/rl1/audit-report.md",
    },
  ];

  return (
    <section className="space-y-10">
      <div className="mx-auto max-w-4xl space-y-7 text-center">
        <h1 className="mx-auto max-w-4xl text-5xl font-semibold leading-[0.94] tracking-[-0.08em] sm:text-6xl lg:text-7xl">
          <span className="block text-[#14f195] drop-shadow-[0_0_28px_rgba(20,241,149,0.2)]">
            Security Training Layer
          </span>
          <span className="mt-2 block">for Solana builders</span>
        </h1>
        <p className="mx-auto max-w-4xl text-base leading-8 text-muted sm:text-lg">
          <span className="block">
            Practice finding real security issues, prove they matter,
          </span>
          <span className="block">
            and learn how to fix vulnerable Solana programs before shipping to
            production.
          </span>
        </p>

        {enableAppEntry ? (
          <button
            type="button"
            onClick={onPlayNow}
            className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-6 text-sm font-medium text-white shadow-[0_18px_50px_-24px_rgba(153,69,255,0.9)] transition-colors hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Request Beta Access
            <ArrowRight
              className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1"
              aria-hidden="true"
            />
          </button>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="inline-flex min-h-12 cursor-not-allowed items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-6 text-sm font-medium text-zinc-400 shadow-none opacity-90"
          >
            Beta Test Closed
          </button>
        )}
      </div>

      <HeroProductCarousel
        activeSlide={activeHeroSlide}
        onSelectSlide={setActiveHeroSlide}
        slides={heroSlides}
      />

      <div className="max-w-3xl text-left">
        <h2
          id="feature-showcase-title"
          className="text-4xl font-semibold tracking-[-0.06em] sm:text-5xl"
        >
          Inspect, exploit, verify, and report.
        </h2>
        <p className="mt-4 text-base leading-7 text-muted sm:text-lg">
          Build security judgment through guided Vulnerability Modules and
          applied Research Labs.
        </p>
      </div>

      <FeatureShowcaseSection />
      <LandingCtaSection
        enableAppEntry={enableAppEntry}
        onGetStarted={onPlayNow}
        documentationUrl={documentationUrl}
      />
    </section>
  );
}

function LandingCtaSection({
  enableAppEntry,
  onGetStarted,
  documentationUrl,
}: {
  enableAppEntry: boolean;
  onGetStarted: () => void;
  documentationUrl: string;
}) {
  return (
    <section className="grid items-center gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="flex min-h-[360px] items-center justify-center">
        <Image
          src="/solana_logo_nobg.png"
          alt="Solana logo"
          width={1254}
          height={1254}
          className="h-auto w-[min(76%,360px)] drop-shadow-[0_32px_80px_rgba(20,241,149,0.18)]"
          priority={false}
        />
      </div>

      <div className="max-w-xl lg:ml-auto">
        <h2 className="text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
          Practice the full Solana security workflow.
        </h2>
        <p className="mt-5 text-base leading-7 text-muted sm:text-lg">
          Connect your wallet, complete a guided Vulnerability Module, and
          investigate RL1 from source inspection to vulnerability impact and
          create a Finding Report.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {enableAppEntry ? (
            <button
              type="button"
              onClick={onGetStarted}
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-6 text-sm font-medium text-white shadow-[0_18px_50px_-24px_rgba(153,69,255,0.9)] transition-colors hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Request Beta Access
              <ArrowRight
                className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1"
                aria-hidden="true"
              />
            </button>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="inline-flex min-h-12 cursor-not-allowed items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-6 text-sm font-medium text-zinc-400 opacity-90"
            >
              Beta Test Closed
            </button>
          )}
          <a
            href={documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-card/80 px-6 text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Read Documentation
          </a>
        </div>
      </div>
    </section>
  );
}

function HeroProductCarousel({
  activeSlide,
  onSelectSlide,
  slides,
}: {
  activeSlide: number;
  onSelectSlide: (index: number) => void;
  slides: Array<{
    code: string;
    highlightedLines: number[];
    label: string;
    panel: ReactNode;
    title: string;
  }>;
}) {
  return (
    <section
      className="relative overflow-hidden bg-transparent"
      aria-label="SolBreach product preview"
    >
      <div className="relative min-h-[560px] overflow-hidden lg:min-h-[620px]">
        <div className="absolute inset-x-4 bottom-16 top-5 [mask-image:linear-gradient(to_bottom,black_0%,black_76%,transparent_100%)] sm:inset-x-7">
          {slides.map((slide, index) => (
            <div
              key={slide.label}
              className={`absolute inset-0 motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none ${
                activeSlide === index
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-3 opacity-0"
              }`}
              aria-hidden={activeSlide !== index}
            >
              <HeroComposedSlide
                code={slide.code}
                highlightedLines={slide.highlightedLines}
                panel={slide.panel}
                title={slide.title}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-5 z-10 flex justify-center">
        <div className="flex items-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.label}
              type="button"
              aria-label={`Show ${slide.label} preview`}
              aria-pressed={activeSlide === index}
              onClick={() => onSelectSlide(index)}
              className={`h-2.5 rounded-full motion-safe:transition-[width,background-color,opacity] motion-safe:duration-150 motion-safe:ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                activeSlide === index
                  ? "w-8 bg-[#14f195]"
                  : "w-2.5 bg-muted/45 hover:bg-muted/70"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroComposedSlide({
  code,
  highlightedLines,
  panel,
  title,
}: {
  code: string;
  highlightedLines: number[];
  panel: ReactNode;
  title: string;
}) {
  return (
    <div className="relative h-full min-h-[500px] pt-4 sm:pt-8">
      <HeroCodeWindow
        className="h-[430px] w-full lg:h-[500px]"
        code={code}
        highlightedLines={highlightedLines}
        title={title}
      />
      <div className="relative z-10 mx-auto -mt-24 w-[min(96%,500px)] sm:-mt-36 lg:absolute lg:right-0 lg:top-0 lg:mx-0 lg:mt-0 lg:w-[500px]">
        {panel}
      </div>
    </div>
  );
}

function HeroResearchLabPanel() {
  return (
    <div className="space-y-3">
      <div className="rounded-[24px] border border-border bg-card/95 p-5 shadow-[0_30px_90px_-48px_rgba(0,0,0,0.9)]">
        <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
              Research Labs
            </p>
            <h3 className="mt-3 text-xl font-semibold tracking-[-0.05em]">
              RL1: Account Substitution
            </h3>
          </div>
          <span className="w-fit rounded-full border border-[#9945ff]/30 bg-[#9945ff]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200">
            Intermediate
          </span>
        </div>

        <div className="mt-5 space-y-3 text-sm leading-6 text-muted">
          <p>
            Investigate whether non-canonical collateral accounts can create
            illegitimate credit and withdraw treasury value.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 lg:flex-nowrap">
          <HeroMetric label="Level" value="Intermediate" />
          <HeroMetric label="Time" value="45-75 min" />
          <HeroMetric label="Reward" value="250 XP" />
        </div>

        <div className="mt-5 rounded-[18px] border border-border bg-background/80 p-4">
          <p className="text-[11px] uppercase tracking-[0.26em] text-muted">
            Investigation checklist
          </p>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <ChecklistItem text="Approved mint and canonical vault binding" />
            <ChecklistItem text="Credit increase and treasury balance decrease" />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroAuditReportPanel() {
  return (
    <div className="space-y-3">
      <div className="rounded-[24px] border border-border bg-card/95 p-4 shadow-[0_30px_90px_-48px_rgba(0,0,0,0.9)]">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
          Audit Report
        </p>
        <div className="mt-4 space-y-3">
          <HeroReviewField compact label="Title" value="Account Substitution" />
          <div className="flex flex-wrap gap-2 lg:flex-nowrap">
            <HeroMetric label="Severity" value="Critical" tone="red" />
            <HeroMetric label="Likelihood" value="High" tone="amber" />
          </div>
          <HeroReviewField
            compact
            label="Root cause"
            value="The deposit path does not bind caller-supplied collateral accounts to the approved mint and vault."
          />
          <HeroReviewField
            compact
            label="Proof of impact"
            value="Illegitimate credit enabled withdrawal of treasury liquidity."
          />
          <HeroReviewField
            compact
            label="Mitigation"
            value="Validate the collateral mint and canonical vault before crediting a position."
          />

          <button
            type="button"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-5 text-sm font-medium text-white transition hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <FileCode2 className="h-4 w-4" aria-hidden="true" />
            Review Audit Report
          </button>
        </div>
      </div>
    </div>
  );
}

function HeroMissionStatusCard() {
  return (
    <div className="rounded-[24px] border border-border bg-card/95 p-5 shadow-[0_30px_90px_-48px_rgba(0,0,0,0.9)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
            Mission Status
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.05em]">
            Level 1
          </p>
        </div>
        <StatusChip>In progress</StatusChip>
      </div>

      <div className="mt-5 space-y-3">
        <HeroStatusRow label="Modules" value="4 playable modules" />
        <HeroStatusRow label="Progress" value="Wallet-bound progress" />
        <HeroStatusRow label="Result" value="Impact verified" />
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.22em] text-muted">
          <span>Completion</span>
          <span>100%</span>
        </div>
        <div className="h-2 rounded-full bg-accent">
          <div className="h-full w-full rounded-full bg-[linear-gradient(90deg,rgba(153,69,255,0.95),rgba(20,241,149,0.95))]" />
        </div>
        <p className="text-sm leading-6 text-muted">
          Complete the module flow to unlock its wallet-bound certificate.
        </p>
      </div>

      <button
        type="button"
        className="mt-6 min-h-12 w-full rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-5 text-sm font-medium text-white transition hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Claim certificate
      </button>
    </div>
  );
}

function HeroCodeWindow({
  className = "",
  code,
  highlightedLines,
  title,
}: {
  className?: string;
  code: string;
  highlightedLines?: number[];
  title: string;
}) {
  const highlightedLineSet = new Set(highlightedLines ?? []);
  const lines = code.split("\n");

  return (
    <div
      className={`overflow-hidden rounded-[24px] border border-border bg-card/92 shadow-[0_32px_90px_-58px_rgba(0,0,0,0.88)] ${className}`}
    >
      <div className="flex min-h-12 items-center gap-3 border-b border-border bg-accent/70 px-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full border border-border bg-background" />
          <span className="h-2.5 w-2.5 rounded-full border border-border bg-background" />
          <span className="h-2.5 w-2.5 rounded-full border border-border bg-background" />
        </div>
        <span className="min-w-0 truncate text-xs text-muted">{title}</span>
      </div>
      <pre className="overflow-x-auto px-4 py-4 font-mono text-[12px] leading-6 [mask-image:linear-gradient(to_right,black_0%,black_48%,transparent_68%)]">
        <code className="block min-w-max">
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            const isHighlighted = highlightedLineSet.has(lineNumber);

            return (
              <span
                key={`${title}-${lineNumber}-${line}`}
                className={`grid grid-cols-[2rem_minmax(0,1fr)] gap-4 rounded-md px-2 ${
                  isHighlighted
                    ? "border border-red-400/25 bg-red-500/10 text-red-100"
                    : "border border-transparent text-foreground"
                }`}
              >
                <span className="select-none text-right text-[11px] text-muted/55">
                  {lineNumber}
                </span>
                <span className="whitespace-pre">
                  {renderRustLine(line)}
                </span>
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}

function HeroMetric({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "amber" | "cyan" | "default" | "red";
  value: string;
}) {
  const toneClass =
    tone === "red"
      ? "border-red-400/20 bg-red-500/12 text-red-100"
      : tone === "amber"
        ? "border-amber-300/20 bg-amber-300/12 text-amber-100"
        : tone === "cyan"
          ? "border-cyan-300/20 bg-cyan-300/12 text-cyan-100"
          : "border-border bg-background/80 text-foreground";

  return (
    <div className="flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted">
      <span className="whitespace-nowrap">{label}</span>
      <span
        className={`whitespace-nowrap rounded-full border px-2.5 py-1.5 text-xs font-semibold normal-case tracking-normal ${toneClass}`}
      >
        {value}
      </span>
    </div>
  );
}

function HeroReviewField({
  compact = false,
  label,
  value,
}: {
  compact?: boolean;
  label: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.26em] text-muted">
        {label}
      </span>
      <span
        className={`block border border-border bg-background/80 text-foreground ${
          compact
            ? "mt-1.5 rounded-xl px-3 py-2 text-xs leading-5"
            : "mt-2 rounded-[16px] px-4 py-3 text-sm"
        }`}
      >
        {value}
      </span>
    </label>
  );
}

function HeroStatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <span className="text-[11px] uppercase tracking-[0.24em] text-muted">
        {label}
      </span>
      <span className="truncate text-right text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

function FeatureShowcaseSection() {
  return (
    <section
      className="relative overflow-hidden bg-background/80 shadow-[0_36px_120px_-90px_rgba(20,241,149,0.45),0_28px_100px_-90px_rgba(153,69,255,0.55)]"
      aria-labelledby="feature-showcase-title"
      style={{
        backgroundImage: [
          "radial-gradient(ellipse 42% 42% at 12% 12%, rgba(153,69,255,0.10), transparent 72%)",
          "radial-gradient(ellipse 42% 42% at 88% 18%, rgba(20,241,149,0.08), transparent 72%)",
        ].join(", "),
      }}
    >
      <div className="grid divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <FeaturePreview
          tint="purple"
          title="Vulnerability Modules"
          description="Learn one Solana exploit family at a time through guided, wallet-bound challenges."
        >
          <ExploitFoundationsPreview />
        </FeaturePreview>
        <FeaturePreview
          tint="green"
          title="Research Labs"
          description="Inspect protocol code, execute sandbox actions, verify impact, and build a finding report."
        >
          <SecurityResearchLabPreview />
        </FeaturePreview>
        <FeaturePreview
          tint="mixed"
          title="Breach Rooms"
          description="Less-guided mini-audit environments."
        >
          <BreachRoomsPreview />
        </FeaturePreview>
      </div>

      <div className="grid divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-6">
        <FeatureMiniItem
          icon={<Zap className="h-4 w-4" aria-hidden="true" />}
          tint="purple"
          title="Controlled Vulnerable Programs"
          body="Practice against intentionally vulnerable Solana programs in safe training environments."
        />
        <FeatureMiniItem
          icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          tint="green"
          title="Deterministic Verification"
          body="Progress unlocks only after correct completion checks."
        />
        <FeatureMiniItem
          icon={<FileCode2 className="h-4 w-4" aria-hidden="true" />}
          tint="purple"
          title="Account and State Evidence"
          body="Trace accounts, PDAs, authorities, and before-and-after protocol state."
        />
        <FeatureMiniItem
          icon={<LockKeyhole className="h-4 w-4" aria-hidden="true" />}
          tint="green"
          title="Solana Bug Patterns"
          body="Account substitution, PDA authority misuse, arbitrary CPI, and signer or authority failures."
        />
        <FeatureMiniItem
          icon={<Cpu className="h-4 w-4" aria-hidden="true" />}
          tint="purple"
          title="Audit-Style Reporting"
          body="Connect root cause, exploit path, evidence, impact, and mitigation."
        />
        <FeatureMiniItem
          icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
          tint="green"
          title="Wallet-Bound Certificates"
          body="Record validated module completion against the learner wallet."
        />
      </div>
    </section>
  );
}

function FeaturePreview({
  children,
  description,
  tint,
  title,
}: {
  children: ReactNode;
  description: string;
  tint: "green" | "mixed" | "purple";
  title: string;
}) {
  const tintClass =
    tint === "purple"
      ? "bg-[radial-gradient(ellipse_70%_42%_at_50%_0%,rgba(153,69,255,0.10),transparent_72%)]"
      : tint === "green"
        ? "bg-[radial-gradient(ellipse_70%_42%_at_50%_0%,rgba(20,241,149,0.08),transparent_72%)]"
        : "bg-[radial-gradient(ellipse_70%_42%_at_30%_0%,rgba(153,69,255,0.08),transparent_70%),radial-gradient(ellipse_70%_42%_at_70%_0%,rgba(20,241,149,0.07),transparent_70%)]";

  return (
    <article
      className={`flex min-h-[520px] flex-col items-center justify-between px-6 py-12 text-center sm:px-8 ${tintClass}`}
    >
      <div className="flex min-h-[300px] w-full items-start justify-center">
        {children}
      </div>
      <div className="mt-10 max-w-sm">
        <h3 className="text-base font-semibold tracking-[-0.02em] text-foreground">
          {title}
        </h3>
        <p className="mt-4 text-sm leading-6 text-muted sm:text-base sm:leading-7">
          {description}
        </p>
      </div>
    </article>
  );
}

function FeatureMiniItem({
  body,
  icon,
  tint,
  title,
}: {
  body: string;
  icon: ReactNode;
  tint: "green" | "purple";
  title: string;
}) {
  const tintClass =
    tint === "purple"
      ? "text-[#b184ff] bg-[linear-gradient(180deg,rgba(153,69,255,0.045),transparent)]"
      : "text-[#14f195] bg-[linear-gradient(180deg,rgba(20,241,149,0.04),transparent)]";

  return (
    <article className={`px-5 py-7 text-left ${tintClass}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        <h3>{title}</h3>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">{body}</p>
    </article>
  );
}

function ExploitFoundationsPreview() {
  return (
    <div className="relative h-[300px] w-full max-w-[340px]">
      <div className="absolute inset-x-0 top-0 overflow-hidden rounded-[24px] border border-border bg-card p-7 text-left shadow-[0_18px_60px_-45px_rgba(0,0,0,0.5)] [mask-image:linear-gradient(to_bottom,black_0%,black_54%,transparent_100%)]">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background">
              <Zap className="h-4 w-4 text-foreground" aria-hidden="true" />
            </div>
            <p className="mt-7 text-xs font-medium text-muted">
              THE ILLUSIONIST
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              4 playable modules
            </p>
            <p className="mt-1 text-xs text-muted">Wallet-bound progress</p>
          </div>
          <div className="rounded-md border border-border bg-background p-3 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
              <span className="h-1.5 w-14 rounded-full bg-muted/20" />
            </div>
            <div className="space-y-2">
              <span className="block h-1.5 w-14 rounded-full bg-muted/20" />
              <span className="block h-1.5 w-10 rounded-full bg-muted/20" />
              <span className="block h-1.5 w-12 rounded-full bg-muted/20" />
            </div>
            <ShieldCheck
              className="ml-auto mt-4 h-3.5 w-3.5 text-foreground"
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="mt-7 grid grid-cols-[72px_1fr] gap-y-3 text-sm text-muted">
          <span>Status</span>
          <span className="text-xs text-foreground">In progress</span>
          <span>Result</span>
          <span className="text-xs text-foreground">Impact verified</span>
          <span>Reward</span>
          <span className="text-xs text-foreground">Claim certificate</span>
        </div>
      </div>
    </div>
  );
}

function SecurityResearchLabPreview() {
  return (
    <div className="flex h-[275px] w-full max-w-[360px] flex-col overflow-hidden rounded-[18px] border border-border bg-card shadow-[0_24px_70px_-48px_rgba(0,0,0,0.55)]">
      <div className="flex items-center gap-2 bg-accent px-6 py-4 text-left text-sm font-medium text-foreground">
        <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
        RL1: Account Substitution
      </div>
      <div className="grid flex-1 gap-3 p-6 sm:grid-cols-2">
        <CodeComparisonPanel
          title="Inspect"
          lines={["approved mint", "canonical vault", "credited collateral"]}
        />
        <CodeComparisonPanel
          title="Exploit"
          lines={["credit increase", "treasury decrease", "finding report"]}
        />
      </div>
    </div>
  );
}

function CodeComparisonPanel({
  lines,
  title,
}: {
  lines: string[];
  title: string;
}) {
  return (
    <div className="flex min-h-[170px] flex-col justify-center rounded-lg border border-border bg-background p-5 text-left">
      <p className="text-xs font-medium text-foreground">{title}</p>
      <div className="mt-5 space-y-2.5 font-mono text-[11px] leading-5 text-muted">
        {lines.map((line) => (
          <div key={line} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-muted/30" />
            <span>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BreachRoomsPreview() {
  return (
    <div className="flex h-[275px] w-full max-w-[360px] flex-col overflow-hidden rounded-[18px] border border-border bg-card text-left shadow-[0_24px_70px_-48px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between border-b border-border bg-accent px-6 py-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
          Breach Rooms
        </div>
        <span className="rounded-full border border-[#9945ff]/30 bg-[#9945ff]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200">
          TBD
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-4 p-6">
        <div className="min-h-[128px] rounded-lg border border-border bg-background p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
            Mini-audit environment
          </div>
          <p className="text-sm leading-6 text-muted">
            Less-guided protocol review with scoped evidence and reporting.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-medium text-muted">
          <span className="rounded-md border border-border bg-background px-2 py-2">
            Inspect
          </span>
          <span className="rounded-md border border-border bg-background px-2 py-2">
            Verify
          </span>
          <span className="rounded-md border border-border bg-background px-2 py-2">
            Report
          </span>
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
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

function StatusChip({ children }: { children: ReactNode }) {
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

function renderRustLine(line: string) {
  if (line.trim().length === 0) {
    return "\u00A0";
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

    if (LANDING_RUST_CODE_KEYWORDS.has(part)) {
      return (
        <span key={key} className="text-[#14f195]">
          {part}
        </span>
      );
    }

    return <span key={key}>{part}</span>;
  });
}
