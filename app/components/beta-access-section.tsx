"use client";

import Image from "next/image";
import { ChevronDown, KeyRound, ShieldCheck, Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  getBetaAccessStatus,
  redeemBetaAccessCode,
  requestBetaAccess,
} from "../lib/beta-access";
import { ensureBackendWalletAuth } from "../lib/levels/level1-backend";
import { useWallet } from "../lib/wallet/context";
import { WalletButton } from "./wallet-button";

function sanitizeAccessCode(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

type PendingBetaAction = "request" | "redeem";
type StatusKind = "error" | "info" | "success" | "warning";

const NEEDS_ACCESS_MESSAGE = "Request beta access or redeem an access code.";

export function BetaAccessSection({
  onEnterLevel0,
}: {
  onEnterLevel0: () => void;
}) {
  const { wallet } = useWallet();
  const [accessCode, setAccessCode] = useState("");
  const [codeOpen, setCodeOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingBetaAction>("request");
  const [statusMessage, setStatusMessage] = useState<{
    kind: StatusKind;
    text: string;
  } | null>(null);
  const [needsAccessAction, setNeedsAccessAction] = useState(false);
  const walletAddress = wallet?.account.address;

  useEffect(() => {
    let cancelled = false;

    async function verifyConnectedWalletAccess() {
      await Promise.resolve();

      if (cancelled) {
        return;
      }

      if (!wallet) {
        setNeedsAccessAction(false);
        setCodeOpen(false);
        setStatusMessage(null);
        return;
      }

      try {
        await ensureBackendWalletAuth(wallet);
        const result = await getBetaAccessStatus(wallet.account.address);

        if (cancelled) {
          return;
        }

        if (result.hasAccess && result.status === "approved") {
          toast.success("Beta access confirmed.");
          onEnterLevel0();
          return;
        }

        setNeedsAccessAction(true);
        setCodeOpen(true);
        setStatusMessage({
          kind: result.status === "none" ? "warning" : "info",
          text:
            result.status === "pending"
              ? "Your beta request is pending for this wallet."
              : result.status === "revoked"
                ? "Beta access for this wallet is no longer active."
                : NEEDS_ACCESS_MESSAGE,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        setStatusMessage({ kind: "error", text: message });
        toast.error(message);
      }
    }

    void verifyConnectedWalletAccess();

    return () => {
      cancelled = true;
    };
  }, [wallet, walletAddress, onEnterLevel0]);

  async function submitAccessRequest() {
    setPendingAction("request");

    if (!wallet) {
      toast.error("Connect wallet first.");
      return;
    }

    setIsBusy(true);
    setStatusMessage(null);
    try {
      await ensureBackendWalletAuth(wallet);
      const result = await requestBetaAccess(wallet.account.address);
      setNeedsAccessAction(true);
      setCodeOpen(true);
      setStatusMessage({ kind: "success", text: result.message });
      toast.success(result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusMessage({ kind: "error", text: message });
      toast.error(message);
    } finally {
      setIsBusy(false);
    }
  }

  async function redeemAccessCode() {
    setPendingAction("redeem");

    if (!wallet) {
      toast.error("Connect wallet first.");
      return;
    }

    if (!accessCode) {
      setCodeOpen(true);
      setStatusMessage({
        kind: "error",
        text: "Enter an access code before redeeming.",
      });
      return;
    }

    setIsBusy(true);
    setStatusMessage(null);
    try {
      await ensureBackendWalletAuth(wallet);
      const result = await redeemBetaAccessCode({
        code: accessCode,
        walletAddress: wallet.account.address,
      });

      if (result.hasAccess && result.status === "approved") {
        toast.success("Access code redeemed.");
        onEnterLevel0();
        return;
      }

      setStatusMessage({
        kind: "info",
        text: "Access code received, but this wallet is not approved yet.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusMessage({ kind: "error", text: message });
      toast.error(message);
    } finally {
      setIsBusy(false);
    }
  }

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
            <WalletButton
              className="w-[min(100%,300px)]"
              disconnectedButtonClassName="inline-flex min-h-11 w-full items-center justify-center border-[#9945ff]/35 bg-[#9945ff] px-4 text-sm font-semibold text-white shadow-[0_14px_38px_-24px_rgba(153,69,255,0.9)] hover:bg-[#8b35f6]"
              connectedButtonClassName="min-h-11 w-full justify-center border-white/10 bg-[#17212b] px-4 text-sm font-semibold text-zinc-100 shadow-[0_14px_38px_-24px_rgba(20,241,149,0.45)] hover:bg-[#1b2834]"
            />
            <button
              type="button"
              onClick={() => void submitAccessRequest()}
              disabled={!wallet || isBusy}
              className="inline-flex min-h-10 w-[min(100%,300px)] items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-zinc-300 transition hover:border-[#14f195]/25 hover:bg-white/[0.065] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
            >
              <Ticket className="h-4 w-4 text-[#8fffd0]" />
              {isBusy && pendingAction === "request"
                ? "Requesting..."
                : "Request Beta Access"}
            </button>
          </div>

          {wallet && statusMessage ? (
            <p
              className={`mx-auto mt-4 max-w-[300px] text-center text-sm leading-6 ${
                statusMessage.kind === "error"
                  ? "text-red-300"
                  : statusMessage.kind === "success"
                    ? "text-[#8fffd0]"
                    : statusMessage.kind === "warning"
                      ? "text-yellow-300"
                      : "text-zinc-400"
              }`}
            >
              <StatusMessageText text={statusMessage.text} />
            </p>
          ) : null}

          <div
            className={`grid transition-[grid-template-rows,opacity,margin-top] duration-200 ease-out ${
              wallet && needsAccessAction
                ? "mt-7 grid-rows-[1fr] opacity-100"
                : "mt-0 grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="min-h-0 overflow-hidden border-t border-white/10 pt-5">
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
                    void redeemAccessCode();
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
                      disabled={isBusy}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#9945ff]/35 bg-[#9945ff] px-4 text-sm font-semibold text-white transition hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
                    >
                      {isBusy && pendingAction === "redeem"
                        ? "Redeeming..."
                        : "Redeem Code"}
                    </button>
                  </div>
                </form>
              </div>
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

function StatusMessageText({ text }: { text: string }) {
  if (text !== NEEDS_ACCESS_MESSAGE) {
    return text;
  }

  return (
    <span className="font-semibold text-yellow-300">
      {NEEDS_ACCESS_MESSAGE}
    </span>
  );
}
