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

export type OnboardingValidationMessages = {
  betaIntent: string;
  contact: string;
  feedbackWillingness: string;
  guidedLabUsefulness: string;
  mainGoal: string;
  name: string;
  currentLearningSources: string;
  profile: string;
  securityExperience: string;
  solanaLevel: string;
};

export type OnboardingQuestionId =
  | "contact"
  | "profile"
  | "solanaLevel"
  | "securityExperience"
  | "mainGoal"
  | "currentLearningSources"
  | "guidedLabUsefulness"
  | "betaIntent"
  | "feedbackWillingness"
  | "optional";

export type OnboardingPageId =
  | OnboardingQuestionId
  | "profileGroup"
  | "learningGroup"
  | "betaGroup";

export type OnboardingPage = {
  id: OnboardingPageId;
  validation: readonly OnboardingQuestionId[];
};

export const DESKTOP_ONBOARDING_PAGES: readonly OnboardingPage[] = [
  { id: "contact", validation: ["contact"] },
  {
    id: "profileGroup",
    validation: ["profile", "solanaLevel", "securityExperience"],
  },
  {
    id: "learningGroup",
    validation: ["mainGoal", "currentLearningSources", "guidedLabUsefulness"],
  },
  {
    id: "betaGroup",
    validation: ["betaIntent", "feedbackWillingness"],
  },
];

export const MOBILE_ONBOARDING_PAGES: readonly OnboardingPage[] = [
  { id: "contact", validation: ["contact"] },
  { id: "profile", validation: ["profile"] },
  { id: "solanaLevel", validation: ["solanaLevel"] },
  { id: "securityExperience", validation: ["securityExperience"] },
  { id: "mainGoal", validation: ["mainGoal"] },
  {
    id: "currentLearningSources",
    validation: ["currentLearningSources"],
  },
  {
    id: "guidedLabUsefulness",
    validation: ["guidedLabUsefulness"],
  },
  { id: "betaIntent", validation: ["betaIntent"] },
  {
    id: "feedbackWillingness",
    validation: ["feedbackWillingness"],
  },
  { id: "optional", validation: [] },
];

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

export function validateOnboardingQuestions(
  form: OnboardingFormState,
  questions: readonly OnboardingQuestionId[],
  messages: OnboardingValidationMessages
) {
  const errors: OnboardingFormErrors = {};
  const includes = (question: OnboardingQuestionId) =>
    questions.includes(question);

  if (includes("contact")) {
    if (form.name.trim().length < 2) {
      errors.name = messages.name;
    }
    if (!form.contact.trim()) {
      errors.contact = messages.contact;
    }
  }

  if (includes("profile")) {
    if (!form.profile) errors.profile = messages.profile;
  }

  if (includes("solanaLevel")) {
    if (!form.solanaLevel) {
      errors.solanaLevel = messages.solanaLevel;
    }
  }

  if (includes("securityExperience")) {
    if (!form.securityExperience) {
      errors.securityExperience = messages.securityExperience;
    }
  }

  if (includes("mainGoal")) {
    if (form.mainGoal.length === 0) {
      errors.mainGoal = messages.mainGoal;
    }
  }

  if (includes("currentLearningSources")) {
    if (form.currentLearningSources.length === 0) {
      errors.currentLearningSources = messages.currentLearningSources;
    }
  }

  if (includes("guidedLabUsefulness")) {
    if (form.guidedLabUsefulness === null) {
      errors.guidedLabUsefulness = messages.guidedLabUsefulness;
    }
  }

  if (includes("betaIntent")) {
    if (!form.betaIntent) {
      errors.betaIntent = messages.betaIntent;
    }
  }

  if (includes("feedbackWillingness")) {
    if (!form.feedbackWillingness) {
      errors.feedbackWillingness = messages.feedbackWillingness;
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
