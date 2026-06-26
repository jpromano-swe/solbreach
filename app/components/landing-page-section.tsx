"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Cpu,
  FileCode2,
  LockKeyhole,
  Send,
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
  repositoryUrl,
}: {
  enableAppEntry: boolean;
  onPlayNow: () => void;
  repositoryUrl: string;
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
      label: "Vulnerabilities",
      panel: <HeroMissionStatusCard />,
      title: "levels/01-illusionist/lib.rs",
    },
    {
      code: `pub fn execute_security_council_action(ctx: Context<AdminAction>) -> Result<()> {
    require!(ctx.accounts.council.threshold >= 2, ErrorCode::Quorum);

    let action = ctx.accounts.pending_action.load()?;
    action.execute_without_timelock()?;

    ctx.accounts.market.update_oracle(action.oracle)?;
    ctx.accounts.market.enable_collateral(action.mint)?;

    Ok(())
}`,
      highlightedLines: [4, 6, 7],
      label: "Research Labs",
      panel: <HeroResearchLabPanel />,
      title: "research-labs/governance-takeover.rs",
    },
    {
      code: `pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    require!(vault.balance >= amount, ErrorCode::InsufficientFunds);

    vault.balance -= amount;
    transfer_to_user(ctx.accounts.user.key(), amount)?;

    Ok(())
}`,
      highlightedLines: [4, 6, 7],
      label: "Reviews",
      panel: <HeroReviewRoomPanel />,
      title: "review-room/finding-target.rs",
    },
  ];

  return (
    <section className="space-y-10">
      <div className="mx-auto max-w-4xl space-y-7 text-center">
        <h1 className="mx-auto max-w-4xl text-5xl font-semibold tracking-[-0.08em] sm:text-6xl lg:text-7xl">
          Master Solana Programs{" "}
          <span className="text-[#14f195] drop-shadow-[0_0_28px_rgba(20,241,149,0.22)]">
            Security
          </span>
          .
        </h1>
        <p className="mx-auto max-w-3xl text-base leading-8 text-muted sm:text-lg">
          Hands-on solana programs security wargame. Exploit real
          vulnerabilities, learn from past hacks, participate on review training
          and earn verifiable certifications.
        </p>

        {enableAppEntry ? (
          <button
            type="button"
            onClick={onPlayNow}
            className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-6 text-sm font-medium text-white shadow-[0_18px_50px_-24px_rgba(153,69,255,0.9)] transition-colors hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Play Now
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
          Exploit, analyze, and report
        </h2>
        <p className="mt-4 text-base leading-7 text-muted sm:text-lg">
          Train the fundamentals of security workflow on Solana
        </p>
      </div>

      <FeatureShowcaseSection />
      <LandingCtaSection
        enableAppEntry={enableAppEntry}
        onGetStarted={onPlayNow}
        repositoryUrl={repositoryUrl}
      />
    </section>
  );
}

function LandingCtaSection({
  enableAppEntry,
  onGetStarted,
  repositoryUrl,
}: {
  enableAppEntry: boolean;
  onGetStarted: () => void;
  repositoryUrl: string;
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
          Start your Solana security researcher journey today
        </h2>
        <p className="mt-5 text-base leading-7 text-muted sm:text-lg">
          Open the wargame, inspect vulnerable programs, complete on-chain
          objectives, and turn each exploit into review-ready proof.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {enableAppEntry ? (
            <button
              type="button"
              onClick={onGetStarted}
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-6 text-sm font-medium text-white shadow-[0_18px_50px_-24px_rgba(153,69,255,0.9)] transition-colors hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Get Started
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
            href={repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-card/80 px-6 text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Read Docs
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
              Research lab
            </p>
            <h3 className="mt-3 text-xl font-semibold tracking-[-0.05em]">
              Governance Takeover
            </h3>
          </div>
          <span className="w-fit rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-100">
            Critical
          </span>
        </div>

        <div className="mt-5 space-y-3 text-sm leading-6 text-muted">
          <p>
            Research social engineering and durable nonce abuse that escalates
            governance authority.
          </p>
          <p>
            Review focus: governance flow, transaction freshness, authority
            boundaries, and proposal execution.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 lg:flex-nowrap">
          <HeroMetric label="Date" value="Apr 1, 2026" />
          <HeroMetric label="Time" value="3-5h" />
          <HeroMetric label="Class" value="Governance" />
        </div>

        <div className="mt-5 rounded-[18px] border border-border bg-background/80 p-4">
          <p className="text-[11px] uppercase tracking-[0.26em] text-muted">
            Reviewer checklist
          </p>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <ChecklistItem text="Can stale pre-signed governance transactions execute after context changes?" />
            <ChecklistItem text="Can two signers authorize critical admin powers without delay?" />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroReviewRoomPanel() {
  return (
    <div className="space-y-3">
      <div className="rounded-[24px] border border-border bg-card/95 p-5 shadow-[0_30px_90px_-48px_rgba(0,0,0,0.9)]">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
          Review room
        </p>
        <div className="mt-5 space-y-4">
          <HeroReviewField label="Title" value="Unchecked CPI target" />
          <HeroReviewField
            label="Summary"
            value="The program lets users choose the CPI target, allowing malicious instructions to run with delegated authority."
          />
          <div className="flex flex-wrap gap-2 lg:flex-nowrap">
            <HeroMetric label="Severity" value="High" tone="red" />
            <HeroMetric label="Impact" value="Medium" tone="amber" />
            <HeroMetric label="Likelihood" value="Low" tone="cyan" />
          </div>
          <HeroReviewField
            label="Recommendation"
            value="Allowlist trusted program IDs and validate CPI accounts before forwarding signer privileges."
          />

          <button
            type="button"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-5 text-sm font-medium text-white transition hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Send review
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
        <StatusChip>Armed</StatusChip>
      </div>

      <div className="mt-5 space-y-3">
        <HeroStatusRow label="Cluster" value="devnet" />
        <HeroStatusRow label="Wallet" value="9xQe...1b2C" />
        <HeroStatusRow label="PDA state" value="Live" />
        <HeroStatusRow label="Win condition" value="Ledger forged" />
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
          Exploit objective verified. Wallet-bound certification is ready.
        </p>
      </div>

      <button
        type="button"
        className="mt-6 min-h-12 w-full rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-5 text-sm font-medium text-white transition hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Mint certification
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

function HeroReviewField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.26em] text-muted">
        {label}
      </span>
      <span className="mt-2 block rounded-[16px] border border-border bg-background/80 px-4 py-3 text-sm text-foreground">
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
          title="Exploit Foundations"
          description="Interact with vulnerable devnet programs, complete exploit objectives, and unlock wallet-bound certifications."
        >
          <ExploitFoundationsPreview />
        </FeaturePreview>
        <FeaturePreview
          tint="green"
          title="Security Research Labs"
          description="Study structured research scenarios side-by-side while tracing real-world Solana bug patterns."
        >
          <SecurityResearchLabPreview />
        </FeaturePreview>
        <FeaturePreview
          tint="mixed"
          title="Arena & Reviewer Training"
          description="Practice professional findings and team review rooms built for onboarding, assessment, and readiness."
        >
          <ArenaTrainingPreview />
        </FeaturePreview>
      </div>

      <div className="grid divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-6">
        <FeatureMiniItem
          icon={<Zap className="h-4 w-4" aria-hidden="true" />}
          tint="purple"
          title="Real Vulnerable Programs"
          body="Intentionally vulnerable Solana programs deployed on devnet."
        />
        <FeatureMiniItem
          icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          tint="green"
          title="Exploit Verification"
          body="On-chain objectives with wallet-bound certifications."
        />
        <FeatureMiniItem
          icon={<FileCode2 className="h-4 w-4" aria-hidden="true" />}
          tint="purple"
          title="Secure Comparisons"
          body="Insecure implementations beside patched versions."
        />
        <FeatureMiniItem
          icon={<LockKeyhole className="h-4 w-4" aria-hidden="true" />}
          tint="green"
          title="Bug Patterns"
          body="Arbitrary CPI, PDA misuse, signer confusion, and authority bugs."
        />
        <FeatureMiniItem
          icon={<Cpu className="h-4 w-4" aria-hidden="true" />}
          tint="purple"
          title="Security Writeups"
          body="Severity, exploit reasoning, impact, and remediation practice."
        />
        <FeatureMiniItem
          icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
          tint="green"
          title="Breach Rooms"
          body="Challenge environments for first-flights, and review writeup training."
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
            <p className="mt-7 text-xs font-medium text-muted">CERTIFICATIONS</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              4 exploits
            </p>
            <p className="mt-1 text-xs text-muted">2 certified</p>
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
          <span>Setup</span>
          <span className="mt-1 h-2 w-20 rounded-full bg-muted/15" />
          <span>Verify</span>
          <span className="mt-1 h-2 w-28 rounded-full bg-muted/15" />
          <span>Mint</span>
          <span className="mt-1 h-2 w-16 rounded-full bg-muted/15" />
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
        Governance Takeover Research Lab
      </div>
      <div className="grid flex-1 gap-3 p-6 sm:grid-cols-2">
        <CodeComparisonPanel
          title="Vulnerable"
          lines={["unchecked CPI", "static PDA", "missing signer"]}
        />
        <CodeComparisonPanel
          title="Patched"
          lines={["program guard", "user seeds", "authority check"]}
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

function ArenaTrainingPreview() {
  return (
    <div className="flex h-[275px] w-full max-w-[360px] flex-col overflow-hidden rounded-[18px] border border-border bg-card text-left shadow-[0_24px_70px_-48px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between border-b border-border bg-accent px-6 py-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Breach Room
        </div>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground">
          Live
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-4 p-6">
        <div className="min-h-[128px] rounded-lg border border-border bg-background p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
            <Send className="h-4 w-4" aria-hidden="true" />
            Sending review
          </div>
          <div className="space-y-2">
            <span className="block h-1.5 w-40 rounded-full bg-muted/20" />
            <span className="block h-1.5 w-28 rounded-full bg-muted/20" />
            <span className="block h-1.5 w-36 rounded-full bg-muted/20" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-medium text-muted">
          <span className="rounded-md border border-border bg-background px-2 py-2">
            Severity
          </span>
          <span className="rounded-md border border-border bg-background px-2 py-2">
            Impact
          </span>
          <span className="rounded-md border border-border bg-background px-2 py-2">
            Likelihood
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
