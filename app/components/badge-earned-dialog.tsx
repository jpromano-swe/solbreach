"use client";

import Image from "next/image";
import { ArrowRight, X } from "lucide-react";
import type { UserBadge } from "../lib/badges";
import { MouseEffectCard } from "./mouse-effect-card";

function getBadgeDescription(badge: UserBadge) {
  switch (badge.slug) {
    case "level-1-illusionist":
      return "Congrats, you completed the Account Substitution module. You traced how unchecked account inputs can create forged protocol credit and unlock an invalid asset path.";
    case "level-2-identity-thief":
      return "Congrats, you completed the Static PDA Authority module. You proved how predictable authority state can be reused to redirect control across protocol accounts.";
    case "level-3-trojan-horse":
      return "Congrats, you completed the Delegated CPI module. You mapped how trusted program calls can become unsafe when signer authority is forwarded to the wrong target.";
    case "power-user":
      return "Congrats, you completed Research Lab 1: Account Substitution. Your RL1 certificate and Power User badge now mark your first verified SolBreach research workflow.";
    default:
      return (
        badge.description ||
        "Congrats, you completed this SolBreach module. Keep progressing through the next challenge or review your earned badges from your profile."
      );
  }
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
          className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07090d] sm:right-4 sm:top-4"
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
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-5 text-sm font-semibold text-white shadow-[0_18px_50px_-24px_rgba(153,69,255,0.9)] transition-colors hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07090d]"
            >
              Go to Research Lab
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
