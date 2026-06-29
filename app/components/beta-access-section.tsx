"use client";

import Image from "next/image";
import { ChevronDown, KeyRound, ShieldCheck, Ticket, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  getBetaAccessStatus,
  redeemBetaAccessCode,
  requestBetaAccess,
} from "../lib/beta-access";
import { ensureBackendWalletAuth } from "../lib/levels/level1-backend";
import { useWallet } from "../lib/wallet/context";
import type { WalletSession } from "../lib/wallet/types";

function sanitizeAccessCode(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

type PendingBetaAction = "enter" | "request" | "redeem";
type StatusKind = "error" | "info" | "success";

export function BetaAccessSection({
  onEnterLevel0,
}: {
  onEnterLevel0: () => void;
}) {
  const { connect, connectors, status, wallet } = useWallet();
  const [accessCode, setAccessCode] = useState("");
  const [codeOpen, setCodeOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingBetaAction>("enter");
  const [statusMessage, setStatusMessage] = useState<{
    kind: StatusKind;
    text: string;
  } | null>(null);
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);

  async function authenticateWallet(session: WalletSession) {
    await ensureBackendWalletAuth(session);
    return session.account.address;
  }

  async function checkAccess(session: WalletSession) {
    const walletAddress = await authenticateWallet(session);
    const result = await getBetaAccessStatus(walletAddress);

    if (result.hasAccess && result.status === "approved") {
      toast.success("Beta access confirmed.");
      onEnterLevel0();
      return;
    }

    const message =
      result.status === "pending"
        ? "Your beta request is pending for this wallet."
        : result.status === "revoked"
          ? "Beta access for this wallet is no longer active."
          : "Wallet connected. Request beta access or redeem an access code.";
    setStatusMessage({ kind: "info", text: message });
  }

  async function submitAccessRequest(session: WalletSession) {
    const walletAddress = await authenticateWallet(session);
    const result = await requestBetaAccess(walletAddress);
    setStatusMessage({ kind: "success", text: result.message });
    toast.success(result.message);
  }

  async function redeemAccessCode(session: WalletSession) {
    if (!accessCode) {
      setCodeOpen(true);
      setStatusMessage({
        kind: "error",
        text: "Enter an access code before redeeming.",
      });
      return;
    }

    const walletAddress = await authenticateWallet(session);
    const result = await redeemBetaAccessCode({ code: accessCode, walletAddress });

    if (result.hasAccess && result.status === "approved") {
      toast.success("Access code redeemed.");
      onEnterLevel0();
      return;
    }

    setStatusMessage({
      kind: "info",
      text: "Access code received, but this wallet is not approved yet.",
    });
  }

  async function runBetaAction(
    action: PendingBetaAction,
    session = wallet
  ) {
    setPendingAction(action);

    if (!session) {
      setWalletPickerOpen(true);
      return;
    }

    setIsBusy(true);
    setStatusMessage(null);
    try {
      if (action === "enter") {
        await checkAccess(session);
      } else if (action === "request") {
        await submitAccessRequest(session);
      } else {
        await redeemAccessCode(session);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusMessage({ kind: "error", text: message });
      toast.error(message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleConnectorSelect(connectorId: string) {
    setIsBusy(true);
    setStatusMessage(null);
    try {
      const session = await connect(connectorId);
      setWalletPickerOpen(false);
      await runBetaAction(pendingAction, session);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusMessage({ kind: "error", text: message });
      toast.error(message);
      setIsBusy(false);
    }
  }

  function openWalletPicker(action: PendingBetaAction) {
    if (wallet) {
      void runBetaAction(action, wallet);
      return;
    }

    setPendingAction(action);
    setStatusMessage(null);

    if (connectors.length === 1) {
      void handleConnectorSelect(connectors[0].id);
      return;
    }

    setWalletPickerOpen(true);
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
            <button
              type="button"
              onClick={() => openWalletPicker("enter")}
              disabled={isBusy || status === "connecting"}
              className="inline-flex min-h-11 w-[min(100%,300px)] items-center justify-center gap-2 rounded-lg border border-[#9945ff]/35 bg-[#9945ff] px-4 text-sm font-semibold text-white shadow-[0_14px_38px_-24px_rgba(153,69,255,0.9)] transition hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
            >
              <Wallet className="h-4 w-4" />
              {isBusy && pendingAction === "enter" ? "Checking Access..." : "Connect Wallet"}
            </button>
            <button
              type="button"
              onClick={() => openWalletPicker("request")}
              disabled={isBusy || status === "connecting"}
              className="inline-flex min-h-10 w-[min(100%,300px)] items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-zinc-300 transition hover:border-[#14f195]/25 hover:bg-white/[0.065] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
            >
              <Ticket className="h-4 w-4 text-[#8fffd0]" />
              {isBusy && pendingAction === "request"
                ? "Requesting..."
                : "Request Beta Access"}
            </button>

            {walletPickerOpen ? (
              <div className="w-[min(100%,300px)] rounded-xl border border-white/10 bg-black/35 p-2">
                <p className="px-2 pb-2 text-xs text-zinc-500">Choose a wallet</p>
                <div className="space-y-1">
                  {connectors.map((connector) => (
                    <button
                      key={connector.id}
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleConnectorSelect(connector.id)}
                      className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-zinc-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-white/[0.06] text-[10px] font-semibold text-[#8fffd0]">
                        {connector.name.slice(0, 1).toUpperCase()}
                      </span>
                      {connector.name}
                    </button>
                  ))}
                  {connectors.length === 0 ? (
                    <p className="px-2 py-2 text-sm text-zinc-500">
                      No Solana wallet detected.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {statusMessage ? (
            <p
              className={`mx-auto mt-4 max-w-[300px] text-center text-sm leading-6 ${
                statusMessage.kind === "error"
                  ? "text-red-300"
                  : statusMessage.kind === "success"
                    ? "text-[#8fffd0]"
                    : "text-zinc-400"
              }`}
            >
              {statusMessage.text}
            </p>
          ) : null}

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
                  void runBetaAction("redeem");
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

          <div className="mt-7 flex items-center justify-center gap-2 border-t border-white/10 pt-5 text-xs text-zinc-500">
            <ShieldCheck className="h-4 w-4" />
            Devnet beta build. Training state may change during testing.
          </div>
        </div>
      </section>
    </main>
  );
}
