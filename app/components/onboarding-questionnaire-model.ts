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

export function validateOnboardingStep(
  form: OnboardingFormState,
  step: number,
  messages: OnboardingValidationMessages
) {
  const errors: OnboardingFormErrors = {};

  if (step === 0) {
    if (form.name.trim().length < 2) {
      errors.name = messages.name;
    }
    if (!form.contact.trim()) {
      errors.contact = messages.contact;
    }
  }

  if (step === 1) {
    if (!form.profile) errors.profile = messages.profile;
    if (!form.solanaLevel) {
      errors.solanaLevel = messages.solanaLevel;
    }
    if (!form.securityExperience) {
      errors.securityExperience = messages.securityExperience;
    }
  }

  if (step === 2) {
    if (form.mainGoal.length === 0) {
      errors.mainGoal = messages.mainGoal;
    }
    if (form.currentLearningSources.length === 0) {
      errors.currentLearningSources = messages.currentLearningSources;
    }
    if (form.guidedLabUsefulness === null) {
      errors.guidedLabUsefulness = messages.guidedLabUsefulness;
    }
  }

  if (step === 3) {
    if (!form.betaIntent) {
      errors.betaIntent = messages.betaIntent;
    }
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
