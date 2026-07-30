"use client";

export function CertificateMintLoader({
  label = "Minting certificate...",
}: {
  label?: string;
}) {
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
