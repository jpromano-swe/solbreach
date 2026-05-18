"use client";

import Image from "next/image";
import type {
  CertificateCollection,
  LevelCertificateSnapshot,
} from "../lib/certificates/certificate-state";
import { SkeletonLine, StatusTextRow, compactAddress } from "./level-ui";

export type ProfileLevelId = "level0" | "level1" | "level2" | "level3";

type CertificateDetails = {
  image: string;
  lockedImage?: string;
  levelLabel: string;
  title: string;
};

const PROFILE_LEVEL_NUMBERS = [0, 1, 2, 3] as const;
const LEVEL_CERTIFICATE_DETAILS: Record<0 | 1 | 2 | 3, CertificateDetails> = {
  0: {
    image: "/nfts/solbreach-level-0-hello-solbreach.png",
    lockedImage: "/nfts/locked-certification.png",
    levelLabel: "Level 0",
    title: "Hello SolBreach",
  },
  1: {
    image: "/nfts/solbreach-level-1-illusionist.png",
    lockedImage: "/nfts/locked-certification.png",
    levelLabel: "Level 1",
    title: "The Illusionist",
  },
  2: {
    image: "/nfts/solbreach-level-2-identity-thief.png",
    lockedImage: "/nfts/locked-certification.png",
    levelLabel: "Level 2",
    title: "Identity Thief",
  },
  3: {
    image: "/nfts/solbreach-level-3-trojan-horse.png",
    lockedImage: "/nfts/locked-certification.png",
    levelLabel: "Level 3",
    title: "The Trojan Horse",
  },
};

export function ProfileCertificatesSection({
  address,
  certificateState,
  completedLevels,
  getExplorerUrl,
  isLoading,
  onSelectLevel,
}: {
  address?: string;
  certificateState?: CertificateCollection;
  completedLevels?: boolean[];
  getExplorerUrl: (path: string) => string;
  isLoading: boolean;
  onSelectLevel: (level: ProfileLevelId) => void;
}) {
  return (
    <div className="rounded-[34px] border border-border bg-card/95 p-5 shadow-[0_32px_100px_-70px_rgba(0,0,0,0.45)] sm:p-7">
      <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
            Hacker Achievements
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            This gallery shows which level certificates are still locked, which
            ones are claimed on-chain, and which cNFTs have already been minted
            and bound back to the original hacker wallet.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
          <MiniStat
            label="Wallet"
            value={address ? "Attached" : "Detached"}
            detail={address ? compactAddress(address) : "Connect to inspect"}
          />
          <MiniStat
            label="Minted"
            value={
              certificateState
                ? `${Object.values(certificateState).filter((certificate) => certificate.minted).length}/4`
                : "0/4"
            }
            detail="Recorded cNFTs"
          />
          <MiniStat
            label="Cleared"
            value={
              completedLevels
                ? `${completedLevels.filter(Boolean).length}/4`
                : "0/4"
            }
            detail="Challenge progress"
          />
        </div>
      </div>

      {!address ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-border bg-background/60 px-6 py-10 text-center">
          <p className="text-base font-medium tracking-[-0.03em] text-foreground">
            Connect a wallet to inspect your SolBreach profile.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            The certificate gallery is derived from the same wallet-bound PDAs
            used by the exploit board and cNFT mint flow.
          </p>
        </div>
      ) : isLoading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PROFILE_LEVEL_NUMBERS.map((level) => (
            <SkeletonLine key={level} className="h-[360px]" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PROFILE_LEVEL_NUMBERS.map((level) => (
            <CertificateCard
              key={level}
              certificate={certificateState?.[level]}
              completed={Boolean(completedLevels?.[level])}
              detail={LEVEL_CERTIFICATE_DETAILS[level]}
              getExplorerUrl={getExplorerUrl}
              onOpenLevel={() => {
                onSelectLevel(`level${level}` as ProfileLevelId);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CertificateCard({
  certificate,
  completed,
  detail,
  getExplorerUrl,
  onOpenLevel,
}: {
  certificate?: LevelCertificateSnapshot;
  completed: boolean;
  detail: CertificateDetails;
  getExplorerUrl: (path: string) => string;
  onOpenLevel: () => void;
}) {
  const status = certificate?.minted
    ? "Minted"
    : certificate?.exists
      ? "Claimed"
      : completed
        ? "Ready to mint"
        : "Locked";

  const statusTone = certificate?.minted
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : certificate?.exists
      ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : completed
        ? "border-foreground/15 bg-foreground/5 text-foreground"
        : "border-border bg-accent text-muted";
  const imageSrc =
    completed || !detail.lockedImage ? detail.image : detail.lockedImage;

  return (
    <article className="overflow-hidden rounded-[28px] border border-border bg-background/80">
      <div className="relative aspect-[4/5] border-b border-border bg-card/70">
        <Image
          src={imageSrc}
          alt={`${detail.title} certificate art`}
          fill
          className="object-cover"
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 45vw, 92vw"
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4">
          <span className="rounded-full border border-black/10 bg-background/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted shadow-sm backdrop-blur">
            {detail.levelLabel}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] backdrop-blur ${statusTone}`}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
            Certification
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em]">
            {detail.title}
          </h3>
        </div>

        <div className="space-y-3 rounded-[22px] border border-border bg-card/75 p-4">
          <StatusTextRow
            label="Completion"
            value={completed ? "Cleared" : "Not cleared"}
          />
          <StatusTextRow
            label="Certificate"
            value={certificate?.exists ? "Claimed on-chain" : "Not claimed"}
          />
          <StatusTextRow
            label="Asset"
            value={
              certificate?.minted && certificate.assetId
                ? compactAddress(certificate.assetId, 4, 4)
                : "Not minted"
            }
          />
        </div>

        <div className="space-y-2 text-sm text-muted">
          {certificate?.minted && certificate.assetId ? (
            <a
              href={getExplorerUrl(`/address/${certificate.assetId}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate underline underline-offset-2"
            >
              View cNFT asset
            </a>
          ) : null}
          {certificate?.certificatePda ? (
            <a
              href={getExplorerUrl(`/address/${certificate.certificatePda}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate underline underline-offset-2"
            >
              View certificate PDA
            </a>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onOpenLevel}
          className="min-h-12 w-full rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {certificate?.minted
            ? "Open level details"
            : completed
              ? "Open mint flow"
              : "Open level"}
        </button>
      </div>
    </article>
  );
}

function MiniStat({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-border bg-background/70 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold tracking-[-0.03em]">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}
