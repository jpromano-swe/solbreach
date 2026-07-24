import { applyNgrokBypassHeader } from "./backend/ngrok";
import { SOLBREACH_BACKEND_URL } from "./levels/level1-backend";

export type UserBadgeKind = "level_badge" | "special_badge" | "super_badge" | string;

export type UserBadge = {
  description: string;
  earned: boolean;
  earnedAt: string | null;
  image: string;
  kind: UserBadgeKind;
  levelOrder: number | null;
  metadata: Record<string, unknown>;
  seenAt: string | null;
  slug: string;
  title: string;
};

export type UserBadgesSummary = {
  earned: number;
  powerUserEarned: boolean;
  total: number;
};

export type UserBadgesResponse = {
  badges: UserBadge[];
  summary: UserBadgesSummary;
};

const BADGE_FALLBACKS: UserBadge[] = [
  {
    description: "Complete Level 1 and document the account substitution path.",
    earned: false,
    earnedAt: null,
    image: "/badges/badge-level-1.png",
    kind: "level_badge",
    levelOrder: 1,
    metadata: {},
    seenAt: null,
    slug: "level-1-illusionist",
    title: "The Illusionist",
  },
  {
    description: "Complete Level 2 and prove the shared authority issue.",
    earned: false,
    earnedAt: null,
    image: "/badges/badge-level-2.png",
    kind: "level_badge",
    levelOrder: 2,
    metadata: {},
    seenAt: null,
    slug: "level-2-identity-thief",
    title: "The Identity Thief",
  },
  {
    description: "Complete Level 3 and reason through delegated CPI trust.",
    earned: false,
    earnedAt: null,
    image: "/badges/badge-level-3.png",
    kind: "level_badge",
    levelOrder: 3,
    metadata: {},
    seenAt: null,
    slug: "level-3-trojan-horse",
    title: "The Trojan Horse",
  },
  {
    description:
      "Complete Research Lab 1: Account Substitution and receive the RL1 certificate.",
    earned: false,
    earnedAt: null,
    image: "/badges/badge-poweruser.png",
    kind: "special_badge",
    levelOrder: null,
    metadata: {},
    seenAt: null,
    slug: "power-user",
    title: "Power User",
  },
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeBadge(raw: unknown): UserBadge | null {
  const value = asRecord(raw);
  const slug = stringValue(value.slug);
  if (!slug) return null;

  const fallback = BADGE_FALLBACKS.find((badge) => badge.slug === slug);
  const levelOrder = nullableNumber(value.levelOrder ?? value.level_order);

  return {
    description: stringValue(value.description, fallback?.description ?? ""),
    earned: booleanValue(value.earned),
    earnedAt: nullableString(value.earnedAt ?? value.earned_at),
    image: stringValue(value.image, fallback?.image ?? "/badges/badge-locked.png"),
    kind: stringValue(value.kind, fallback?.kind ?? "level_badge"),
    levelOrder: levelOrder ?? fallback?.levelOrder ?? null,
    metadata: asRecord(value.metadata ?? value.metadata_json),
    seenAt: nullableString(value.seenAt ?? value.seen_at),
    slug,
    title: stringValue(value.title, fallback?.title ?? slug),
  };
}

function mergeBadgeFallbacks(badges: UserBadge[]) {
  const bySlug = new Map(BADGE_FALLBACKS.map((badge) => [badge.slug, badge]));

  for (const badge of badges) {
    bySlug.set(badge.slug, { ...bySlug.get(badge.slug), ...badge });
  }

  return Array.from(bySlug.values());
}

function normalizeSummary(
  raw: unknown,
  badges: UserBadge[]
): UserBadgesSummary {
  const value = asRecord(raw);
  const earned = nullableNumber(value.earned) ?? badges.filter((badge) => badge.earned).length;
  const total = nullableNumber(value.total) ?? badges.length;

  return {
    earned,
    powerUserEarned:
      booleanValue(value.powerUserEarned ?? value.power_user_earned) ||
      Boolean(badges.find((badge) => badge.slug === "power-user")?.earned),
    total,
  };
}

async function badgesRequest<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("authorization", `Bearer ${accessToken}`);

  if (!headers.has("content-type") && options.body) {
    headers.set("content-type", "application/json");
  }

  applyNgrokBypassHeader(headers, SOLBREACH_BACKEND_URL);

  const response = await fetch(`${SOLBREACH_BACKEND_URL}${path}`, {
    ...options,
    headers,
  });
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const errorBody = asRecord(body);
    const error = asRecord(errorBody.error);
    const message =
      stringValue(error.message) ||
      stringValue(error.code) ||
      response.statusText;
    throw new Error(message);
  }

  return body as T;
}

export async function listUserBadges(accessToken: string) {
  const raw = await badgesRequest<unknown>("/api/v1/badges/me", accessToken);
  const value = asRecord(raw);
  const rawBadges = Array.isArray(value.badges) ? value.badges : [];
  const badges = mergeBadgeFallbacks(
    rawBadges.map(normalizeBadge).filter((badge): badge is UserBadge => Boolean(badge))
  );

  return {
    badges,
    summary: normalizeSummary(value.summary, badges),
  } satisfies UserBadgesResponse;
}

export async function markUserBadgeSeen(accessToken: string, slug: string) {
  return badgesRequest<unknown>(
    `/api/v1/badges/${encodeURIComponent(slug)}/seen`,
    accessToken,
    { method: "POST" }
  );
}

export function getLevelBadge(badges: UserBadge[], levelOrder: number) {
  return badges.find((badge) => badge.levelOrder === levelOrder) ?? null;
}

export function isSpecialBadge(badge: UserBadge) {
  return badge.kind === "special_badge" || badge.kind === "super_badge";
}
