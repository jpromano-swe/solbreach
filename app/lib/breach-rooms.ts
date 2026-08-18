import { applyNgrokBypassHeader } from "./backend/ngrok";
import { SOLBREACH_BACKEND_URL } from "./levels/level1-backend";

export const BREACH_ROOM_1_SLUG = "breach-room-1-vault-bridge";

export type BreachRoomReviewStatus =
  | "pending_review"
  | "accepted"
  | "rejected"
  | "needs_revision";

export type BreachRoomSeverity = "high" | "medium" | "low";

export type BreachRoomSubmission = {
  category: string;
  githubComment?: string | null;
  github_comment?: string | null;
  id: string;
  impact: BreachRoomSeverity;
  likelihood: BreachRoomSeverity;
  prUrl: string | null;
  prComment?: string | null;
  pr_comment?: string | null;
  rejectionReason?: string | null;
  rejection_reason?: string | null;
  reportMarkdown: string;
  reviewedAt: string | null;
  reviewComment?: string | null;
  reviewerComment?: string | null;
  reviewer_comment?: string | null;
  reviewNotes: string | null;
  review_comment?: string | null;
  review_notes?: string | null;
  roomId: string;
  scope: string;
  status: BreachRoomReviewStatus;
  submissionId: string;
  submittedAt: string;
  title: string;
  xpAwarded: number;
};

export type BreachRoomSubmissionsSummary = {
  acceptedByImpact: Record<BreachRoomSeverity, number>;
  totalEarnedXp: number;
  validSubmissions: number;
};

export type BreachRoomSubmissionsResponse = {
  submissions: BreachRoomSubmission[];
  summary: BreachRoomSubmissionsSummary;
};

export type BreachRoomSubmitPayload = {
  category: string;
  impact: BreachRoomSeverity;
  likelihood: BreachRoomSeverity;
  reportMarkdown: string;
  scope: string;
  title: string;
  walletAddress?: string;
};

export type BreachRoomSubmitResponse = {
  id: string;
  prCreationError: string | null;
  prCreationStatus: "pending" | "created" | "failed";
  prUrl: string | null;
  reviewState: BreachRoomReviewStatus;
  status: BreachRoomReviewStatus;
  submissionId: string;
  xpAwarded: number;
};

async function breachRoomsRequest<T>(
  path: string,
  options: RequestInit & { accessToken: string }
): Promise<T> {
  const { accessToken, ...fetchOptions } = options;

  if (!accessToken.trim()) {
    throw new Error("Authenticate your wallet before loading Breach Rooms.");
  }

  const headers = new Headers(fetchOptions.headers);

  if (!headers.has("content-type") && fetchOptions.body) {
    headers.set("content-type", "application/json");
  }

  headers.set("authorization", `Bearer ${accessToken}`);
  applyNgrokBypassHeader(headers, SOLBREACH_BACKEND_URL);

  const response = await fetch(`${SOLBREACH_BACKEND_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      body && typeof body === "object"
        ? body.error?.message ||
          (typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail ?? body)) ||
          response.statusText
        : response.statusText;
    throw new Error(message);
  }

  return body as T;
}

export function listMyBreachRoomSubmissions(
  accessToken: string,
  roomIdOrSlug = BREACH_ROOM_1_SLUG
) {
  return breachRoomsRequest<BreachRoomSubmissionsResponse>(
    `/api/v1/breach-rooms/${encodeURIComponent(roomIdOrSlug)}/submissions/me`,
    { accessToken }
  );
}

export function submitBreachRoomFinding(
  accessToken: string,
  payload: BreachRoomSubmitPayload,
  roomIdOrSlug = BREACH_ROOM_1_SLUG
) {
  return breachRoomsRequest<BreachRoomSubmitResponse>(
    `/api/v1/breach-rooms/${encodeURIComponent(roomIdOrSlug)}/submissions`,
    {
      accessToken,
      body: JSON.stringify(payload),
      method: "POST",
    }
  );
}
