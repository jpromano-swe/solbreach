"use client";

import Image from "next/image";
import { ArrowRight, CheckCircle2, Clock3, X } from "lucide-react";
import type { UserBadge } from "../lib/badges";
import type { LevelId } from "../lib/levels/course-status";
import { MouseEffectCard } from "./mouse-effect-card";

export type ResearchLabCertificationDialogState = {
  assetId?: string | null;
  certificateImage: string;
  certificateTitle: string;
  description: string;
  nextLevel: LevelId;
  powerBadge: UserBadge | null;
  showPowerBadge?: boolean;
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
      <MouseEffectCard className="w-full max-w-[540px] p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close certification dialog"
          className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07090d] sm:right-4 sm:top-4"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="pt-4 text-center">
          <div className="mx-auto w-fit rounded-[2rem] border border-[#14f195]/18 bg-[#14f195]/[0.045] px-6 py-5 shadow-[0_28px_90px_-54px_rgba(20,241,149,0.8)]">
            <Image
              src={reward.certificateImage}
              alt={`${reward.certificateTitle} certificate`}
              width={260}
              height={260}
              className="mx-auto h-56 w-56 object-contain drop-shadow-[0_24px_46px_rgba(20,241,149,0.14)]"
              priority
            />
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#8fffd0]">
              Certificate NFT
            </p>
          </div>

          <div className="mt-6">
            <h2 className="text-4xl font-semibold tracking-[-0.07em] text-foreground">
              Certification unlocked
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
              {reward.description}
            </p>
          </div>

          {reward.showPowerBadge ? (
            <div className="mx-auto mt-5 flex max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left">
              {reward.powerBadge ? (
                <>
                  <Image
                    src={reward.powerBadge.image}
                    alt={`${reward.powerBadge.title} badge`}
                    width={52}
                    height={52}
                    className="h-12 w-12 object-contain drop-shadow-[0_18px_34px_rgba(153,69,255,0.18)]"
                  />
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CheckCircle2
                        className="h-4 w-4 text-[#14f195]"
                        aria-hidden="true"
                      />
                      Power User unlocked
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Special reward added to your profile.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#9945ff]/25 bg-[#9945ff]/10 text-[#c7a6ff]">
                    <Clock3 className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Power User reward syncing
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      It will appear here once confirmed for this wallet.
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : null}

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
