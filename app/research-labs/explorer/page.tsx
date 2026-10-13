"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { YieldHijackExplorer } from "../../components/research-labs/yield-hijack-explorer";
import {
  readStoredBackendWalletAuth,
  type Level1AuthSession,
} from "../../lib/levels/level1-backend";

export default function ResearchLabExplorerPage() {
  const [auth, setAuth] = useState<Level1AuthSession | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrapTimer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedSessionId = params.get("sessionId")?.trim() ?? "";
      const storedAuth = readStoredBackendWalletAuth();

      if (!requestedSessionId) {
        setError("This Explorer link is missing a research session.");
        return;
      }
      if (!storedAuth) {
        setError(
          "Your lab authentication has expired. Return to Research Labs and reconnect your wallet."
        );
        return;
      }

      setSessionId(requestedSessionId);
      setAuth(storedAuth);
    }, 0);

    return () => window.clearTimeout(bootstrapTimer);
  }, []);

  if (error) {
    return <ExplorerRouteError message={error} />;
  }

  if (!auth || !sessionId) {
    return <ExplorerRouteLoading />;
  }

  return (
    <YieldHijackExplorer
      accessToken={auth.accessToken}
      sessionId={sessionId}
      standalone
    />
  );
}

function ExplorerRouteLoading() {
  return (
    <main className="min-h-screen bg-[#121313] px-5 py-10 text-zinc-100">
      <div className="mx-auto max-w-5xl">
        <div className="h-9 w-48 animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="mt-10 h-7 w-56 animate-pulse rounded-md bg-white/[0.06]" />
        <div className="mt-5 h-48 animate-pulse rounded-xl border border-white/8 bg-white/[0.025]" />
      </div>
    </main>
  );
}

function ExplorerRouteError({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#121313] px-5 py-10 text-zinc-100">
      <section className="w-full max-w-lg rounded-xl border border-white/10 bg-[#191a1a] p-6">
        <Image
          src="/logo_crop.png"
          alt="SolBreach"
          width={144}
          height={45}
          className="h-8 w-auto object-contain"
          priority
        />
        <div className="mt-8 flex h-11 w-11 items-center justify-center rounded-lg border border-red-400/20 bg-red-500/8 text-red-200">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">
          Explorer unavailable
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{message}</p>
        <Link
          href="/?section=research-labs"
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-zinc-200 hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121313]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Return to Research Labs
        </Link>
      </section>
    </main>
  );
}
