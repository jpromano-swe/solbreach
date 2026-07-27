"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Check, Pencil, Search, X } from "lucide-react";
import {
  isSpecialBadge,
  type UserBadge,
  type UserBadgesSummary,
} from "../lib/badges";
import {
  resolveProfileCertificateImage,
  type ProfileCertificate,
  type ProfileCertificatesSummary,
} from "../lib/certificates/profile-certificates";
import { SkeletonLine, compactAddress } from "./level-ui";

export type ProfileLevelId = "level0" | "level1" | "level2" | "level3";

type CertificateDetails = {
  image: string;
  lockedImage?: string;
  levelLabel: string;
  rarity: "Common" | "Uncommon" | "Rare";
  title: string;
  vulnerabilityFamily: string;
};
type ProfileFilter = "showcase" | "all" | "badges" | "certificates";
type AchievementItem = {
  id: string;
  image: string;
  isComplete: boolean;
  label: string;
  meta: string;
  title: string;
  type: "badge" | "certificate";
};

const PROFILE_LEVEL_NUMBERS = [1, 2, 3] as const;
const DEFAULT_PROFILE_IMAGES = Array.from(
  { length: 10 },
  (_, index) => `/default_user/image-${index + 1}.png`
);
const LEVEL_CERTIFICATE_DETAILS: Record<0 | 1 | 2 | 3, CertificateDetails> = {
  0: {
    image: "/nfts/solbreach-level-0-hello-solbreach.png",
    lockedImage: "/nfts/locked-certification.png",
    levelLabel: "Level 0",
    rarity: "Common",
    title: "Hello SolBreach",
    vulnerabilityFamily: "Warmup",
  },
  1: {
    image: "/nfts/level-1-nobg.png",
    lockedImage: "/nfts/locked-certification.png",
    levelLabel: "Level 1",
    rarity: "Common",
    title: "The Illusionist",
    vulnerabilityFamily: "Account Substitution",
  },
  2: {
    image: "/nfts/solbreach-level-2-identity-thief.png",
    lockedImage: "/nfts/locked-certification.png",
    levelLabel: "Level 2",
    rarity: "Common",
    title: "Identity Thief",
    vulnerabilityFamily: "Static PDA Authority",
  },
  3: {
    image: "/nfts/solbreach-level-3-trojan-horse.png",
    lockedImage: "/nfts/locked-certification.png",
    levelLabel: "Level 3",
    rarity: "Uncommon",
    title: "The Trojan Horse",
    vulnerabilityFamily: "Delegated CPI",
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
  const [activeFilter, setActiveFilter] = useState<ProfileFilter>("showcase");
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isShowcaseEditorOpen, setIsShowcaseEditorOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [availableForWork, setAvailableForWork] = useState(false);
  const [selectedShowcaseIds, setSelectedShowcaseIds] = useState<string[]>([]);
  const mintedCount =
    certificateSummary?.minted ??
    displayCertificates.filter((certificate) => certificate.minted).length;
  const displayName =
    profileName.trim() || (address ? compactAddress(address, 4, 4) : "No wallet");
  const profileImageSrc = useMemo(() => getDefaultProfileImage(address), [address]);
  const allBadgeItems = useMemo(
    () => [...specialBadges, ...coreBadges].map(badgeToAchievement),
    [coreBadges, specialBadges]
  );
  const certificateItems = useMemo(
    () => displayCertificates.map(certificateToAchievement),
    [displayCertificates]
  );
  const completedItems = useMemo(
    () =>
      [...allBadgeItems, ...certificateItems].filter((item) => item.isComplete),
    [allBadgeItems, certificateItems]
  );
  const showcaseItems = useMemo(() => {
    const selected = selectedShowcaseIds
      .map((id) => completedItems.find((item) => item.id === id))
      .filter((item): item is AchievementItem => Boolean(item));

    return selected.length > 0 ? selected : completedItems.slice(0, 4);
  }, [completedItems, selectedShowcaseIds]);

  return (
    <div className="relative overflow-hidden rounded-[34px] border border-border bg-card/95 shadow-[0_32px_100px_-70px_rgba(0,0,0,0.45)]">
      <div className="relative border-b border-border bg-[radial-gradient(circle_at_18%_10%,rgba(153,69,255,0.36),transparent_32%),linear-gradient(120deg,rgba(45,10,64,0.94),rgba(9,7,18,0.96)_52%,rgba(20,241,149,0.16))] px-5 pb-5 pt-8 sm:px-7 sm:pt-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border border-white/12 bg-black/30 shadow-[0_20px_60px_-35px_rgba(153,69,255,0.9)]">
              <Image
                src={profileImageSrc}
                alt="SolBreach profile avatar"
                width={96}
                height={96}
                className="h-24 w-24 rounded-full object-cover"
                priority
              />
            </div>
            <div className="pt-1 sm:-mt-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
                  {displayName}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#14f195]/50 bg-black/25 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#13071d]"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit Profile
                </button>
              </div>
              {profileBio ? (
                <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-zinc-300">
                  {profileBio}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-zinc-400">
                <span>Total items: {completedItems.length}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-left sm:text-right lg:justify-end">
            <ProfileMetric
              label="Badges"
              value={`${badgeSummary?.earned ?? badges?.filter((badge) => badge.earned).length ?? 0}/${badgeSummary?.total ?? badges?.length ?? 4}`}
            />
            <ProfileMetric
              label="Certificates"
              value={`${mintedCount}/${PROFILE_LEVEL_NUMBERS.length}`}
            />
          </div>
        </div>
      </div>

      <div className="space-y-7 p-5 sm:p-7">
        {!address ? (
          <div className="rounded-[24px] border border-dashed border-border bg-background/60 px-6 py-10 text-center">
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
            <ProfileFilterBar
              activeFilter={activeFilter}
              onChange={setActiveFilter}
            />

            {activeFilter === "showcase" ? (
              <ShowcaseSection
                completedItems={completedItems}
                items={showcaseItems}
                onEdit={() => setIsShowcaseEditorOpen(true)}
              />
            ) : activeFilter === "all" ? (
              <div className="space-y-8">
                <ProfileBadgesSection
                  badges={specialBadges}
                  emptyCopy="Special rewards for events, cohorts, and milestone achievements will appear here."
                  isLoading={Boolean(isBadgeLoading)}
                  title="Special Rewards"
                />
                <ProfileBadgesSection
                  badges={coreBadges}
                  isLoading={Boolean(isBadgeLoading)}
                  title="Badges"
                />
                <CertificatesSection
                  certificates={displayCertificates}
                  getExplorerUrl={getExplorerUrl}
                  isLoading={isLoading}
                  onSelectLevel={onSelectLevel}
                />
              </div>
            ) : activeFilter === "badges" ? (
              <div className="space-y-8">
                <ProfileBadgesSection
                  badges={specialBadges}
                  emptyCopy="Special rewards for events, cohorts, and milestone achievements will appear here."
                  isLoading={Boolean(isBadgeLoading)}
                  title="Special Rewards"
                />
                <ProfileBadgesSection
                  badges={coreBadges}
                  isLoading={Boolean(isBadgeLoading)}
                  title="Badges"
                />
              </div>
            ) : (
              <CertificatesSection
                certificates={displayCertificates}
                getExplorerUrl={getExplorerUrl}
                isLoading={isLoading}
                onSelectLevel={onSelectLevel}
              />
            )}
          </>
        )}
      </div>

      {isEditProfileOpen ? (
        <EditProfileDialog
          address={address}
          availableForWork={availableForWork}
          bio={profileBio}
          email={profileEmail}
          profileImageSrc={profileImageSrc}
          username={profileName}
          onClose={() => setIsEditProfileOpen(false)}
          onSave={(nextProfile) => {
            setProfileName(nextProfile.username);
            setProfileBio(nextProfile.bio);
            setProfileEmail(nextProfile.email);
            setAvailableForWork(nextProfile.availableForWork);
            setIsEditProfileOpen(false);
          }}
        />
      ) : null}

      {isShowcaseEditorOpen ? (
        <ShowcaseEditorDialog
          address={address}
          items={completedItems}
          selectedIds={selectedShowcaseIds}
          onClose={() => setIsShowcaseEditorOpen(false)}
          onSave={(ids) => {
            setSelectedShowcaseIds(ids);
            setIsShowcaseEditorOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function ProfileFilterBar({
  activeFilter,
  onChange,
}: {
  activeFilter: ProfileFilter;
  onChange: (filter: ProfileFilter) => void;
}) {
  const filters: { id: ProfileFilter; label: string }[] = [
    { id: "showcase", label: "Showcase" },
    { id: "all", label: "Show All" },
    { id: "badges", label: "Badges" },
    { id: "certificates", label: "Certificates" },
  ];

  return (
    <div className="border-b border-border">
      <div className="flex flex-wrap gap-6">
        {filters.map((filter) => {
          const active = filter.id === activeFilter;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onChange(filter.id)}
              className={`relative min-h-10 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                active ? "text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {filter.label}
              {active ? (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#9945ff]" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-white">
        {value}
      </p>
    </div>
  );
}

function ShowcaseSection({
  completedItems,
  items,
  onEdit,
}: {
  completedItems: AchievementItem[];
  items: AchievementItem[];
  onEdit: () => void;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          description="A compact display of the achievements you want to highlight first."
          title="Showcase"
        />
        <button
          type="button"
          onClick={onEdit}
          disabled={completedItems.length === 0}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Edit Showcase
        </button>
      </div>

      {items.length > 0 ? (
        <div className="mt-5 rounded-[30px] border border-border bg-background/70 p-4">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <AchievementShowcaseCard item={item} key={item.id} />
          ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-[28px] border border-dashed border-border bg-background/60 px-6 py-10 text-center text-sm text-muted">
          Complete a module to add achievements to your showcase.
        </div>
      )}
    </section>
  );
}

function AchievementShowcaseCard({ item }: { item: AchievementItem }) {
  return (
    <article className="group rounded-[22px] p-4 transition-colors hover:bg-white/[0.035]">
      <div className="flex items-start gap-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
          <Image
            src={item.image}
            alt={`${item.title} achievement`}
            width={112}
            height={112}
            className={`h-[92%] w-[92%] object-contain transition-transform duration-150 motion-safe:group-hover:-translate-y-0.5 ${
              item.isComplete ? "" : "opacity-45 grayscale"
            }`}
            sizes="5rem"
          />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b88cff]">
            {item.type === "badge" ? "Badge" : "Certificate"}
          </p>
          <h4 className="mt-2 truncate text-lg font-semibold tracking-[-0.04em]">
            {item.title}
          </h4>
          <p className="mt-1 text-sm leading-5 text-muted">{item.label}</p>
          <p className="mt-3 text-xs font-semibold text-zinc-500">{item.meta}</p>
        </div>
      </div>
    </article>
  );
}

function CertificatesSection({
  certificates,
  getExplorerUrl,
  isLoading,
  onSelectLevel,
}: {
  certificates: ProfileCertificate[];
  getExplorerUrl: (path: string) => string;
  isLoading: boolean;
  onSelectLevel: (level: ProfileLevelId) => void;
}) {
  return (
    <section>
      <SectionHeading
        description="Certificates mark completed learning milestones and sit alongside your badge collection."
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
          {certificates.map((certificate) => (
            <CertificateCard
              key={certificate.certificateId}
              certificate={certificate}
              detail={LEVEL_CERTIFICATE_DETAILS[certificate.level]}
              getExplorerUrl={getExplorerUrl}
              onOpenLevel={() => {
                onSelectLevel(`level${certificate.level}` as ProfileLevelId);
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EditProfileDialog({
  address,
  availableForWork,
  bio,
  email,
  onClose,
  onSave,
  profileImageSrc,
  username,
}: {
  address?: string;
  availableForWork: boolean;
  bio: string;
  email: string;
  onClose: () => void;
  onSave: (profile: {
    availableForWork: boolean;
    bio: string;
    email: string;
    username: string;
  }) => void;
  profileImageSrc: string;
  username: string;
}) {
  const [draftUsername, setDraftUsername] = useState(username);
  const [draftBio, setDraftBio] = useState(bio);
  const [draftEmail, setDraftEmail] = useState(email);
  const [draftAvailableForWork, setDraftAvailableForWork] =
    useState(availableForWork);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/72 px-4 py-8 backdrop-blur-md">
      <section className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0714] shadow-[0_30px_120px_-55px_rgba(153,69,255,0.9)]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <h3 className="text-xl font-semibold tracking-[-0.04em]">
            Edit Profile
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195]"
            aria-label="Close profile editor"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <label className="block">
            <span className="text-sm font-semibold text-foreground">
              Username
            </span>
            <input
              value={draftUsername}
              onChange={(event) => setDraftUsername(event.target.value)}
              placeholder="Add Username"
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.07] px-4 text-sm text-foreground outline-none transition-colors placeholder:text-zinc-500 focus:border-[#9945ff]/70"
            />
            <span className="mt-2 block text-xs text-[#facc15]">
              Note: Username is for display purposes inside SolBreach.
            </span>
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Profile Picture
              </p>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-black/35">
                  <Image
                    src={profileImageSrc}
                    alt="Profile avatar preview"
                    width={76}
                    height={76}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-muted"
                  aria-label="Edit profile picture"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">
                Banner Image
              </p>
              <div className="mt-3 flex h-24 items-center justify-end rounded-xl border border-white/10 bg-[radial-gradient(circle_at_70%_15%,rgba(20,241,149,0.22),transparent_35%),linear-gradient(135deg,rgba(153,69,255,0.38),rgba(9,7,18,0.94))] p-3">
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-300"
                  aria-label="Edit banner"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-foreground">Bio</span>
            <textarea
              value={draftBio}
              onChange={(event) => setDraftBio(event.target.value)}
              className="mt-2 min-h-28 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-zinc-500 focus:border-[#9945ff]/70"
              placeholder="Add a short profile bio"
            />
          </label>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Available for Work
              </p>
              <p className="text-xs text-muted">
                Show availability on your SolBreach profile.
              </p>
            </div>
            <button
              type="button"
              aria-pressed={draftAvailableForWork}
              onClick={() =>
                setDraftAvailableForWork((current) => !current)
              }
              className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
                draftAvailableForWork
                  ? "border-[#14f195]/50 bg-[#14f195]/25"
                  : "border-white/10 bg-white/10"
              }`}
            >
              <span
                className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                  draftAvailableForWork
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-foreground">Email</span>
            <input
              value={draftEmail}
              onChange={(event) => setDraftEmail(event.target.value)}
              placeholder="Add Email"
              type="email"
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.07] px-4 text-sm text-foreground outline-none transition-colors placeholder:text-zinc-500 focus:border-[#9945ff]/70"
            />
            <span className="mt-2 block text-xs text-muted">
              Used only for SolBreach notifications.
            </span>
          </label>

          <div>
            <p className="text-sm font-semibold text-foreground">
              Social Connections
            </p>
            <p className="mt-1 text-xs text-muted">
              Social links are displayed on your profile.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="min-h-10 rounded-xl border border-white/10 bg-white/[0.07] px-4 text-sm font-semibold text-foreground"
              >
                Link X/Twitter
              </button>
              <button
                type="button"
                className="min-h-10 rounded-xl border border-white/10 bg-white/[0.07] px-4 text-sm font-semibold text-foreground"
              >
                Link Discord
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
            <div>
              <p className="text-sm font-semibold text-foreground">User ID</p>
              <p className="mt-1 text-xs text-muted">
                {address ? compactAddress(address, 6, 6) : "No wallet attached"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-10 rounded-xl border border-white/10 bg-white/[0.07] px-5 text-sm font-semibold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  onSave({
                    availableForWork: draftAvailableForWork,
                    bio: draftBio,
                    email: draftEmail,
                    username: draftUsername,
                  })
                }
                className="min-h-10 rounded-xl bg-[#9945ff] px-5 text-sm font-semibold text-white shadow-[0_14px_36px_-20px_rgba(153,69,255,0.95)]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ShowcaseEditorDialog({
  address,
  items,
  onClose,
  onSave,
  selectedIds,
}: {
  address?: string;
  items: AchievementItem[];
  onClose: () => void;
  onSave: (ids: string[]) => void;
  selectedIds: string[];
}) {
  const [draftSelectedIds, setDraftSelectedIds] = useState<string[]>(selectedIds);
  const selectedItems = draftSelectedIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is AchievementItem => Boolean(item));

  const toggleItem = (id: string) => {
    setDraftSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((itemId) => itemId !== id);
      }

      return current.length >= 4 ? current : [...current, id];
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/72 px-4 py-8 backdrop-blur-md">
      <section className="w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0714] shadow-[0_30px_120px_-55px_rgba(153,69,255,0.9)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <h3 className="text-2xl font-semibold tracking-[-0.05em]">
              Edit Showcase
            </h3>
            <p className="mt-1 text-sm text-muted">
              Choose up to 4 achievements from this wallet.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195]"
            aria-label="Close showcase editor"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid min-h-[420px] lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-muted">
              <Search className="h-4 w-4" aria-hidden="true" />
              <span>{address ? compactAddress(address) : "No wallet"} achievements</span>
            </div>

            {items.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {items.map((item) => {
                  const selected = draftSelectedIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                        selected
                          ? "border-[#14f195]/60 bg-[#14f195]/10"
                          : "border-white/10 bg-white/[0.025] hover:bg-white/[0.05]"
                      }`}
                    >
                      <Image
                        src={item.image}
                        alt={`${item.title} achievement`}
                        width={52}
                        height={52}
                        className="h-12 w-12 object-contain"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {item.title}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {item.meta}
                        </span>
                      </span>
                      {selected ? (
                        <Check className="h-4 w-4 text-[#14f195]" aria-hidden="true" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[300px] items-center justify-center text-center text-sm text-muted">
                No completed achievements available yet.
              </div>
            )}
          </div>

          <aside className="flex flex-col justify-center p-5">
            {selectedItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {selectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.025] p-3 text-center"
                  >
                    <Image
                      src={item.image}
                      alt={`${item.title} selected achievement`}
                      width={72}
                      height={72}
                      className="mx-auto h-16 w-16 object-contain"
                    />
                    <p className="mt-2 truncate text-xs font-semibold text-foreground">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted">
                Selected achievements will appear here.
              </p>
            )}
          </aside>
        </div>

        <div className="flex justify-center gap-3 border-t border-white/10 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 w-52 rounded-xl border border-white/10 bg-white/[0.07] px-5 text-sm font-semibold text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(draftSelectedIds)}
            className="min-h-10 w-52 rounded-xl bg-[#9945ff] px-5 text-sm font-semibold text-white shadow-[0_14px_36px_-20px_rgba(153,69,255,0.95)]"
          >
            Save Showcase
          </button>
        </div>
      </section>
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
  const isSpecialRewards = title === "Special Rewards";

  return (
    <section>
      <SectionHeading
        description={
          isSpecialRewards
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

function badgeToAchievement(badge: UserBadge): AchievementItem {
  return {
    id: `badge:${badge.slug}`,
    image: badge.earned ? badge.image : "/badges/badge-locked.png",
    isComplete: badge.earned,
    label: getBadgeShortLabel(badge),
    meta: isSpecialBadge(badge)
      ? "Special Reward"
      : badge.levelOrder
        ? `Level ${badge.levelOrder}`
        : "Badge",
    title: badge.title,
    type: "badge",
  };
}

function certificateToAchievement(
  certificate: ProfileCertificate
): AchievementItem {
  const detail = LEVEL_CERTIFICATE_DETAILS[certificate.level];

  return {
    id: `certificate:${certificate.certificateId}`,
    image: resolveProfileCertificateImage(certificate),
    isComplete: certificate.minted,
    label: detail.title,
    meta: `${detail.levelLabel} Certificate`,
    title: detail.title,
    type: "certificate",
  };
}

function getDefaultProfileImage(address?: string) {
  if (!address) {
    return DEFAULT_PROFILE_IMAGES[0];
  }

  let hash = 0;
  for (let index = 0; index < address.length; index += 1) {
    hash = (hash * 31 + address.charCodeAt(index)) >>> 0;
  }

  return DEFAULT_PROFILE_IMAGES[hash % DEFAULT_PROFILE_IMAGES.length];
}

function buildProfileCertificates(certificates?: ProfileCertificate[]) {
  if (certificates?.length) {
    const byLevel = new Map<1 | 2 | 3, ProfileCertificate>();

    for (const certificate of certificates) {
      if (!PROFILE_LEVEL_NUMBERS.includes(certificate.level)) continue;

      const current = byLevel.get(certificate.level);
      if (
        !current ||
        (certificate.minted && !current.minted) ||
        (certificate.minted === current.minted &&
          certificate.mintedAt &&
          (!current.mintedAt || certificate.mintedAt > current.mintedAt))
      ) {
        byLevel.set(certificate.level, certificate);
      }
    }

    return PROFILE_LEVEL_NUMBERS.map((level) => byLevel.get(level)).filter(
      (certificate): certificate is ProfileCertificate => Boolean(certificate)
    );
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
  const imageScale = getBadgeImageScaleClass(badge);
  const imageTone = badge.earned
    ? "drop-shadow-[0_14px_24px_rgba(0,0,0,0.34)]"
    : "opacity-50 grayscale drop-shadow-[0_10px_20px_rgba(0,0,0,0.28)]";

  return (
    <article
      aria-label={`${getBadgeShortLabel(badge)} badge ${
        badge.earned ? "earned" : "locked"
      }`}
      className="group flex flex-col items-center text-center"
      title={badge.title}
    >
      <div className="relative flex h-28 w-28 items-center justify-center transition-transform duration-150 ease-out motion-safe:group-hover:-translate-y-1 sm:h-32 sm:w-32">
        <span
          aria-hidden="true"
          className={`absolute inset-2 rounded-full blur-2xl transition-opacity duration-150 ${
            badge.earned
              ? "bg-[radial-gradient(circle,rgba(153,69,255,0.18),rgba(20,241,149,0.06)_46%,transparent_72%)] opacity-80 group-hover:opacity-100"
              : "bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_70%)] opacity-55"
          }`}
        />
        <span
          aria-hidden="true"
          className={`absolute inset-5 rounded-full blur-xl ${
            badge.earned
              ? "bg-black/25"
              : "bg-black/15"
          }`}
        />
        <Image
          src={imageSrc}
          alt={`${badge.title} badge`}
          width={160}
          height={160}
          className={`relative h-[92%] w-[92%] object-contain ${imageScale} ${imageTone}`}
          sizes="(min-width: 1280px) 9rem, 7rem"
          priority
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

function getBadgeImageScaleClass(badge: UserBadge) {
  if (!badge.earned) return "";

  switch (badge.slug) {
    case "power-user":
      return "scale-[1.28]";
    case "level-3-trojan-horse":
      return "scale-[1.14]";
    default:
      return "";
  }
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
  const imageSrc = resolveProfileCertificateImage(certificate);
  const mintedDate = certificate.mintedAt
    ? new Date(certificate.mintedAt).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;
  const href = certificate.minted && certificate.assetId
    ? getExplorerUrl(`/address/${certificate.assetId}`)
    : undefined;

  return (
    <article className="group overflow-hidden rounded-[18px] border border-white/10 bg-[#111019] p-2.5 shadow-[0_22px_70px_-50px_rgba(0,0,0,0.85)] transition-colors hover:border-[#9945ff]/40">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          aria-label={`Open ${detail.title} certificate asset`}
        >
          <CertificateImage
            imageSrc={imageSrc}
            title={detail.title}
            minted={certificate.minted}
          />
        </a>
      ) : (
        <button
          type="button"
          onClick={onOpenLevel}
          className="block w-full text-left"
          aria-label={`Open ${detail.title} level`}
        >
          <CertificateImage
            imageSrc={imageSrc}
            title={detail.title}
            minted={certificate.minted}
          />
        </button>
      )}

      <div className="px-1.5 pb-2 pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold tracking-[-0.03em] text-white">
            #{certificate.certificateNumber}
          </p>
          <span className={getCertificateRarityClass(detail.rarity)}>
            {detail.rarity}
          </span>
        </div>

        <div className="mt-2 min-h-[3.45rem]">
          <h3 className="text-base font-semibold leading-5 tracking-[-0.04em] text-white">
            {detail.vulnerabilityFamily}
          </h3>
          <p className="mt-1 text-sm leading-5 text-zinc-500">{detail.title}</p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-zinc-500">
          <span>{detail.levelLabel}</span>
          <span>
            {certificate.minted
              ? `Minted ${mintedDate ?? "recently"}`
              : isClaimable
                ? "Ready to mint"
                : "Locked"}
          </span>
        </div>
      </div>
    </article>
  );
}

function CertificateImage({
  imageSrc,
  minted,
  title,
}: {
  imageSrc: string;
  minted: boolean;
  title: string;
}) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-[14px] bg-black/30">
      <Image
        src={imageSrc}
        alt={`${title} certificate art`}
        fill
        className={`object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.025] ${
          minted ? "" : "opacity-55 grayscale"
        }`}
        sizes="(min-width: 1280px) 18vw, (min-width: 768px) 30vw, 86vw"
        priority={minted}
      />
    </div>
  );
}

function getCertificateRarityClass(rarity: CertificateDetails["rarity"]) {
  const base =
    "rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]";

  if (rarity === "Rare") {
    return `${base} bg-[#14f195]/12 text-[#14f195]`;
  }

  if (rarity === "Uncommon") {
    return `${base} bg-[#9945ff]/16 text-[#c39cff]`;
  }

  return `${base} bg-white/[0.07] text-zinc-400`;
}
