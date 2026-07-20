import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { OnboardingQuestionnaire } from "../components/onboarding-questionnaire";

export const metadata: Metadata = {
  title: "Request Beta Access | SolBreach",
  description:
    "Apply for the private SolBreach beta and tell us about your Solana security experience.",
};

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/80 bg-background/88">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            aria-label="Back to SolBreach"
            className="rounded-lg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195]"
          >
            <Image
              src="/logo_crop.png"
              alt="SolBreach"
              width={1480}
              height={304}
              priority
              className="h-12 w-auto"
            />
          </Link>
          <Link
            href="/"
            className="text-sm text-muted transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195]"
          >
            Back to SolBreach
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl py-8 sm:px-6 sm:py-12">
        <OnboardingQuestionnaire />
      </div>
    </main>
  );
}
