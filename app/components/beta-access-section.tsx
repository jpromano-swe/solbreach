"use client";

import Image from "next/image";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  getBetaAccessStatus,
  redeemBetaAccessCode,
  requestBetaAccess,
} from "../lib/beta-access";
import { trackAnalyticsEvent } from "../lib/analytics";
import { ensureBackendWalletAuth } from "../lib/levels/level1-backend";
import { useWallet } from "../lib/wallet/context";
import { WalletButton } from "./wallet-button";

function sanitizeAccessCode(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

type PendingBetaAction = "request" | "redeem";
type StatusKind = "error" | "info" | "success" | "warning";
type BetaContactMethod = "email" | "telegram";
type BetaAccessForm = "redeem" | "request";

const BETA_ACCESS_REQUESTS_OPEN = false;
const WALLET_NOT_REGISTERED_MESSAGE = "Wallet not registered";

function getBetaAccessErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return /^(404\s+)?not found\.?$/i.test(message.trim())
    ? WALLET_NOT_REGISTERED_MESSAGE
    : message;
}

export function BetaAccessSection({
  onEnterLevel1,
}: {
  onEnterLevel1: () => void;
}) {
  const { wallet } = useWallet();
  const [accessCode, setAccessCode] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [pendingAction, setPendingAction] =
    useState<PendingBetaAction>("redeem");
  const [activeForm, setActiveForm] = useState<BetaAccessForm>("redeem");
  const [contactMethod, setContactMethod] =
    useState<BetaContactMethod>("email");
  const [contactValue, setContactValue] = useState("");
  const [statusMessage, setStatusMessage] = useState<{
    kind: StatusKind;
    text: string;
  } | null>(null);
  const [needsAccessAction, setNeedsAccessAction] = useState(false);
  const walletAddress = wallet?.account.address;

  useEffect(() => {
    trackAnalyticsEvent({
      eventName: "beta_page_viewed",
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function verifyConnectedWalletAccess() {
      await Promise.resolve();

      if (cancelled) {
        return;
      }

      if (!wallet) {
        setNeedsAccessAction(false);
        setActiveForm("redeem");
        setIsCheckingAccess(false);
        setStatusMessage(null);
        return;
      }

      setIsCheckingAccess(true);
      setNeedsAccessAction(false);
      setActiveForm("redeem");
      setStatusMessage({ kind: "info", text: "Checking wallet access..." });

      try {
        await ensureBackendWalletAuth(wallet);
        const result = await getBetaAccessStatus(wallet.account.address);

        if (cancelled) {
          return;
        }

        if (result.hasAccess && result.status === "approved") {
          trackAnalyticsEvent({
            eventName: "beta_app_entered",
            properties: {
              accessSource: result.accessSource,
              status: result.status,
            },
            walletAddress: wallet.account.address,
          });
          toast.success("Beta access confirmed.");
          onEnterLevel1();
          return;
        }

        setNeedsAccessAction(true);
        setStatusMessage({
          kind:
            result.status === "none"
              ? "error"
              : result.status === "revoked"
                ? "warning"
                : "info",
          text:
            result.status === "pending"
              ? "Your beta request is pending for this wallet."
              : result.status === "revoked"
                ? "Beta access for this wallet is no longer active."
                : WALLET_NOT_REGISTERED_MESSAGE,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = getBetaAccessErrorMessage(error);
        setNeedsAccessAction(true);
        setActiveForm("redeem");
        setStatusMessage({ kind: "error", text: message });
        toast.error(message);
      } finally {
        if (!cancelled) {
          setIsCheckingAccess(false);
        }
      }
    }

    void verifyConnectedWalletAccess();

    return () => {
      cancelled = true;
    };
  }, [wallet, walletAddress, onEnterLevel1]);

  async function submitAccessRequest() {
    setPendingAction("request");

    if (!wallet) {
      toast.error("Connect wallet first.");
      return;
    }

    const normalizedContact = contactValue.trim();

    if (!normalizedContact) {
      setActiveForm("request");
      setStatusMessage({
        kind: "error",
        text:
          contactMethod === "email"
            ? "Enter an email before requesting access."
            : "Enter a Telegram username before requesting access.",
      });
      return;
    }

    if (contactMethod === "email" && !normalizedContact.includes("@")) {
      setActiveForm("request");
      setStatusMessage({
        kind: "error",
        text: "Enter a valid email address.",
      });
      return;
    }

    setIsBusy(true);
    setStatusMessage(null);
    try {
      await requestBetaAccess(wallet.account.address, normalizedContact);
      setNeedsAccessAction(true);
      setActiveForm("redeem");
      setStatusMessage({ kind: "success", text: "Request received." });
      toast.success("Request received.");
    } catch (error) {
      const message = getBetaAccessErrorMessage(error);
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
      setStatusMessage({
        kind: "error",
        text: "Enter an access code before redeeming.",
      });
      return;
    }

    setIsBusy(true);
    setStatusMessage(null);
    try {
      const result = await redeemBetaAccessCode({
        code: accessCode,
        walletAddress: wallet.account.address,
      });

      if (result.hasAccess && result.status === "approved") {
        await ensureBackendWalletAuth(wallet, { force: true });
        trackAnalyticsEvent({
          eventName: "beta_app_entered",
          properties: {
            accessSource: result.accessSource,
            status: result.status,
          },
          walletAddress: wallet.account.address,
        });
        toast.success("Access code redeemed.");
        onEnterLevel1();
        return;
      }

      setStatusMessage({
        kind: "info",
        text: "Access code received, but this wallet is not approved yet.",
      });
    } catch (error) {
      const message = getBetaAccessErrorMessage(error);
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
            </p>
          </div>

          <div className="mt-7 flex flex-col items-center gap-3">
            <WalletButton
              className="w-[min(100%,300px)]"
              disconnectedButtonClassName="inline-flex min-h-10 w-full items-center justify-center border-[#9945ff]/35 bg-[#9945ff] px-4 text-sm font-semibold text-white shadow-[0_14px_38px_-24px_rgba(153,69,255,0.9)] hover:bg-[#8b35f6]"
              connectedButtonClassName="min-h-10 w-full justify-center border-white/10 bg-[#17212b] px-4 text-sm font-semibold text-zinc-100 shadow-[0_14px_38px_-24px_rgba(20,241,149,0.45)] hover:bg-[#1b2834]"
            />
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
              wallet && needsAccessAction && !isCheckingAccess
                ? "mt-7 grid-rows-[1fr] opacity-100"
                : "mt-0 grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="min-h-0 overflow-hidden border-t border-white/10 pt-5">
              {activeForm === "redeem" ? (
                <form
                  aria-busy={isBusy && pendingAction === "redeem"}
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void redeemAccessCode();
                  }}
                >
                  <label
                    htmlFor="beta-access-code"
                    className="flex items-center gap-2 text-sm font-medium text-zinc-300"
                  >
                    <KeyRound
                      className="h-4 w-4 text-[#8fffd0]"
                      aria-hidden="true"
                    />
                    Access code
                  </label>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_128px]">
                    <input
                      id="beta-access-code"
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
                      className="min-h-10 rounded-xl border border-white/10 bg-white/[0.045] px-3 font-mono text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#9945ff]/50 focus:ring-2 focus:ring-[#14f195]/35"
                    />
                    <button
                      type="submit"
                      disabled={isBusy || !accessCode}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#9945ff]/35 bg-[#9945ff] px-4 text-sm font-semibold text-white transition hover:bg-[#8b35f6] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
                    >
                      {isBusy && pendingAction === "redeem"
                        ? "Redeeming..."
                        : "Redeem Code"}
                    </button>
                  </div>
                </form>
              ) : (
                <form
                  aria-busy={isBusy && pendingAction === "request"}
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitAccessRequest();
                  }}
                >
                  <label
                    htmlFor="beta-contact-method"
                    className="text-sm font-medium text-zinc-300"
                  >
                    Contact method
                  </label>
                  <select
                    id="beta-contact-method"
                    value={contactMethod}
                    onChange={(event) =>
                      setContactMethod(event.target.value as BetaContactMethod)
                    }
                    className="min-h-10 w-full rounded-xl border border-white/10 bg-white/[0.045] px-3 text-sm text-zinc-200 outline-none transition focus:border-[#9945ff]/50 focus:ring-2 focus:ring-[#14f195]/35"
                  >
                    <option value="email">Email</option>
                    <option value="telegram">Telegram</option>
                  </select>
                  <label htmlFor="beta-contact" className="sr-only">
                    {contactMethod === "email"
                      ? "Email address"
                      : "Telegram username"}
                  </label>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_128px]">
                    <input
                      id="beta-contact"
                      autoComplete={contactMethod === "email" ? "email" : "off"}
                      inputMode={contactMethod === "email" ? "email" : "text"}
                      name="beta-contact"
                      onChange={(event) => setContactValue(event.target.value)}
                      placeholder={
                        contactMethod === "email"
                          ? "you@example.com"
                          : "@telegram"
                      }
                      spellCheck={false}
                      type={contactMethod === "email" ? "email" : "text"}
                      value={contactValue}
                      className="min-h-10 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#9945ff]/50 focus:ring-2 focus:ring-[#14f195]/35"
                    />
                    <button
                      type="submit"
                      disabled={
                        isBusy ||
                        !BETA_ACCESS_REQUESTS_OPEN ||
                        !contactValue.trim()
                      }
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-zinc-400 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
                    >
                      {isBusy && pendingAction === "request"
                        ? "Sending..."
                        : "Submit"}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() =>
                    setActiveForm((form) =>
                      form === "redeem" ? "request" : "redeem"
                    )
                  }
                  disabled={!BETA_ACCESS_REQUESTS_OPEN || isBusy}
                  className="min-h-10 px-2 text-sm font-medium text-zinc-500 underline-offset-4 transition enabled:text-zinc-300 enabled:hover:text-[#b892ff] enabled:hover:underline disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]"
                  title="Beta access requests are currently closed"
                >
                  {activeForm === "redeem"
                    ? "Request Beta Access"
                    : "Redeem an access code"}
                </button>
                {!BETA_ACCESS_REQUESTS_OPEN ? (
                  <p className="text-xs text-zinc-600">
                    Closed beta — invite requests are paused.
                  </p>
                ) : null}
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
  return text;
}
