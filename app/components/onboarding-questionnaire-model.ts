import type {
  LearningSource,
  MainGoal,
  OnboardingProfile,
  OnboardingSubmission,
  PreferredContactChannel,
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

export type BlockchainSecurityProfile =
  | "no_security_background"
  | "web2_security_basics"
  | "web3_security_basics"
  | "solana_security_beginner"
  | "ctf_or_audit_learning"
  | "professional_auditor_researcher";

export type StudyTechnique =
  | "official_docs"
  | "small_projects"
  | "videos_or_workshops"
  | "ai_assisted"
  | "writeups_or_case_studies"
  | "ctfs_or_challenges"
  | "mentor_or_peer_feedback";

export type DifficultArea =
  | "solana_account_model"
  | "rust_or_anchor"
  | "svm_runtime"
  | "vulnerability_identification"
  | "exploit_reproduction"
  | "cpi_signers_authority"
  | "impact_or_reporting";

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
  blockchainSecurityProfile: BlockchainSecurityProfile | "";
  contact: string;
  contactName: string;
  difficultAreas: DifficultArea[];
  hardestPracticeStep: string;
  preferredFormats: LearningFormat[];
  preferredContactChannel: PreferredContactChannel | "";
  practiceSignals: PracticeSignal[];
  problemIntensity: number | null;
  problemIntensityReason: string;
  profile: CustomerProfile | "";
  realExperience: RealExperience[];
  securityLearningAttempt: SecurityLearningAttempt | "";
  securityRelevance: number | null;
  studyTechniques: StudyTechnique[];
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
> & { contact: string; contactName: string; preferredContactChannel: string };

export type OnboardingQuestionId =
  | "profile"
  | "realExperience"
  | "preferredFormats"
  | "blockchainSecurityProfile"
  | "securityLearningAttempt"
  | "studyTechniques"
  | "difficultAreas"
  | "hardestPracticeStep"
  | "practiceSignals"
  | "securityRelevance"
  | "problemIntensity"
  | "betaIntent"
  | "contactDetails"
  | "review";

export type OnboardingPage = {
  id: OnboardingQuestionId;
  validation: readonly OnboardingQuestionId[];
};

export const ONBOARDING_PAGES: readonly OnboardingPage[] = [
  { id: "profile", validation: ["profile"] },
  { id: "realExperience", validation: ["realExperience"] },
  { id: "preferredFormats", validation: ["preferredFormats"] },
  {
    id: "blockchainSecurityProfile",
    validation: ["blockchainSecurityProfile"],
  },
  {
    id: "securityLearningAttempt",
    validation: ["securityLearningAttempt"],
  },
  { id: "studyTechniques", validation: ["studyTechniques"] },
  { id: "difficultAreas", validation: ["difficultAreas"] },
  {
    id: "hardestPracticeStep",
    validation: ["hardestPracticeStep"],
  },
  { id: "practiceSignals", validation: ["practiceSignals"] },
  { id: "securityRelevance", validation: ["securityRelevance"] },
  { id: "problemIntensity", validation: ["problemIntensity"] },
  { id: "betaIntent", validation: ["betaIntent"] },
  { id: "contactDetails", validation: ["contactDetails"] },
  {
    id: "review",
    validation: [
      "profile",
      "realExperience",
      "preferredFormats",
      "blockchainSecurityProfile",
      "securityLearningAttempt",
      "studyTechniques",
      "difficultAreas",
      "hardestPracticeStep",
      "practiceSignals",
      "securityRelevance",
      "problemIntensity",
      "betaIntent",
      "contactDetails",
    ],
  },
];

export const INITIAL_ONBOARDING_FORM: OnboardingFormState = {
  betaIntent: "",
  blockchainSecurityProfile: "",
  contact: "",
  contactName: "",
  difficultAreas: [],
  hardestPracticeStep: "",
  preferredFormats: [],
  preferredContactChannel: "",
  practiceSignals: [],
  problemIntensity: null,
  problemIntensityReason: "",
  profile: "",
  realExperience: [],
  securityLearningAttempt: "",
  securityRelevance: null,
  studyTechniques: [],
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
  if (includes("blockchainSecurityProfile") && !form.blockchainSecurityProfile) {
    errors.blockchainSecurityProfile = messages.blockchainSecurityProfile;
  }
  if (includes("studyTechniques") && form.studyTechniques.length === 0) {
    errors.studyTechniques = messages.studyTechniques;
  }
  if (includes("difficultAreas") && form.difficultAreas.length === 0) {
    errors.difficultAreas = messages.difficultAreas;
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
  if (includes("securityRelevance") && form.securityRelevance === null) {
    errors.securityRelevance = messages.securityRelevance;
  }
  if (includes("problemIntensity") && form.problemIntensity === null) {
    errors.problemIntensity = messages.problemIntensity;
  }
  if (includes("betaIntent")) {
    if (!form.betaIntent) {
      errors.betaIntent = messages.betaIntent;
    }
  }
  if (includes("contactDetails") && form.betaIntent !== "not_now") {
    if (!form.preferredContactChannel) {
      errors.preferredContactChannel = messages.preferredContactChannel;
    }
    if (!form.contactName.trim()) {
      errors.contactName = messages.contactName;
    }
    if (!form.contact.trim()) {
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
    !form.blockchainSecurityProfile ||
    !form.profile ||
    !form.securityLearningAttempt ||
    form.problemIntensity === null ||
    form.securityRelevance === null
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
    currentLearningSources: mapLearningSources(form.studyTechniques),
    feedbackWillingness: form.betaIntent === "not_now" ? "not_now" : "form",
    futureLabsInterest: buildDiscoveryMetadata(form),
    guidedLabUsefulness: form.problemIntensity,
    mainGoal: mapLearningFormats(form.preferredFormats),
    name:
      form.betaIntent === "not_now"
        ? form.contactName.trim() || "Solana builder"
        : form.contactName.trim(),
    organizationName: null,
    preferredContactChannel:
      form.betaIntent === "not_now"
        ? "email"
        : form.preferredContactChannel || "email",
    profile: mapProfile(form.profile),
    securityExperience: mapSecurityExperience(
      form.blockchainSecurityProfile,
      form.securityLearningAttempt
    ),
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
    form.securityRelevance !== null
      ? `security_relevance=${form.securityRelevance}/5`
      : "",
    form.problemIntensityReason.trim()
      ? `score_reason=${form.problemIntensityReason.trim()}`
      : "",
  ].filter(Boolean);
  return parts.join("\n").slice(0, 1000) || null;
}

function buildDiscoveryMetadata(form: OnboardingFormState) {
  return [
    `profile=${form.profile}`,
    `security_profile=${form.blockchainSecurityProfile}`,
    `security_attempt=${form.securityLearningAttempt}`,
    `experience=${form.realExperience.join(",")}`,
    `study=${form.studyTechniques.join(",")}`,
    `areas=${form.difficultAreas.join(",")}`,
    `formats=${form.preferredFormats.join(",")}`,
    `practice=${form.practiceSignals.join(",")}`,
    `security_relevance=${form.securityRelevance ?? ""}`,
  ]
    .join(";")
    .slice(0, 1000);
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
  profile: BlockchainSecurityProfile,
  attempt: SecurityLearningAttempt
): SecurityExperience {
  const profiles: Partial<Record<BlockchainSecurityProfile, SecurityExperience>> =
    {
      ctf_or_audit_learning: "joined_ctfs",
      professional_auditor_researcher: "works_or_wants_auditing",
      solana_security_beginner: "read_writeups_or_audit_reports",
      web2_security_basics: "reviewed_code_or_found_bugs",
      web3_security_basics: "read_writeups_or_audit_reports",
    };
  if (profiles[profile]) return profiles[profile];

  const attempts: Record<SecurityLearningAttempt, SecurityExperience> = {
    active: "works_or_wants_auditing",
    interested_not_started: "almost_none",
    lightly: "read_writeups_or_audit_reports",
    not_priority: "almost_none",
    tried_and_stopped: "read_writeups_or_audit_reports",
  };
  return attempts[attempt];
}

function mapLearningSources(techniques: StudyTechnique[]): LearningSource[] {
  const mapped = techniques.flatMap<LearningSource>((technique) => {
    const sources: Record<StudyTechnique, LearningSource[]> = {
      ai_assisted: ["ai_tools"],
      ctfs_or_challenges: ["ctfs"],
      mentor_or_peer_feedback: ["mentorship"],
      official_docs: ["docs"],
      small_projects: ["docs"],
      videos_or_workshops: ["youtube"],
      writeups_or_case_studies: ["audit_reports"],
    };
    return sources[technique];
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
