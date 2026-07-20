import type {
  BetaIntent,
  FeedbackWillingness,
  LearningSource,
  MainGoal,
  OnboardingProfile,
  OnboardingSubmission,
  PreferredContactChannel,
  SecurityExperience,
  SolanaLevel,
} from "../lib/onboarding";

export type OnboardingFormState = {
  additionalNotes: string;
  betaIntent: BetaIntent | "";
  contact: string;
  currentLearningSources: LearningSource[];
  feedbackWillingness: FeedbackWillingness | "";
  futureLabsInterest: string;
  guidedLabUsefulness: number | null;
  mainGoal: MainGoal[];
  name: string;
  organizationName: string;
  preferredContactChannel: PreferredContactChannel;
  profile: OnboardingProfile | "";
  securityExperience: SecurityExperience | "";
  solanaLevel: SolanaLevel | "";
};

export type OnboardingFormErrors = Partial<
  Record<keyof OnboardingFormState | "submission", string>
>;

export type QuestionnaireOption = {
  label: string;
  value: string;
};

export const INITIAL_ONBOARDING_FORM: OnboardingFormState = {
  additionalNotes: "",
  betaIntent: "",
  contact: "",
  currentLearningSources: [],
  feedbackWillingness: "",
  futureLabsInterest: "",
  guidedLabUsefulness: null,
  mainGoal: [],
  name: "",
  organizationName: "",
  preferredContactChannel: "email",
  profile: "",
  securityExperience: "",
  solanaLevel: "",
};

export const ONBOARDING_STEPS = [
  "Contact",
  "Profile",
  "Learning",
  "Beta fit",
] as const;

export const PROFILE_OPTIONS: QuestionnaireOption[] = [
  { label: "Solana developer", value: "solana_developer" },
  {
    label: "Web3 developer new to Solana",
    value: "web3_developer_new_to_solana",
  },
  {
    label: "Student or junior builder",
    value: "student_or_junior_builder",
  },
  { label: "Security researcher", value: "security_researcher" },
  { label: "Junior auditor", value: "junior_auditor" },
  {
    label: "Educator, bootcamp, or community",
    value: "educator_bootcamp_community",
  },
  {
    label: "Protocol or technical team",
    value: "protocol_or_technical_team",
  },
  { label: "Other", value: "other" },
];

export const SOLANA_LEVEL_OPTIONS: QuestionnaireOption[] = [
  { label: "Learning the basics", value: "learning_basics" },
  { label: "Built a simple Solana project", value: "built_simple_project" },
  {
    label: "Worked with Anchor or Solana programs",
    value: "worked_with_anchor_or_programs",
  },
  { label: "Advanced", value: "advanced" },
];

export const SECURITY_OPTIONS: QuestionnaireOption[] = [
  { label: "Almost none", value: "almost_none" },
  {
    label: "Read writeups or audit reports",
    value: "read_writeups_or_audit_reports",
  },
  { label: "Joined CTFs", value: "joined_ctfs" },
  {
    label: "Reviewed code or found bugs",
    value: "reviewed_code_or_found_bugs",
  },
  {
    label: "Work in or want to enter auditing",
    value: "works_or_wants_auditing",
  },
];

export const GOAL_OPTIONS: QuestionnaireOption[] = [
  {
    label: "Learn Solana security through practice",
    value: "learn_solana_security_through_practice",
  },
  {
    label: "Understand real vulnerability patterns",
    value: "understand_real_vulnerabilities",
  },
  {
    label: "Prepare for cohorts or audits",
    value: "prepare_for_cohorts_or_audits",
  },
  {
    label: "Ship safer Solana programs",
    value: "become_safer_builder_before_shipping",
  },
  {
    label: "Build visible proof of skill",
    value: "get_visible_proof_of_skill",
  },
  {
    label: "Evaluate developers or students",
    value: "evaluate_developers_or_students",
  },
];

export const LEARNING_SOURCE_OPTIONS: QuestionnaireOption[] = [
  { label: "Documentation", value: "docs" },
  { label: "Audit reports", value: "audit_reports" },
  { label: "X threads", value: "x_threads" },
  { label: "YouTube", value: "youtube" },
  { label: "Cohorts", value: "cohorts" },
  { label: "CTFs", value: "ctfs" },
  { label: "AI tools", value: "ai_tools" },
  { label: "Mentorship", value: "mentorship" },
  { label: "I do not have a clear path", value: "no_clear_path" },
];

export const BETA_INTENT_OPTIONS: QuestionnaireOption[] = [
  { label: "I can try it this week", value: "try_this_week" },
  { label: "I want to try it later", value: "try_later" },
  { label: "Maybe", value: "maybe" },
  { label: "Not right now", value: "not_now" },
];

export const FEEDBACK_OPTIONS: QuestionnaireOption[] = [
  { label: "Short call", value: "short_call" },
  { label: "Feedback form", value: "form" },
  { label: "Chat", value: "chat" },
  { label: "Not right now", value: "not_now" },
];

export function validateOnboardingStep(
  form: OnboardingFormState,
  step: number
) {
  const errors: OnboardingFormErrors = {};

  if (step === 0) {
    if (form.name.trim().length < 2) {
      errors.name = "Enter at least two characters.";
    }
    if (!form.contact.trim()) {
      errors.contact = "Add the contact where we should reach you.";
    }
  }

  if (step === 1) {
    if (!form.profile) errors.profile = "Choose the closest profile.";
    if (!form.solanaLevel) {
      errors.solanaLevel = "Choose your current Solana level.";
    }
    if (!form.securityExperience) {
      errors.securityExperience = "Choose your current security experience.";
    }
  }

  if (step === 2) {
    if (form.mainGoal.length === 0) {
      errors.mainGoal = "Choose at least one goal.";
    }
    if (form.currentLearningSources.length === 0) {
      errors.currentLearningSources = "Choose at least one learning source.";
    }
    if (form.guidedLabUsefulness === null) {
      errors.guidedLabUsefulness = "Choose a usefulness score.";
    }
  }

  if (step === 3) {
    if (!form.betaIntent) {
      errors.betaIntent = "Tell us when you could try the beta.";
    }
    if (!form.feedbackWillingness) {
      errors.feedbackWillingness =
        "Choose how you would prefer to share feedback.";
    }
  }

  return errors;
}

export function buildOnboardingSubmission(
  form: OnboardingFormState,
  searchParams: URLSearchParams
): OnboardingSubmission {
  if (
    !form.betaIntent ||
    !form.feedbackWillingness ||
    form.guidedLabUsefulness === null ||
    !form.profile ||
    !form.securityExperience ||
    !form.solanaLevel
  ) {
    throw new Error("The onboarding form is incomplete.");
  }

  return {
    additionalNotes: cleanOptional(form.additionalNotes),
    betaIntent: form.betaIntent,
    contact: form.contact.trim(),
    currentLearningSources: form.currentLearningSources,
    feedbackWillingness: form.feedbackWillingness,
    futureLabsInterest: cleanOptional(form.futureLabsInterest),
    guidedLabUsefulness: form.guidedLabUsefulness,
    mainGoal: form.mainGoal,
    name: form.name.trim(),
    organizationName: cleanOptional(form.organizationName),
    preferredContactChannel: form.preferredContactChannel,
    profile: form.profile,
    securityExperience: form.securityExperience,
    solanaLevel: form.solanaLevel,
    source: "landing_onboarding",
    utmCampaign: cleanOptional(searchParams.get("utm_campaign") ?? ""),
    utmMedium: cleanOptional(searchParams.get("utm_medium") ?? ""),
    utmSource: cleanOptional(searchParams.get("utm_source") ?? ""),
  };
}

function cleanOptional(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
