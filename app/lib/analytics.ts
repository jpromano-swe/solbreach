import { applyNgrokBypassHeader } from "./backend/ngrok";
import { SOLBREACH_BACKEND_URL } from "./levels/level1-backend";

export type AnalyticsEventName =
  | "beta_page_viewed"
  | "wallet_connect_started"
  | "beta_app_entered"
  | "vulnerability_catalog_viewed"
  | "level_opened"
  | "research_labs_catalog_viewed"
  | "research_lab_opened"
  | "rl1_inspect_viewed"
  | "rl1_source_file_opened"
  | "rl1_account_state_viewed"
  | "rl1_try_exploit_clicked"
  | "rl1_exploit_interface_viewed"
  | "rl1_hint_revealed"
  | "rl1_evidence_review_viewed"
  | "rl1_report_finding_viewed"
  | "rl1_audit_report_opened";

type AnalyticsProperties = Record<
  string,
  boolean | number | string | null | string[] | undefined
>;

type TrackAnalyticsEventInput = {
  eventName: AnalyticsEventName;
  labId?: string | null;
  levelId?: string | null;
  properties?: AnalyticsProperties;
  sessionId?: string | null;
  walletAddress?: string | null;
};

export function trackAnalyticsEvent({
  eventName,
  labId,
  levelId,
  properties,
  sessionId,
  walletAddress,
}: TrackAnalyticsEventInput) {
  if (typeof window === "undefined") return;

  const headers = new Headers({ "content-type": "application/json" });
  applyNgrokBypassHeader(headers, SOLBREACH_BACKEND_URL);

  const body = JSON.stringify({
    eventName,
    labId,
    levelId,
    properties: properties ?? {},
    sessionId,
    source: "frontend",
    walletAddress,
  });

  void fetch(`${SOLBREACH_BACKEND_URL}/api/v1/analytics/events`, {
    body,
    headers,
    keepalive: true,
    method: "POST",
  }).catch(() => {
    // Analytics must never block or alter product behavior.
  });
}
