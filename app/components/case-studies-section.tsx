"use client";

const CASE_STUDIES = [
  {
    protocol: "Drift Protocol",
    amount: "$285M",
    date: "Apr 1, 2026",
    summary:
      "Attackers used social engineering and durable nonce transactions to gain unauthorized control over Drift Security Council powers, then executed a rapid governance takeover that drained protocol funds.",
    tags: [
      "Durable nonce",
      "Governance control",
      "Multisig hygiene",
      "Privileged access",
      "Social engineering",
    ],
  },
  {
    protocol: "Step Finance",
    amount: "$40M",
    date: "Jan 31, 2026",
    summary:
      "Compromised executive devices were used to access operational systems and drain the Step Finance treasury, showing how endpoint security and treasury authorization controls are part of protocol security.",
    tags: [
      "Device compromise",
      "Treasury controls",
      "Key management",
      "Operational security",
      "Incident response",
    ],
  },
  {
    protocol: "Loopscale",
    amount: "$5.8M",
    date: "Apr 26, 2025",
    summary:
      "The attacker exploited a flaw in lending market pricing and collateral validation, taking out undercollateralized loans that siphoned USDC and SOL from Loopscale vaults shortly after launch.",
    tags: [
      "Collateral pricing",
      "Oracle validation",
      "Market risk",
      "Undercollateralized loans",
      "Vault safety",
    ],
  },
];

export function CaseStudiesSection() {
  return (
    <section className="space-y-10">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#14f195]">
          Case Studies
        </p>
        <h1 className="text-5xl font-semibold tracking-[-0.08em] sm:text-6xl">
          Learn from real Solana incidents.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
          Study protocol failures as security workflows: what broke, how much
          was at risk, and which topics map back to the lectures.
        </p>
      </div>

      <div className="divide-y divide-border rounded-[28px] border border-border bg-card/70 shadow-[0_24px_90px_-70px_rgba(0,0,0,0.9)]">
        {CASE_STUDIES.map((caseStudy) => (
          <article
            key={caseStudy.protocol}
            className="grid gap-6 p-6 lg:grid-cols-[0.72fr_1.28fr]"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted">
                {caseStudy.date}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                {caseStudy.protocol}
              </h2>
              <p className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-semibold tracking-[-0.07em] text-red-500 drop-shadow-[0_0_26px_rgba(239,68,68,0.24)]">
                  {caseStudy.amount}
                </span>
                <span className="text-2xl font-semibold tracking-[-0.04em] text-foreground">
                  affected
                </span>
              </p>
            </div>

            <div className="space-y-5">
              <p className="text-sm leading-7 text-muted sm:text-base">
                {caseStudy.summary}
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {caseStudy.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs font-medium text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-11 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-border bg-muted/20 px-4 text-sm font-medium text-muted/55"
                >
                  Start Level
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
