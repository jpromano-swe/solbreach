import type {
  LearningSource,
  MainGoal,
  OnboardingProfile,
  OnboardingSubmission,
  SecurityExperience,
  SolanaLevel,
} from "../lib/onboarding";

export type RealExperience =
  | "not_built_anything"
  | "built_simple_project"
  | "worked_anchor_or_solana_programs"
  | "rust_experience"
  | "joined_hackathons"
  | "contributed_real_projects";

export type SecurityLearningAttempt =
  | "active"
  | "lightly"
  | "tried_and_stopped"
  | "interested_not_started"
  | "not_priority";

export type LearningAction =
  | "docs_or_audit_reports"
  | "exploit_writeups"
  | "videos_or_workshops"
  | "ai_for_code_or_bugs"
  | "ctfs_or_challenges"
  | "reviewed_or_exploited_real_code"
  | "nothing_concrete";

export type LearningBlocker =
  | "no_clear_path"
  | "too_much_theory"
  | "resources_too_advanced"
  | "hard_to_identify_bugs"
  | "hard_to_reproduce_exploits"
  | "lacked_feedback"
  | "not_stuck";

export type LearningFormat =
  | "guided_modules"
  | "research_labs"
  | "audit_environments"
  | "scored_challenges"
  | "mentor_feedback"
  | "final_report_or_certificate";

export type PracticeSignal =
  | "execute_exploit"
  | "see_state_changes"
  | "validation_checks"
  | "real_cases"
  | "feedback_or_explanation"
  | "final_report";

export type CustomerProfile =
  | "solana_developer"
  | "web3_developer_new_to_solana"
  | "backend_or_rust_developer"
  | "student_or_junior_builder"
  | "security_researcher_or_auditor"
  | "community_bootcamp_or_team";

export type BetaInterest = "try_this_week" | "try_later" | "maybe" | "not_now";

export type OnboardingFormState = {
  betaIntent: BetaInterest | "";
  contact: string;
  hardestPracticeStep: string;
  learningActions: LearningAction[];
  learningBlockers: LearningBlocker[];
  preferredFormats: LearningFormat[];
  practiceSignals: PracticeSignal[];
  problemIntensity: number | null;
  problemIntensityReason: string;
  profile: CustomerProfile | "";
  realExperience: RealExperience[];
  securityLearningAttempt: SecurityLearningAttempt | "";
};

export type OnboardingFormErrors = Partial<
  Record<keyof OnboardingFormState | "submission", string>
>;

export type QuestionnaireOption = {
  label: string;
  value: string;
};

export type OnboardingValidationMessages = Record<
  Exclude<OnboardingQuestionId, "review">,
  string
> & { contact: string };

export type OnboardingQuestionId =
  | "profile"
  | "realExperience"
  | "securityLearningAttempt"
  | "learningActions"
  | "learningBlockers"
  | "hardestPracticeStep"
  | "preferredFormats"
  | "practiceSignals"
  | "problemIntensity"
  | "betaIntent"
  | "review";

export type OnboardingPage = {
  id: OnboardingQuestionId;
  validation: readonly OnboardingQuestionId[];
};

export const ONBOARDING_PAGES: readonly OnboardingPage[] = [
  { id: "profile", validation: ["profile"] },
  { id: "realExperience", validation: ["realExperience"] },
  {
    id: "securityLearningAttempt",
    validation: ["securityLearningAttempt"],
  },
  { id: "learningActions", validation: ["learningActions"] },
  { id: "learningBlockers", validation: ["learningBlockers"] },
  {
    id: "hardestPracticeStep",
    validation: ["hardestPracticeStep"],
  },
  { id: "preferredFormats", validation: ["preferredFormats"] },
  { id: "practiceSignals", validation: ["practiceSignals"] },
  { id: "problemIntensity", validation: ["problemIntensity"] },
  { id: "betaIntent", validation: ["betaIntent"] },
  {
    id: "review",
    validation: [
      "profile",
      "realExperience",
      "securityLearningAttempt",
      "learningActions",
      "learningBlockers",
      "hardestPracticeStep",
      "preferredFormats",
      "practiceSignals",
      "problemIntensity",
      "betaIntent",
    ],
  },
];

export const INITIAL_ONBOARDING_FORM: OnboardingFormState = {
  betaIntent: "",
  contact: "",
  hardestPracticeStep: "",
  learningActions: [],
  learningBlockers: [],
  preferredFormats: [],
  practiceSignals: [],
  problemIntensity: null,
  problemIntensityReason: "",
  profile: "",
  realExperience: [],
  securityLearningAttempt: "",
};

export function validateOnboardingQuestions(
  form: OnboardingFormState,
  questions: readonly OnboardingQuestionId[],
  messages: OnboardingValidationMessages
) {
  const errors: OnboardingFormErrors = {};
  const includes = (question: OnboardingQuestionId) =>
    questions.includes(question);

  if (includes("profile") && !form.profile) errors.profile = messages.profile;
  if (includes("realExperience") && form.realExperience.length === 0) {
    errors.realExperience = messages.realExperience;
  }
  if (includes("securityLearningAttempt") && !form.securityLearningAttempt) {
    errors.securityLearningAttempt = messages.securityLearningAttempt;
  }
  if (includes("learningActions") && form.learningActions.length === 0) {
    errors.learningActions = messages.learningActions;
  }
  if (includes("learningBlockers") && form.learningBlockers.length === 0) {
    errors.learningBlockers = messages.learningBlockers;
  }
  if (
    includes("hardestPracticeStep") &&
    form.hardestPracticeStep.trim().length < 10
  ) {
    errors.hardestPracticeStep = messages.hardestPracticeStep;
  }
  if (includes("preferredFormats") && form.preferredFormats.length === 0) {
    errors.preferredFormats = messages.preferredFormats;
  }
  if (includes("practiceSignals") && form.practiceSignals.length === 0) {
    errors.practiceSignals = messages.practiceSignals;
  }
  if (includes("problemIntensity") && form.problemIntensity === null) {
    errors.problemIntensity = messages.problemIntensity;
  }
  if (includes("betaIntent")) {
    if (!form.betaIntent) {
      errors.betaIntent = messages.betaIntent;
    } else if (form.betaIntent !== "not_now" && !form.contact.trim()) {
      errors.contact = messages.contact;
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
    !form.profile ||
    !form.securityLearningAttempt ||
    form.problemIntensity === null
  ) {
    throw new Error("The onboarding form is incomplete.");
  }

  return {
    additionalNotes: buildAdditionalNotes(form),
    betaIntent: form.betaIntent,
    contact:
      form.betaIntent === "not_now"
        ? "not_provided"
        : form.contact.trim() || "not_provided",
    currentLearningSources: mapLearningSources(form.learningActions),
    feedbackWillingness: form.betaIntent === "not_now" ? "not_now" : "form",
    futureLabsInterest: buildDiscoveryMetadata(form),
    guidedLabUsefulness: form.problemIntensity,
    mainGoal: mapLearningFormats(form.preferredFormats),
    name: "Solana builder",
    organizationName: null,
    preferredContactChannel: inferContactChannel(
      form.betaIntent === "not_now" ? "" : form.contact
    ),
    profile: mapProfile(form.profile),
    securityExperience: mapSecurityExperience(form.securityLearningAttempt),
    solanaLevel: mapSolanaLevel(form.realExperience),
    source: "landing_onboarding",
    utmCampaign: cleanOptional(searchParams.get("utm_campaign") ?? ""),
    utmMedium: cleanOptional(searchParams.get("utm_medium") ?? ""),
    utmSource: cleanOptional(searchParams.get("utm_source") ?? ""),
  };
}

function buildAdditionalNotes(form: OnboardingFormState) {
  const parts = [
    `hardest=${form.hardestPracticeStep.trim()}`,
    form.problemIntensityReason.trim()
      ? `score_reason=${form.problemIntensityReason.trim()}`
      : "",
  ].filter(Boolean);
  return parts.join("\n").slice(0, 1000) || null;
}

function buildDiscoveryMetadata(form: OnboardingFormState) {
  return [
    `profile=${form.profile}`,
    `security_attempt=${form.securityLearningAttempt}`,
    `experience=${form.realExperience.join(",")}`,
    `actions=${form.learningActions.join(",")}`,
    `blockers=${form.learningBlockers.join(",")}`,
    `formats=${form.preferredFormats.join(",")}`,
    `practice=${form.practiceSignals.join(",")}`,
  ]
    .join(";")
    .slice(0, 1000);
}

function inferContactChannel(contact: string) {
  const normalized = contact.trim();
  return normalized.startsWith("@") && !normalized.includes(".")
    ? ("telegram" as const)
    : ("email" as const);
}

function mapProfile(profile: CustomerProfile): OnboardingProfile {
  const profiles: Record<CustomerProfile, OnboardingProfile> = {
    backend_or_rust_developer: "protocol_or_technical_team",
    community_bootcamp_or_team: "educator_bootcamp_community",
    security_researcher_or_auditor: "security_researcher",
    solana_developer: "solana_developer",
    student_or_junior_builder: "student_or_junior_builder",
    web3_developer_new_to_solana: "web3_developer_new_to_solana",
  };
  return profiles[profile];
}

function mapSolanaLevel(experience: RealExperience[]): SolanaLevel {
  if (
    experience.includes("contributed_real_projects") ||
    experience.includes("joined_hackathons")
  ) {
    return "advanced";
  }
  if (experience.includes("worked_anchor_or_solana_programs")) {
    return "worked_with_anchor_or_programs";
  }
  if (experience.includes("built_simple_project")) {
    return "built_simple_project";
  }
  return "learning_basics";
}

function mapSecurityExperience(
  attempt: SecurityLearningAttempt
): SecurityExperience {
  const attempts: Record<SecurityLearningAttempt, SecurityExperience> = {
    active: "works_or_wants_auditing",
    interested_not_started: "almost_none",
    lightly: "read_writeups_or_audit_reports",
    not_priority: "almost_none",
    tried_and_stopped: "read_writeups_or_audit_reports",
  };
  return attempts[attempt];
}

function mapLearningSources(actions: LearningAction[]): LearningSource[] {
  if (actions.includes("nothing_concrete")) return ["no_clear_path"];

  const mapped = actions.flatMap<LearningSource>((action) => {
    const sources: Partial<Record<LearningAction, LearningSource[]>> = {
      ai_for_code_or_bugs: ["ai_tools"],
      ctfs_or_challenges: ["ctfs"],
      docs_or_audit_reports: ["docs", "audit_reports"],
      exploit_writeups: ["audit_reports"],
      reviewed_or_exploited_real_code: ["docs"],
      videos_or_workshops: ["youtube"],
    };
    return sources[action] ?? [];
  });

  return [
    ...new Set(mapped.length > 0 ? mapped : ["no_clear_path"]),
  ] as LearningSource[];
}

function mapLearningFormats(formats: LearningFormat[]): MainGoal[] {
  const mapped = formats.map<MainGoal>((format) => {
    const goals: Record<LearningFormat, MainGoal> = {
      audit_environments: "prepare_for_cohorts_or_audits",
      final_report_or_certificate: "get_visible_proof_of_skill",
      guided_modules: "learn_solana_security_through_practice",
      mentor_feedback: "prepare_for_cohorts_or_audits",
      research_labs: "understand_real_vulnerabilities",
      scored_challenges: "get_visible_proof_of_skill",
    };
    return goals[format];
  });

  return [...new Set(mapped)] as MainGoal[];
}

function cleanOptional(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
