"use client";

import Image from "next/image";
import { ArrowRight, X } from "lucide-react";
import type { UserBadge } from "../lib/badges";
import { MouseEffectCard } from "./mouse-effect-card";

function getBadgeDescription(badge: UserBadge) {
  if (badge.slug === "level-1-illusionist") {
    return "Congrats, you successfully completed the Account Substitution module. Keep going by completing the next module, or continue learning about this vector in the Account Substitution Research Lab.";
  }

  return (
    badge.description ||
    "Congrats, you completed this SolBreach module. Keep progressing through the next challenge or review your earned badges from your profile."
  );
}

export function BadgeEarnedDialog({
  badge,
  onClose,
  onOpenProfile,
  onOpenResearchLab,
}: {
  badge: UserBadge | null;
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenResearchLab: () => void;
}) {
  if (!badge) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/72 px-4 backdrop-blur-md">
      <MouseEffectCard className="w-full max-w-[480px] p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close badge dialog"
          className="absolute right-5 top-5 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07090d]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div>
          <div className="mx-auto mt-6 flex h-48 w-48 items-center justify-center rounded-full bg-white/[0.03]">
            <Image
              src={badge.image}
              alt={`${badge.title} badge`}
              width={176}
              height={176}
              className="h-44 w-44 object-contain drop-shadow-[0_24px_45px_rgba(153,69,255,0.35)]"
              priority
            />
          </div>

          <div className="mt-6 text-center">
            <h2 className="text-4xl font-semibold tracking-[-0.07em] text-foreground">
              {badge.title}
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">
              {getBadgeDescription(badge)}
            </p>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onOpenResearchLab}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-5 text-sm font-semibold text-white shadow-[0_18px_50px_-24px_rgba(153,69,255,0.9)] transition-colors hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07090d]"
            >
              Go to Research Lab
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
