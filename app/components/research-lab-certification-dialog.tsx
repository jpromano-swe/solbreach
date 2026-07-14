"use client";

import Image from "next/image";
import { ArrowRight, X } from "lucide-react";
import type { UserBadge } from "../lib/badges";
import { MouseEffectCard } from "./mouse-effect-card";

export type ResearchLabCertificationDialogState = {
  assetId?: string | null;
  certificateImage: string;
  certificateTitle: string;
  powerBadge: UserBadge | null;
};

export function ResearchLabCertificationDialog({
  reward,
  onClose,
  onOpenProfile,
  onOpenNextModule,
}: {
  reward: ResearchLabCertificationDialogState | null;
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenNextModule: () => void;
}) {
  if (!reward) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/72 px-4 backdrop-blur-md">
      <MouseEffectCard className="w-full max-w-[560px] p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close certification dialog"
          className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07090d] sm:right-4 sm:top-4"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="pt-5 text-center">
          <div className="mx-auto grid max-w-sm grid-cols-2 items-end gap-4">
            <div className="rounded-3xl border border-[#14f195]/18 bg-[#14f195]/6 p-3">
              <Image
                src={reward.certificateImage}
                alt={`${reward.certificateTitle} certificate`}
                width={190}
                height={190}
                className="mx-auto h-40 w-40 object-contain drop-shadow-[0_24px_50px_rgba(20,241,149,0.16)]"
                priority
              />
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8fffd0]">
                Certificate NFT
              </p>
            </div>

            <div className="rounded-3xl border border-[#9945ff]/18 bg-[#9945ff]/8 p-3">
              <Image
                src={reward.powerBadge?.image ?? "/badges/badge-poweruser.png"}
                alt="Power User badge"
                width={190}
                height={190}
                className={`mx-auto h-40 w-40 object-contain drop-shadow-[0_24px_50px_rgba(153,69,255,0.18)] ${
                  reward.powerBadge ? "" : "opacity-45 grayscale"
                }`}
                priority
              />
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#c7a6ff]">
                {reward.powerBadge ? "Power User" : "Badge syncing"}
              </p>
            </div>
          </div>

          <div className="mt-7">
            <h2 className="text-4xl font-semibold tracking-[-0.07em] text-foreground">
              Certification unlocked
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
              You completed Research Lab 1 and minted the Account Substitution
              certificate. The Power User reward is shown here when it is
              confirmed for this wallet.
            </p>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onOpenNextModule}
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-5 text-sm font-semibold text-white shadow-[0_18px_50px_-24px_rgba(153,69,255,0.9)] transition-colors hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07090d]"
            >
              Next Module
              <ArrowRight
                className="h-4 w-4 transition-transform duration-150 ease-out motion-safe:group-hover:translate-x-1"
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={onOpenProfile}
              className="min-h-12 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07090d]"
            >
              View profile
            </button>
          </div>
        </div>
      </MouseEffectCard>
    </div>
  );
}
