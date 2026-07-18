import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SolBreach Explorer",
  description:
    "Inspect the public interface, accounts, and transaction history for a SolBreach SVM research session.",
};

export default function ResearchLabExplorerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
