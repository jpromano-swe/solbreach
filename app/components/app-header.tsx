"use client";

import Image from "next/image";
import { ClusterSelect } from "./cluster-select";
import { HeaderCourseNav, type CourseLevelTarget } from "./course-nav";
import { ThemeToggle } from "./theme-toggle";
import { WalletButton } from "./wallet-button";
import type { RootSection } from "../lib/hooks/use-level-route";
import type { LevelsView } from "../lib/levels/course-status";

export function AppHeader({
  activeLevelsView,
  activeSection,
  onOpenLanding,
  onOpenProfile,
  onSelectLevel,
  onSelectResearchLabs,
  walletStatus,
}: {
  activeLevelsView: LevelsView;
  activeSection: RootSection;
  onOpenLanding: () => void;
  onOpenProfile: () => void;
  onSelectLevel: (level: CourseLevelTarget) => void;
  onSelectResearchLabs: () => void;
  walletStatus: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <div className="flex justify-center lg:justify-start">
          <button
            type="button"
            onClick={onOpenLanding}
            className="rounded-[18px] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Open SolBreach landing page"
          >
            <Image
              src="/logo_crop.png"
              alt="SolBreach"
              width={1480}
              height={304}
              className="h-20 w-auto sm:h-20 lg:h-20"
              priority
            />
          </button>
        </div>

        {activeSection !== "levels" || activeLevelsView !== "landing" ? (
          <HeaderCourseNav
            onSelectResearchLabs={onSelectResearchLabs}
            onSelectLevel={onSelectLevel}
          />
        ) : (
          <div className="hidden lg:block" aria-hidden="true" />
        )}

        <div className="flex items-center justify-center gap-2 sm:gap-3 lg:justify-self-end">
          <ClusterSelect />
          <WalletButton />
          {walletStatus === "connected" ? (
            <button
              type="button"
              onClick={onOpenProfile}
              className={`min-h-11 rounded-full border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                activeSection === "profile"
                  ? "border-foreground/20 bg-foreground text-background"
                  : "border-border bg-card/70 text-foreground hover:bg-accent"
              }`}
            >
              My Profile
            </button>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
