"use client";

import Image from "next/image";
import { ArrowRight, FlaskConical, KeyRound, ShieldCheck, Wallet } from "lucide-react";
import { useState, type ReactNode } from "react";

function sanitizeAccessCode(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

export function BetaAccessSection({
  onEnterLevel0,
}: {
  onEnterLevel0: () => void;
}) {
  const [accessCode, setAccessCode] = useState("");

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
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b892ff]">
              Beta Access
            </p>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-zinc-400">
              Authenticate your session or apply a temporary access code to enter the current training build.
            </p>
          </div>

          <div className="mt-7 space-y-3">
            <AccessAction
              icon={<Wallet className="h-5 w-5" />}
              label="Connect Wallet"
              onClick={onEnterLevel0}
            />
            <AccessAction
              icon={<FlaskConical className="h-5 w-5" />}
              label="Request Credentials"
              detail="Apply to try beta"
              onClick={onEnterLevel0}
            />
          </div>

          <div className="my-7 flex items-center gap-4">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600">
              Or use code to grant access
            </span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form
            className="rounded-[18px] border border-white/10 bg-black/35 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              onEnterLevel0();
            }}
          >
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              <KeyRound className="h-4 w-4 text-[#8fffd0]" />
              Apply access code to create your account
            </label>
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_112px]">
              <input
                autoCapitalize="characters"
                autoComplete="off"
                inputMode="text"
                name="access-code"
                onChange={(event) =>
                  setAccessCode(sanitizeAccessCode(event.target.value))
                }
                pattern="[A-Z0-9]*"
                placeholder="ENTER_ACCESS_KEY"
                spellCheck={false}
                value={accessCode}
                className="min-h-12 rounded-xl border border-white/10 bg-white/[0.06] px-3 font-mono text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#9945ff]/50 focus:ring-2 focus:ring-[#14f195]/35"
              />
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#9945ff]/35 bg-[#9945ff] px-4 text-sm font-semibold text-white transition hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
              >
                Execute
              </button>
            </div>
          </form>

          <div className="mt-7 flex items-center justify-center gap-2 border-t border-white/10 pt-5 text-xs text-zinc-500">
            <ShieldCheck className="h-4 w-4" />
            Platform currently in devnet, bugs and issues are expected
          </div>
        </div>
      </section>
    </main>
  );
}

function AccessAction({
  detail,
  icon,
  label,
  onClick,
}: {
  detail?: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-20 w-full items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-3 text-left transition hover:border-[#9945ff]/45 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
    >
      <span className="flex items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-[#8fffd0]">
          {icon}
        </span>
        <span>
          <span className="block text-base font-semibold text-white">{label}</span>
          {detail ? (
            <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {detail}
            </span>
          ) : null}
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-[#8fffd0]" />
    </button>
  );
}
