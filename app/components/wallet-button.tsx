"use client";

import { Check, ChevronDown, Copy, LogOut, Network, User } from "lucide-react";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useWallet } from "../lib/wallet/context";
import { ellipsify } from "../lib/explorer";
import { CLUSTERS, useCluster } from "./cluster-context";
import { trackAnalyticsEvent } from "../lib/analytics";

export function WalletButton({
  buttonClassName = "",
  className = "",
  connectedButtonClassName,
  disconnectedButtonClassName,
  isProfileActive = false,
  onOpenProfile,
}: {
  buttonClassName?: string;
  className?: string;
  connectedButtonClassName?: string;
  disconnectedButtonClassName?: string;
  isProfileActive?: boolean;
  onOpenProfile?: () => void;
} = {}) {
  const { connectors, connect, disconnect, wallet, status, error } =
    useWallet();

  const { cluster, setCluster } = useCluster();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const connectedStyles = connectedButtonClassName ?? buttonClassName;
  const disconnectedStyles = disconnectedButtonClassName ?? buttonClassName;

  const address = wallet?.account.address;

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status !== "connected") {
    return (
      <div className={`relative ${className}`} ref={ref}>
        <button
          onClick={() => (isOpen ? close() : open())}
          className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-medium shadow-xs transition ${
            disconnectedStyles ||
            "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          Connect Wallet
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border-low bg-card p-3 shadow-lg">
            <p className="mb-2 text-xs font-medium text-muted">
              Choose a wallet
            </p>
            <div className="space-y-1">
              {connectors.map((connector) => (
                <button
                key={connector.id}
                onClick={async () => {
                  try {
                    trackAnalyticsEvent({
                      eventName: "wallet_connect_started",
                      properties: { connectorId: connector.id },
                    });
                    await connect(connector.id);
                    close();
                  } catch {
                      // connection errors are surfaced through context state
                    }
                  }}
                  disabled={status === "connecting"}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition hover:bg-cream disabled:opacity-50 disabled:pointer-events-none"
                >
                  {connector.icon && (
                    <Image
                      src={connector.icon}
                      alt=""
                      width={20}
                      height={20}
                      className="h-5 w-5 rounded"
                      unoptimized
                    />
                  )}
                  <span>{connector.name}</span>
                </button>
              ))}
            </div>
            {status === "connecting" && (
              <p className="mt-2 text-xs text-muted">Connecting...</p>
            )}
            {error != null && (
              <p className="mt-2 text-xs text-destructive">
                {error instanceof Error ? error.message : String(error)}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => (isOpen ? close() : open())}
        className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
          connectedStyles || "border border-border-low bg-card hover:bg-cream"
        }`}
      >
        <span className="h-2 w-2 rounded-full bg-green-500" />
        <span className="font-mono">{ellipsify(address!, 4)}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#111212]/95 p-2 shadow-[0_24px_70px_-36px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Wallet
            </p>
            <p className="mt-2 break-all font-mono text-xs leading-5 text-zinc-200">
              {address}
            </p>
            <button
              onClick={handleCopy}
              className="mt-3 inline-flex min-h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-zinc-200 transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195]"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-[#14f195]" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy wallet"}
            </button>
          </div>

          {onOpenProfile ? (
            <button
              type="button"
              onClick={() => {
                onOpenProfile();
                close();
              }}
              className={`mt-2 inline-flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] ${
                isProfileActive
                  ? "bg-white text-black"
                  : "text-zinc-100 hover:bg-white/[0.06]"
              }`}
            >
              <User className="h-4 w-4" aria-hidden="true" />
              Profile
            </button>
          ) : null}

          <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
            <div className="flex items-center gap-2 px-1 pb-2 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-zinc-500">
              <Network className="h-3.5 w-3.5" aria-hidden="true" />
              Network
            </div>
            <div className="grid grid-cols-2 gap-1">
              {CLUSTERS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCluster(c)}
                  className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] ${
                    c === cluster
                      ? "border border-white/10 bg-white/[0.08] text-white"
                      : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        c === "mainnet"
                          ? "#22c55e"
                          : c === "devnet"
                            ? "#3b82f6"
                            : c === "testnet"
                              ? "#eab308"
                              : "#a3a3a3",
                    }}
                  />
                  {c}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              disconnect();
              close();
            }}
            className="mt-2 inline-flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
