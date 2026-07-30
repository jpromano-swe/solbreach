"use client";

import {
  Check,
  ChevronDown,
  Copy,
  LogOut,
  Network as NetworkIcon,
  User,
  Wallet as WalletIcon,
} from "lucide-react";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useWallet } from "../lib/wallet/context";
import { ellipsify } from "../lib/explorer";
import { CLUSTERS, useCluster } from "./cluster-context";
import { trackAnalyticsEvent } from "../lib/analytics";
import type { ClusterMoniker } from "../lib/solana-client";

const DEFAULT_PROFILE_IMAGE_COUNT = 10;

function resolveDefaultProfileImage(address?: string) {
  if (!address) return "/default_user/image-1.png";

  let checksum = 0;
  for (const char of address) {
    checksum = (checksum + char.charCodeAt(0)) % DEFAULT_PROFILE_IMAGE_COUNT;
  }

  return `/default_user/image-${checksum + 1}.png`;
}

export function WalletButton({
  buttonClassName = "",
  className = "",
  connectedButtonClassName,
  disconnectedButtonClassName,
  isProfileActive = false,
  onOpenProfile,
  profileDisplayName,
}: {
  buttonClassName?: string;
  className?: string;
  connectedButtonClassName?: string;
  disconnectedButtonClassName?: string;
  isProfileActive?: boolean;
  onOpenProfile?: () => void;
  profileDisplayName?: string;
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
  const walletLabel = address ? ellipsify(address, 4) : "Wallet";
  const userLabel = profileDisplayName?.trim() || walletLabel;
  const hasProfileName = Boolean(profileDisplayName?.trim());
  const secondaryLabel = hasProfileName ? walletLabel : `${cluster} network`;
  const profileImageSrc = resolveDefaultProfileImage(address);

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
        aria-expanded={isOpen}
        className={`group flex min-h-[56px] cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-left shadow-[0_18px_55px_-40px_rgba(0,0,0,0.9)] transition hover:border-white/16 hover:bg-white/[0.065] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          connectedStyles || ""
        }`}
      >
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-sm font-semibold leading-5 text-zinc-100 ${
              hasProfileName ? "" : "font-mono"
            }`}
          >
            {userLabel}
          </span>
          <span
            className={`mt-0.5 block truncate text-xs leading-4 text-zinc-500 ${
              hasProfileName ? "font-mono" : ""
            }`}
          >
            {secondaryLabel}
          </span>
        </span>
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#9945ff,#14f195)] p-px shadow-[0_14px_35px_-22px_rgba(153,69,255,0.9)]">
          <span className="relative h-full w-full overflow-hidden rounded-full bg-black">
            <Image
              src={profileImageSrc}
              alt=""
              fill
              sizes="40px"
              className="object-cover"
            />
          </span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform group-hover:text-zinc-300 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[304px] overflow-hidden rounded-2xl border border-white/10 bg-[#151617]/95 p-2 shadow-[0_24px_70px_-36px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          <div className="mb-2 flex min-h-[64px] items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-3">
            <span className="min-w-0">
              <span
                className={`block truncate text-sm font-semibold leading-5 text-zinc-100 ${
                  hasProfileName ? "" : "font-mono"
                }`}
              >
                {userLabel}
              </span>
              <span
                className={`mt-0.5 block truncate text-xs leading-4 text-zinc-500 ${
                  hasProfileName ? "font-mono" : ""
                }`}
              >
                {secondaryLabel}
              </span>
            </span>
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#9945ff,#14f195)] p-px">
              <span className="relative h-full w-full overflow-hidden rounded-full bg-black">
                <Image
                  src={profileImageSrc}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </span>
            </span>
          </div>

          {onOpenProfile ? (
            <button
              type="button"
              onClick={() => {
                onOpenProfile();
                close();
              }}
              className={`inline-flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] ${
                isProfileActive
                  ? "bg-white text-black"
                  : "text-zinc-100 hover:bg-white/[0.06]"
              }`}
            >
              <User className="h-4 w-4" aria-hidden="true" />
              <span>Profile</span>
            </button>
          ) : null}

          <div className="flex min-h-11 items-center gap-3 px-3 py-2">
            <WalletIcon className="h-4 w-4 shrink-0 text-zinc-300" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-100">Wallet</p>
              <p className="truncate font-mono text-xs text-zinc-500">{address}</p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-zinc-500 transition hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195]"
              aria-label="Copy wallet address"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-[#14f195]" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <label className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-zinc-200">
            <span className="inline-flex items-center gap-3">
              <NetworkIcon className="h-4 w-4 text-zinc-300" aria-hidden="true" />
              Network
            </span>
            <select
              value={cluster}
              onChange={(event) => setCluster(event.target.value as ClusterMoniker)}
              className="max-w-28 cursor-pointer bg-transparent py-1 text-right text-xs font-semibold capitalize text-zinc-400 outline-none transition hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-[#14f195]"
            >
              {CLUSTERS.map((c) => (
                <option key={c} value={c} className="bg-[#111212] text-zinc-100">
                  {c}
                </option>
              ))}
            </select>
          </label>

          <div className="my-2 h-px bg-white/10" />

          <button
            onClick={() => {
              disconnect();
              close();
            }}
            className="inline-flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl bg-red-500/10 px-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/16 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
