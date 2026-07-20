import type { Metadata } from "next";

import { OnboardingQuestionnaire } from "../components/onboarding-questionnaire";

export const metadata: Metadata = {
  title: "Request Beta Access | SolBreach",
  description:
    "Apply for the private SolBreach beta and tell us about your Solana security experience.",
};

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-background py-8 text-foreground sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <OnboardingQuestionnaire />
      </div>
    </main>
  );
}
