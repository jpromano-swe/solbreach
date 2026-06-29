"use client";

import Image from "next/image";
import { ChevronDown, KeyRound, ShieldCheck, Ticket, Wallet } from "lucide-react";
import { useState } from "react";

function sanitizeAccessCode(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

export function BetaAccessSection({
  onEnterLevel0,
}: {
  onEnterLevel0: () => void;
}) {
  const [accessCode, setAccessCode] = useState("");
  const [codeOpen, setCodeOpen] = useState(false);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050606] text-white">
      <Image
        src="/beta_auth_background.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,6,6,0.08)_0%,rgba(5,6,6,0.22)_42%,rgba(5,6,6,0.82)_68%,#050606_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_48%,rgba(20,241,149,0.16),transparent_34%),linear-gradient(180deg,rgba(5,6,6,0.12),rgba(5,6,6,0.54))]" />

      <section className="relative z-10 grid min-h-screen items-center gap-10 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:px-10 xl:px-16">
        <div className="hidden lg:block" aria-hidden="true" />

        <div className="ml-auto w-full max-w-[430px] rounded-[22px] border border-white/10 bg-[#111212]/82 p-6 shadow-2xl shadow-black/45 backdrop-blur-xl sm:p-7">
          <div className="flex justify-center">
            <Image
              src="/logo_crop.png"
              alt="SolBreach"
              width={1480}
              height={304}
              priority
              className="h-auto w-64 max-w-full"
            />
          </div>

          <div className="mt-8 text-center">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#b892ff] drop-shadow-[0_0_24px_rgba(153,69,255,0.28)]">
              Private Beta Access
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-zinc-400">
              Connect your wallet
              <br />
              to try the current beta.
              <br />
              No access yet? Request an invite below.
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={onEnterLevel0}
              className="inline-flex min-h-11 w-[min(100%,300px)] items-center justify-center gap-2 rounded-lg border border-[#9945ff]/35 bg-[#9945ff] px-4 text-sm font-semibold text-white shadow-[0_14px_38px_-24px_rgba(153,69,255,0.9)] transition hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </button>
            <button
              type="button"
              onClick={onEnterLevel0}
              className="inline-flex min-h-10 w-[min(100%,300px)] items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-zinc-300 transition hover:border-[#14f195]/25 hover:bg-white/[0.065] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
            >
              <Ticket className="h-4 w-4 text-[#8fffd0]" />
              Request Beta Access
            </button>
          </div>

          <div className="mt-7 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={() => setCodeOpen((open) => !open)}
              className="inline-flex w-full items-center justify-between gap-3 text-left text-sm text-zinc-400 transition hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
              aria-expanded={codeOpen}
            >
              <span className="inline-flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[#8fffd0]" />
                Already have an access code?
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                {codeOpen ? "Hide" : "Expand"}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    codeOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </span>
            </button>

            <div
              className={`grid transition-[grid-template-rows,opacity,margin-top] duration-200 ease-out ${
                codeOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
              }`}
            >
              <form
                className="min-h-0 overflow-hidden"
                onSubmit={(event) => {
                  event.preventDefault();
                  onEnterLevel0();
                }}
              >
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_128px]">
                  <input
                    autoCapitalize="characters"
                    autoComplete="off"
                    inputMode="text"
                    name="access-code"
                    onChange={(event) =>
                      setAccessCode(sanitizeAccessCode(event.target.value))
                    }
                    pattern="[A-Z0-9]*"
                    placeholder="ENTER_ACCESS_CODE"
                    spellCheck={false}
                    value={accessCode}
                    className="min-h-11 rounded-xl border border-white/10 bg-white/[0.045] px-3 font-mono text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#9945ff]/50 focus:ring-2 focus:ring-[#14f195]/35"
                  />
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#9945ff]/35 bg-[#9945ff] px-4 text-sm font-semibold text-white transition hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
                  >
                    Redeem Code
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="mt-7 flex items-center justify-center gap-2 border-t border-white/10 pt-5 text-xs text-zinc-500">
            <ShieldCheck className="h-4 w-4" />
            Devnet beta build. Training state may change during testing.
          </div>
        </div>
      </section>
    </main>
  );
}
