"use client";

export function CertificateMintLoader({
  label = "Minting certificate...",
  description,
  variant = "inline",
}: {
  description?: string;
  label?: string;
  variant?: "inline" | "modal";
}) {
  if (variant === "modal") {
    return (
      <div
        aria-labelledby="certificate-mint-loader-title"
        aria-modal="true"
        className="fixed inset-0 z-[85] flex items-center justify-center bg-black/72 px-4 backdrop-blur-md"
        role="dialog"
      >
        <div className="w-full max-w-[420px] rounded-[2rem] border border-white/10 bg-[#090b0f]/95 px-8 py-9 text-center shadow-[0_34px_110px_-60px_rgba(153,69,255,0.95)]">
          <div
            className="relative mx-auto flex h-24 w-24 items-center justify-center"
            aria-hidden="true"
          >
            <span className="absolute inset-0 rounded-full border border-[#9945ff]/20 bg-[#9945ff]/5 motion-safe:animate-ping" />
            <span className="absolute inset-2 rounded-full border border-[#14f195]/15 bg-[#14f195]/[0.035]" />
            <span className="h-16 w-16 rounded-full border-2 border-[#9945ff]/20 border-t-[#9945ff] motion-safe:animate-spin" />
            <span className="absolute h-9 w-9 rounded-full border-2 border-[#14f195]/20 border-b-[#14f195] motion-safe:animate-pulse" />
          </div>

          <h2
            id="certificate-mint-loader-title"
            className="mt-7 text-2xl font-semibold tracking-[-0.04em] text-foreground"
          >
            {label}
          </h2>
          {description ? (
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-muted">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center justify-center gap-2" aria-live="polite">
      <span className="relative h-4 w-4" aria-hidden="true">
        <span className="absolute inset-0 rounded-full border-2 border-[#9945ff]/25 border-t-[#9945ff] motion-safe:animate-spin" />
        <span className="absolute inset-1 rounded-full border-2 border-[#14f195]/25 border-b-[#14f195] motion-safe:animate-pulse" />
      </span>
      <span>{label}</span>
    </span>
  );
}
