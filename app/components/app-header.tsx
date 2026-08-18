"use client";

import Image from "next/image";
import { HeaderCourseNav, type CourseLevelTarget } from "./course-nav";
import { WalletButton } from "./wallet-button";
import type { RootSection } from "../lib/hooks/use-level-route";
import type { LevelsView } from "../lib/levels/course-status";

export function AppHeader({
  activeLevelsView,
  activeSection,
  onOpenLanding,
  onOpenProfile,
  onSelectLevel,
  onSelectBreachRooms,
  onSelectResearchLabs,
  onSelectVulnerabilities,
  profileDisplayName,
  profileImageSrc,
  walletStatus,
}: {
  activeLevelsView: LevelsView;
  activeSection: RootSection;
  onOpenLanding: () => void;
  onOpenProfile: () => void;
  onSelectLevel: (level: CourseLevelTarget) => void;
  onSelectBreachRooms: () => void;
  onSelectResearchLabs: () => void;
  onSelectVulnerabilities: () => void;
  profileDisplayName?: string;
  profileImageSrc?: string;
  walletStatus: string;
}) {
  const isLandingView =
    activeSection === "levels" && activeLevelsView === "landing";
  const showAppWallet = !isLandingView;

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/88 backdrop-blur-xl">
      <div className="flex w-full flex-col items-center gap-3 px-4 py-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-8">
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
              className={
                isLandingView
                  ? "h-10 w-auto sm:h-11 lg:h-12"
                  : "h-14 w-auto sm:h-16 lg:h-16"
              }
              priority
            />
          </button>
        </div>

        {activeSection !== "levels" || activeLevelsView !== "landing" ? (
          <HeaderCourseNav
            onSelectBreachRooms={onSelectBreachRooms}
            onSelectResearchLabs={onSelectResearchLabs}
            onSelectVulnerabilities={onSelectVulnerabilities}
            onSelectLevel={onSelectLevel}
          />
        ) : (
          <div className="hidden lg:block" aria-hidden="true" />
        )}

        <div className="flex items-center justify-center gap-2 sm:gap-3 lg:justify-self-end">
          {showAppWallet ? (
            <WalletButton
              isProfileActive={activeSection === "profile"}
              onOpenProfile={onOpenProfile}
              profileDisplayName={profileDisplayName}
              profileImageSrc={profileImageSrc}
              disconnectedButtonClassName="min-h-11 rounded-2xl border border-primary/35 bg-primary/15 px-5 text-sm font-semibold text-primary shadow-[0_18px_52px_-30px_rgba(153,69,255,0.85)] transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              connectedButtonClassName="min-w-[12rem] border-[#9945ff]/35 bg-[#152033]/95"
            />
          ) : walletStatus === "connected" ? (
            <div className="hidden lg:block" aria-hidden="true" />
          ) : null}
        </div>
      </div>
    </header>
  );
}
