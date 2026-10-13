import { applyNgrokBypassHeader } from "./backend/ngrok";
import { SOLBREACH_BACKEND_URL } from "./levels/level1-backend";

export type OnboardingProfile =
  | "solana_developer"
  | "web3_developer_new_to_solana"
  | "student_or_junior_builder"
  | "security_researcher"
  | "junior_auditor"
  | "educator_bootcamp_community"
  | "protocol_or_technical_team"
  | "other";

export type SolanaLevel =
  | "learning_basics"
  | "built_simple_project"
  | "worked_with_anchor_or_programs"
  | "advanced";

export type SecurityExperience =
  | "almost_none"
  | "read_writeups_or_audit_reports"
  | "joined_ctfs"
  | "reviewed_code_or_found_bugs"
  | "works_or_wants_auditing";

export type MainGoal =
  | "learn_solana_security_through_practice"
  | "understand_real_vulnerabilities"
  | "prepare_for_cohorts_or_audits"
  | "become_safer_builder_before_shipping"
  | "get_visible_proof_of_skill"
  | "evaluate_developers_or_students";

export type LearningSource =
  | "docs"
  | "audit_reports"
  | "x_threads"
  | "youtube"
  | "cohorts"
  | "ctfs"
  | "ai_tools"
  | "mentorship"
  | "no_clear_path";

export type BetaIntent = "try_this_week" | "try_later" | "maybe" | "not_now";

export type FeedbackWillingness = "short_call" | "form" | "chat" | "not_now";

export type PreferredContactChannel = "email" | "telegram";

export type OnboardingSubmission = {
  additionalNotes: string | null;
  betaIntent: BetaIntent;
  contact: string;
  currentLearningSources: LearningSource[];
  feedbackWillingness: FeedbackWillingness;
  futureLabsInterest: string | null;
  guidedLabUsefulness: number;
  mainGoal: MainGoal[];
  name: string;
  organizationName: string | null;
  preferredContactChannel: PreferredContactChannel;
  profile: OnboardingProfile;
  securityExperience: SecurityExperience;
  solanaLevel: SolanaLevel;
  source: "landing_onboarding";
  utmCampaign: string | null;
  utmMedium: string | null;
  utmSource: string | null;
};

export type OnboardingSubmissionResponse = {
  data: {
    createdAt: string;
    id: string;
    status: "new";
  };
};

type ApiErrorBody = {
  detail?: string | Array<{ msg?: string }>;
  error?: {
    code?: string;
    message?: string;
  };
};

function getApiErrorMessage(body: unknown, status: number) {
  if (status === 429) {
    return "Too many applications were sent from this connection. Wait a minute and try again.";
  }

  if (typeof body === "object" && body !== null) {
    const errorBody = body as ApiErrorBody;

    if (errorBody.error?.message) {
      return errorBody.error.message;
    }

    if (typeof errorBody.detail === "string") {
      return errorBody.detail;
    }

    if (Array.isArray(errorBody.detail)) {
      const firstMessage = errorBody.detail.find((item) => item.msg)?.msg;
      if (firstMessage) {
        return firstMessage;
      }
    }
  }

  return "We could not submit your application. Check your connection and try again.";
}

export async function submitOnboardingResponse(
  submission: OnboardingSubmission
) {
  const headers = new Headers({ "content-type": "application/json" });
  applyNgrokBypassHeader(headers, SOLBREACH_BACKEND_URL);

  const response = await fetch(
    `${SOLBREACH_BACKEND_URL}/api/v1/onboarding/responses`,
    {
      body: JSON.stringify(submission),
      headers,
      method: "POST",
    }
  );
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(getApiErrorMessage(body, response.status));
  }

  return body as OnboardingSubmissionResponse;
}
