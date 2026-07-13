"use client";

import Image from "next/image";
import {
  isSpecialBadge,
  type UserBadge,
  type UserBadgesSummary,
} from "../lib/badges";
import {
  resolveProfileCertificateImage,
  resolveProfileCertificateMetadata,
  type ProfileCertificate,
  type ProfileCertificatesSummary,
} from "../lib/certificates/profile-certificates";
import { SkeletonLine, StatusTextRow, compactAddress } from "./level-ui";

export type ProfileLevelId = "level0" | "level1" | "level2" | "level3";

type CertificateDetails = {
  image: string;
  lockedImage?: string;
  levelLabel: string;
  title: string;
};

const PROFILE_LEVEL_NUMBERS = [1, 2, 3] as const;
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
  badges,
  badgeSummary,
  certificates,
  certificateSummary,
  getExplorerUrl,
  isBadgeLoading,
  isLoading,
  onSelectLevel,
}: {
  address?: string;
  badges?: UserBadge[];
  badgeSummary?: UserBadgesSummary | null;
  certificates?: ProfileCertificate[];
  certificateSummary?: ProfileCertificatesSummary | null;
  getExplorerUrl: (path: string) => string;
  isBadgeLoading?: boolean;
  isLoading: boolean;
  onSelectLevel: (level: ProfileLevelId) => void;
}) {
  const coreBadges = (badges ?? []).filter((badge) => !isSpecialBadge(badge));
  const specialBadges = (badges ?? []).filter(isSpecialBadge);
  const displayCertificates = buildProfileCertificates(certificates);
  const mintedCount =
    certificateSummary?.minted ??
    displayCertificates.filter((certificate) => certificate.minted).length;

  return (
    <div className="space-y-8 rounded-[34px] border border-border bg-card/95 p-5 shadow-[0_32px_100px_-70px_rgba(0,0,0,0.45)] sm:p-7">
      <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
            Hacker Profile
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Track your SolBreach progress, collected badges, special rewards,
            and certificates in one place.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
          <MiniStat
            label="Wallet"
            value={address ? "Attached" : "Detached"}
            detail={address ? compactAddress(address) : "Connect to inspect"}
          />
          <MiniStat
            label="Badges"
            value={`${badgeSummary?.earned ?? badges?.filter((badge) => badge.earned).length ?? 0}/${badgeSummary?.total ?? badges?.length ?? 4}`}
            detail="Collected rewards"
          />
          <MiniStat
            label="Certificates"
            value={`${mintedCount}/${PROFILE_LEVEL_NUMBERS.length}`}
            detail="Proof of mastery"
          />
        </div>
      </div>

      {!address ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-border bg-background/60 px-6 py-10 text-center">
          <p className="text-base font-medium tracking-[-0.03em] text-foreground">
            Connect a wallet to inspect your SolBreach profile.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Your profile will show completed modules, badges, and certificates
            for the connected wallet.
          </p>
        </div>
      ) : (
        <>
          <ProfileBadgesSection
            badges={specialBadges}
            emptyCopy="Special badges for events, cohorts, and milestone achievements will appear here."
            isLoading={Boolean(isBadgeLoading)}
            title="Special Badges"
          />
          <ProfileBadgesSection
            badges={coreBadges}
            isLoading={Boolean(isBadgeLoading)}
            title="Badges"
          />
          <section>
            <SectionHeading
              description="Certificates represent completed learning milestones and sit alongside your badge collection."
              title="Certificates"
            />
            {isLoading ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {PROFILE_LEVEL_NUMBERS.map((level) => (
                  <SkeletonLine key={level} className="h-[360px]" />
                ))}
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {displayCertificates.map((certificate) => (
                  <CertificateCard
                    key={certificate.certificateId}
                    certificate={certificate}
                    detail={LEVEL_CERTIFICATE_DETAILS[certificate.level]}
                    getExplorerUrl={getExplorerUrl}
                    onOpenLevel={() => {
                      onSelectLevel(
                        `level${certificate.level}` as ProfileLevelId
                      );
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function ProfileBadgesSection({
  badges,
  emptyCopy,
  isLoading,
  title,
}: {
  badges: UserBadge[];
  emptyCopy?: string;
  isLoading: boolean;
  title: string;
}) {
  return (
    <section>
      <SectionHeading
        description={
          title === "Special Badges"
            ? "Limited rewards for events, cohorts, and milestone achievements."
            : "Badges mark the modules you complete across SolBreach."
        }
        title={title}
      />
      {isLoading ? (
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {[0, 1, 2, 3].map((index) => (
            <div className="space-y-3" key={index}>
              <SkeletonLine className="mx-auto h-24 w-24 rounded-[28px]" />
              <SkeletonLine className="mx-auto h-4 w-24" />
            </div>
          ))}
        </div>
      ) : badges.length > 0 ? (
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {badges.map((badge) => (
            <BadgeCard badge={badge} key={badge.slug} />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[24px] border border-dashed border-border bg-background/60 px-6 py-8 text-sm text-muted">
          {emptyCopy ?? "No badges available yet."}
        </div>
      )}
    </section>
  );
}

function buildProfileCertificates(certificates?: ProfileCertificate[]) {
  if (certificates?.length) {
    return certificates
      .filter((certificate) =>
        PROFILE_LEVEL_NUMBERS.includes(certificate.level)
      )
      .sort((a, b) => a.certificateNumber - b.certificateNumber);
  }

  return PROFILE_LEVEL_NUMBERS.map((level) => ({
    assetId: null,
    certificateId: `solbreach-level-${level}`,
    certificateNumber: level,
    certificatePda: null,
    imageUri: LEVEL_CERTIFICATE_DETAILS[level].image,
    level,
    metadataUri: `/certificates/metadata/level-${level}.json`,
    minted: false,
    mintedAt: null,
    status: "locked",
    title: LEVEL_CERTIFICATE_DETAILS[level].title,
  })) satisfies ProfileCertificate[];
}

function BadgeCard({ badge }: { badge: UserBadge }) {
  const imageSrc = badge.earned ? badge.image : "/badges/badge-locked.png";

  return (
    <article
      aria-label={`${getBadgeShortLabel(badge)} badge ${
        badge.earned ? "earned" : "locked"
      }`}
      className="group flex flex-col items-center text-center"
      title={badge.title}
    >
      <div className="relative flex h-28 w-28 items-center justify-center rounded-[30px] bg-white/[0.015] transition-transform duration-150 ease-out motion-safe:group-hover:-translate-y-1 sm:h-32 sm:w-32">
        <Image
          src={imageSrc}
          alt={`${badge.title} badge`}
          width={160}
          height={160}
          className={`h-[92%] w-[92%] object-contain drop-shadow-[0_18px_34px_rgba(153,69,255,0.2)] ${
            badge.earned ? "" : "opacity-55 grayscale"
          }`}
          sizes="(min-width: 1280px) 9rem, 7rem"
        />
      </div>
      <p
        className={`mt-3 max-w-32 text-sm font-semibold leading-5 tracking-[-0.03em] ${
          badge.earned ? "text-foreground" : "text-muted/45"
        }`}
      >
        {getBadgeShortLabel(badge)}
      </p>
    </article>
  );
}

function getBadgeShortLabel(badge: UserBadge) {
  switch (badge.slug) {
    case "level-1-illusionist":
      return "Account Substitution";
    case "level-2-identity-thief":
      return "Shared Authority";
    case "level-3-trojan-horse":
      return "Delegated CPI";
    case "power-user":
      return "Power User";
    default:
      return badge.title
        .split(/\s+/)
        .slice(0, 4)
        .join(" ");
  }
}

function SectionHeading({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div>
      <h3 className="text-2xl font-semibold tracking-[-0.05em]">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
        {description}
      </p>
    </div>
  );
}

function CertificateCard({
  certificate,
  detail,
  getExplorerUrl,
  onOpenLevel,
}: {
  certificate: ProfileCertificate;
  detail: CertificateDetails;
  getExplorerUrl: (path: string) => string;
  onOpenLevel: () => void;
}) {
  const isClaimable =
    certificate.status === "claimable" || certificate.status === "ready";
  const status = certificate.minted
    ? "Minted"
    : isClaimable
      ? "Ready"
      : "Locked";

  const statusTone = certificate.minted
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : isClaimable
      ? "border-foreground/15 bg-foreground/5 text-foreground"
      : "border-border bg-accent text-muted";
  const imageSrc = resolveProfileCertificateImage(certificate);
  const metadataPath = resolveProfileCertificateMetadata(certificate);

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
            label="Status"
            value={
              certificate.mintedAt
                ? new Date(certificate.mintedAt).toLocaleDateString()
                : status
            }
          />
          <StatusTextRow
            label="Certificate"
            value={certificate.certificateId}
          />
          <StatusTextRow
            label="Asset"
            value={
              certificate.minted && certificate.assetId
                ? compactAddress(certificate.assetId, 4, 4)
                : "Not minted"
            }
          />
        </div>

        <div className="space-y-2 text-sm text-muted">
          {certificate.minted && certificate.assetId ? (
            <a
              href={getExplorerUrl(`/address/${certificate.assetId}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate underline underline-offset-2"
            >
              View cNFT asset
            </a>
          ) : null}
          {certificate.certificatePda ? (
            <a
              href={getExplorerUrl(`/address/${certificate.certificatePda}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate underline underline-offset-2"
            >
              View certificate PDA
            </a>
          ) : null}
          <a
            href={metadataPath}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate underline underline-offset-2"
          >
            View metadata
          </a>
        </div>

        <button
          type="button"
          onClick={onOpenLevel}
          className="min-h-12 w-full rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {certificate.minted
            ? "Open level details"
            : isClaimable
              ? "Open certificate flow"
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
