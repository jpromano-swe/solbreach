"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";

import {
  submitOnboardingResponse,
  type BetaIntent,
  type FeedbackWillingness,
  type LearningSource,
  type MainGoal,
  type OnboardingProfile,
  type PreferredContactChannel,
  type SecurityExperience,
  type SolanaLevel,
} from "../lib/onboarding";

type FormState = {
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

type FormErrors = Partial<Record<keyof FormState | "submission", string>>;

const INITIAL_FORM: FormState = {
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

const STEPS = ["Contact", "Profile", "Learning", "Beta fit"] as const;

const PROFILE_OPTIONS: Array<{
  label: string;
  value: OnboardingProfile;
}> = [
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

const SOLANA_LEVEL_OPTIONS: Array<{ label: string; value: SolanaLevel }> = [
  { label: "Learning the basics", value: "learning_basics" },
  { label: "Built a simple Solana project", value: "built_simple_project" },
  {
    label: "Worked with Anchor or Solana programs",
    value: "worked_with_anchor_or_programs",
  },
  { label: "Advanced", value: "advanced" },
];

const SECURITY_OPTIONS: Array<{
  label: string;
  value: SecurityExperience;
}> = [
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

const GOAL_OPTIONS: Array<{ label: string; value: MainGoal }> = [
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

const LEARNING_SOURCE_OPTIONS: Array<{
  label: string;
  value: LearningSource;
}> = [
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

const BETA_INTENT_OPTIONS: Array<{ label: string; value: BetaIntent }> = [
  { label: "I can try it this week", value: "try_this_week" },
  { label: "I want to try it later", value: "try_later" },
  { label: "Maybe", value: "maybe" },
  { label: "Not right now", value: "not_now" },
];

const FEEDBACK_OPTIONS: Array<{
  label: string;
  value: FeedbackWillingness;
}> = [
  { label: "Short call", value: "short_call" },
  { label: "Feedback form", value: "form" },
  { label: "Chat", value: "chat" },
  { label: "Not right now", value: "not_now" },
];

function cleanOptional(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toggleArrayValue<T extends string>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function OnboardingQuestionnaire() {
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function focusFirstError(nextErrors: FormErrors) {
    const firstField = Object.keys(nextErrors)[0];
    if (!firstField || firstField === "submission") return;

    window.setTimeout(() => {
      document.getElementById(`onboarding-${firstField}`)?.focus();
    }, 0);
  }

  function validateStep(step: number) {
    const nextErrors: FormErrors = {};

    if (step === 0) {
      if (form.name.trim().length < 2) {
        nextErrors.name = "Enter at least two characters.";
      }
      if (!form.contact.trim()) {
        nextErrors.contact = "Add the contact where we should reach you.";
      }
    }

    if (step === 1) {
      if (!form.profile) nextErrors.profile = "Choose the closest profile.";
      if (!form.solanaLevel) {
        nextErrors.solanaLevel = "Choose your current Solana level.";
      }
      if (!form.securityExperience) {
        nextErrors.securityExperience =
          "Choose your current security experience.";
      }
    }

    if (step === 2) {
      if (form.mainGoal.length === 0) {
        nextErrors.mainGoal = "Choose at least one goal.";
      }
      if (form.currentLearningSources.length === 0) {
        nextErrors.currentLearningSources =
          "Choose at least one learning source.";
      }
      if (form.guidedLabUsefulness === null) {
        nextErrors.guidedLabUsefulness = "Choose a usefulness score.";
      }
    }

    if (step === 3) {
      if (!form.betaIntent) {
        nextErrors.betaIntent = "Tell us when you could try the beta.";
      }
      if (!form.feedbackWillingness) {
        nextErrors.feedbackWillingness =
          "Choose how you would prefer to share feedback.";
      }
    }

    setErrors(nextErrors);
    focusFirstError(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goToNextStep() {
    if (!validateStep(currentStep)) return;
    setCurrentStep((step) => Math.min(step + 1, STEPS.length - 1));
  }

  function goToPreviousStep() {
    setErrors({});
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateStep(3) || form.guidedLabUsefulness === null) return;

    const searchParams = new URLSearchParams(window.location.search);
    setIsSubmitting(true);
    setErrors({});

    try {
      await submitOnboardingResponse({
        additionalNotes: cleanOptional(form.additionalNotes),
        betaIntent: form.betaIntent as BetaIntent,
        contact: form.contact.trim(),
        currentLearningSources: form.currentLearningSources,
        feedbackWillingness: form.feedbackWillingness as FeedbackWillingness,
        futureLabsInterest: cleanOptional(form.futureLabsInterest),
        guidedLabUsefulness: form.guidedLabUsefulness,
        mainGoal: form.mainGoal,
        name: form.name.trim(),
        organizationName: cleanOptional(form.organizationName),
        preferredContactChannel: form.preferredContactChannel,
        profile: form.profile as OnboardingProfile,
        securityExperience: form.securityExperience as SecurityExperience,
        solanaLevel: form.solanaLevel as SolanaLevel,
        source: "landing_onboarding",
        utmCampaign: cleanOptional(searchParams.get("utm_campaign") ?? ""),
        utmMedium: cleanOptional(searchParams.get("utm_medium") ?? ""),
        utmSource: cleanOptional(searchParams.get("utm_source") ?? ""),
      });
      setIsSubmitted(true);
    } catch (error) {
      setErrors({
        submission:
          error instanceof Error
            ? error.message
            : "We could not submit your application. Try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      id="onboarding"
      aria-labelledby="onboarding-title"
      className="scroll-mt-24 border-y border-border bg-card/40"
    >
      <div className="grid min-h-[620px] lg:grid-cols-[0.72fr_1.28fr]">
        <div className="border-b border-border px-6 py-10 sm:px-10 lg:border-b-0 lg:border-r lg:py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#14f195]">
            Private beta
          </p>
          <h2
            id="onboarding-title"
            className="mt-5 max-w-md text-4xl font-semibold tracking-[-0.055em] sm:text-5xl"
          >
            Help us place you in the right beta group.
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-muted">
            Tell us where you are in your Solana security journey. We review
            each application before opening access.
          </p>

          <div className="mt-10 space-y-4 border-t border-border pt-6 text-sm text-muted">
            <p className="flex items-start gap-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#14f195]" />
              Four short steps
            </p>
            <p className="flex items-start gap-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#14f195]" />
              No wallet required
            </p>
            <p className="flex items-start gap-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#14f195]" />
              Applications are reviewed manually
            </p>
          </div>
        </div>

        <div className="px-6 py-8 sm:px-10 lg:px-12 lg:py-12">
          {isSubmitted ? (
            <OnboardingSuccess />
          ) : (
            <form aria-busy={isSubmitting} noValidate onSubmit={handleSubmit}>
              <QuestionnaireProgress currentStep={currentStep} />

              <div className="mt-10 min-h-[390px]">
                {currentStep === 0 ? (
                  <ContactStep
                    errors={errors}
                    form={form}
                    updateField={updateField}
                  />
                ) : null}
                {currentStep === 1 ? (
                  <ProfileStep
                    errors={errors}
                    form={form}
                    updateField={updateField}
                  />
                ) : null}
                {currentStep === 2 ? (
                  <LearningStep
                    errors={errors}
                    form={form}
                    updateField={updateField}
                  />
                ) : null}
                {currentStep === 3 ? (
                  <BetaFitStep
                    errors={errors}
                    form={form}
                    updateField={updateField}
                  />
                ) : null}
              </div>

              {errors.submission ? (
                <div
                  role="alert"
                  className="mt-6 flex items-start gap-3 rounded-lg border border-red-400/20 bg-red-500/[0.06] px-4 py-3 text-sm leading-6 text-red-200"
                >
                  <AlertCircle
                    className="mt-1 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-medium">Application not submitted</p>
                    <p className="text-red-200/75">{errors.submission}</p>
                  </div>
                </div>
              ) : null}

              <div className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6">
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  disabled={currentStep === 0 || isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-muted transition enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195]"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back
                </button>

                {currentStep < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={goToNextStep}
                    className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-5 text-sm font-semibold text-white transition hover:bg-[#8b35f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  >
                    Continue
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-5 text-sm font-semibold text-white transition hover:bg-[#8b35f6] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  >
                    {isSubmitting ? "Submitting..." : "Request Beta Access"}
                    {!isSubmitting ? (
                      <ArrowRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function QuestionnaireProgress({ currentStep }: { currentStep: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <p className="font-medium text-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </p>
        <p className="text-muted">{STEPS[currentStep]}</p>
      </div>
      <div
        className="mt-3 h-1 overflow-hidden rounded-full bg-accent"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-[#9945ff] transition-[width] duration-200"
          style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

function ContactStep({ errors, form, updateField }: StepProps) {
  const contactPlaceholder =
    form.preferredContactChannel === "email"
      ? "you@example.com"
      : form.preferredContactChannel === "telegram"
        ? "@username"
        : "username";

  return (
    <div>
      <StepHeading
        title="How should we identify and contact you?"
        description="Use the contact channel you check most often."
      />
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Field label="Name or handle" error={errors.name} fieldId="name">
          <input
            id="onboarding-name"
            autoComplete="name"
            aria-invalid={errors.name ? "true" : undefined}
            aria-describedby={errors.name ? "onboarding-name-error" : undefined}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Your name"
            spellCheck={false}
            value={form.name}
            className={inputClass(errors.name)}
          />
        </Field>

        <Field
          label="Preferred contact"
          error={undefined}
          fieldId="preferredContactChannel"
        >
          <select
            id="onboarding-preferredContactChannel"
            value={form.preferredContactChannel}
            onChange={(event) =>
              updateField(
                "preferredContactChannel",
                event.target.value as PreferredContactChannel
              )
            }
            className={inputClass()}
          >
            <option value="email">Email</option>
            <option value="telegram">Telegram</option>
            <option value="discord">Discord</option>
          </select>
        </Field>

        <div className="sm:col-span-2">
          <Field label="Contact" error={errors.contact} fieldId="contact">
            <input
              id="onboarding-contact"
              autoComplete={
                form.preferredContactChannel === "email" ? "email" : "off"
              }
              aria-invalid={errors.contact ? "true" : undefined}
              aria-describedby={
                errors.contact ? "onboarding-contact-error" : undefined
              }
              inputMode={
                form.preferredContactChannel === "email" ? "email" : "text"
              }
              onChange={(event) => updateField("contact", event.target.value)}
              placeholder={contactPlaceholder}
              spellCheck={false}
              type={form.preferredContactChannel === "email" ? "email" : "text"}
              value={form.contact}
              className={inputClass(errors.contact)}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function ProfileStep({ errors, form, updateField }: StepProps) {
  return (
    <div>
      <StepHeading
        title="Where are you in the Solana ecosystem?"
        description="Choose the options that best describe your current work."
      />
      <div className="mt-8 space-y-8">
        <OptionGroup
          id="profile"
          legend="Your profile"
          error={errors.profile}
          options={PROFILE_OPTIONS}
          value={form.profile}
          onChange={(value) =>
            updateField("profile", value as OnboardingProfile)
          }
        />
        <OptionGroup
          id="solanaLevel"
          legend="Solana experience"
          error={errors.solanaLevel}
          options={SOLANA_LEVEL_OPTIONS}
          value={form.solanaLevel}
          onChange={(value) => updateField("solanaLevel", value as SolanaLevel)}
        />
        <OptionGroup
          id="securityExperience"
          legend="Security experience"
          error={errors.securityExperience}
          options={SECURITY_OPTIONS}
          value={form.securityExperience}
          onChange={(value) =>
            updateField("securityExperience", value as SecurityExperience)
          }
        />
      </div>
    </div>
  );
}

function LearningStep({ errors, form, updateField }: StepProps) {
  return (
    <div>
      <StepHeading
        title="What do you want to improve?"
        description="Select every answer that applies."
      />
      <div className="mt-8 space-y-8">
        <MultiOptionGroup
          id="mainGoal"
          legend="Main goals"
          error={errors.mainGoal}
          options={GOAL_OPTIONS}
          values={form.mainGoal}
          onToggle={(value) =>
            updateField(
              "mainGoal",
              toggleArrayValue(form.mainGoal, value as MainGoal)
            )
          }
        />
        <MultiOptionGroup
          id="currentLearningSources"
          legend="Where do you learn security today?"
          error={errors.currentLearningSources}
          options={LEARNING_SOURCE_OPTIONS}
          values={form.currentLearningSources}
          onToggle={(value) => {
            const source = value as LearningSource;
            const nextSources =
              source === "no_clear_path"
                ? form.currentLearningSources.includes(source)
                  ? []
                  : [source]
                : toggleArrayValue(
                    form.currentLearningSources.filter(
                      (item) => item !== "no_clear_path"
                    ),
                    source
                  );
            updateField("currentLearningSources", nextSources);
          }}
        />
        <RatingGroup
          error={errors.guidedLabUsefulness}
          value={form.guidedLabUsefulness}
          onChange={(value) => updateField("guidedLabUsefulness", value)}
        />
      </div>
    </div>
  );
}

function BetaFitStep({ errors, form, updateField }: StepProps) {
  return (
    <div>
      <StepHeading
        title="How would you participate in the beta?"
        description="This helps us plan access groups and feedback sessions."
      />
      <div className="mt-8 space-y-8">
        <OptionGroup
          id="betaIntent"
          legend="When could you try SolBreach?"
          error={errors.betaIntent}
          options={BETA_INTENT_OPTIONS}
          value={form.betaIntent}
          onChange={(value) => updateField("betaIntent", value as BetaIntent)}
        />
        <OptionGroup
          id="feedbackWillingness"
          legend="How would you prefer to share feedback?"
          error={errors.feedbackWillingness}
          options={FEEDBACK_OPTIONS}
          value={form.feedbackWillingness}
          onChange={(value) =>
            updateField("feedbackWillingness", value as FeedbackWillingness)
          }
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Organization or community (optional)"
            fieldId="organizationName"
          >
            <input
              id="onboarding-organizationName"
              autoComplete="organization"
              maxLength={200}
              onChange={(event) =>
                updateField("organizationName", event.target.value)
              }
              placeholder="Organization name"
              value={form.organizationName}
              className={inputClass()}
            />
          </Field>
          <Field
            label="Future labs you want (optional)"
            fieldId="futureLabsInterest"
          >
            <input
              id="onboarding-futureLabsInterest"
              maxLength={1000}
              onChange={(event) =>
                updateField("futureLabsInterest", event.target.value)
              }
              placeholder="Signer checks, CPI, token logic..."
              value={form.futureLabsInterest}
              className={inputClass()}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Anything else? (optional)" fieldId="additionalNotes">
              <textarea
                id="onboarding-additionalNotes"
                maxLength={1000}
                onChange={(event) =>
                  updateField("additionalNotes", event.target.value)
                }
                placeholder="Add context that would help us review your application."
                rows={3}
                value={form.additionalNotes}
                className={`${inputClass()} min-h-24 resize-y py-3`}
              />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingSuccess() {
  return (
    <div className="flex min-h-[520px] max-w-xl flex-col justify-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#14f195]/30 bg-[#14f195]/10 text-[#14f195]">
        <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.28em] text-[#14f195]">
        Application received
      </p>
      <h3 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">
        Thanks for helping shape the beta.
      </h3>
      <p className="mt-5 text-base leading-7 text-muted">
        We will review your answers and use your preferred contact channel if a
        beta group matches your profile.
      </p>
      <a
        href="https://solbreach.gitbook.io/documentation"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-full border border-border bg-accent/70 px-5 text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195]"
      >
        Explore the documentation
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  );
}

type StepProps = {
  errors: FormErrors;
  form: FormState;
  updateField: <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => void;
};

function StepHeading({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div>
      <h3 className="text-2xl font-semibold tracking-[-0.035em]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

function Field({
  children,
  error,
  fieldId,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  fieldId: string;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={`onboarding-${fieldId}`}
        className="text-sm font-medium text-foreground"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p id={`onboarding-${fieldId}-error`} className="text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function OptionGroup({
  error,
  id,
  legend,
  onChange,
  options,
  value,
}: {
  error?: string;
  id: string;
  legend: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <fieldset
      id={`onboarding-${id}`}
      aria-describedby={error ? `onboarding-${id}-error` : undefined}
      tabIndex={-1}
    >
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition ${
              value === option.value
                ? "border-[#9945ff]/55 bg-[#9945ff]/10 text-foreground"
                : "border-border bg-background/45 text-muted hover:border-white/20 hover:text-foreground"
            }`}
          >
            <input
              type="radio"
              name={id}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="h-4 w-4 accent-[#9945ff]"
            />
            {option.label}
          </label>
        ))}
      </div>
      {error ? (
        <p id={`onboarding-${id}-error`} className="mt-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function MultiOptionGroup({
  error,
  id,
  legend,
  onToggle,
  options,
  values,
}: {
  error?: string;
  id: string;
  legend: string;
  onToggle: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  values: string[];
}) {
  return (
    <fieldset
      id={`onboarding-${id}`}
      aria-describedby={error ? `onboarding-${id}-error` : undefined}
      tabIndex={-1}
    >
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = values.includes(option.value);
          return (
            <label
              key={option.value}
              className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                checked
                  ? "border-[#9945ff]/55 bg-[#9945ff]/10 text-foreground"
                  : "border-border bg-background/45 text-muted hover:border-white/20 hover:text-foreground"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(option.value)}
                className="sr-only"
              />
              {checked ? (
                <Check className="h-3.5 w-3.5 text-[#b892ff]" aria-hidden />
              ) : null}
              {option.label}
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={`onboarding-${id}-error`} className="mt-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function RatingGroup({
  error,
  onChange,
  value,
}: {
  error?: string;
  onChange: (value: number) => void;
  value: number | null;
}) {
  return (
    <fieldset
      id="onboarding-guidedLabUsefulness"
      aria-describedby={
        error ? "onboarding-guidedLabUsefulness-error" : undefined
      }
      tabIndex={-1}
    >
      <legend className="text-sm font-medium text-foreground">
        How useful would guided, hands-on security labs be for you?
      </legend>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <label
            key={score}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium transition ${
              value === score
                ? "border-[#9945ff]/55 bg-[#9945ff]/10 text-foreground"
                : "border-border bg-background/45 text-muted hover:border-white/20 hover:text-foreground"
            }`}
          >
            <input
              type="radio"
              name="guidedLabUsefulness"
              checked={value === score}
              onChange={() => onChange(score)}
              className="sr-only"
            />
            {score}
          </label>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>Not useful</span>
        <span>Very useful</span>
      </div>
      {error ? (
        <p
          id="onboarding-guidedLabUsefulness-error"
          className="mt-2 text-xs text-red-300"
        >
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function inputClass(error?: string) {
  return `min-h-11 w-full rounded-lg border bg-background/55 px-3 text-sm text-foreground outline-none transition placeholder:text-muted/55 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
    error
      ? "border-red-400/45"
      : "border-border focus-visible:border-[#9945ff]/50"
  }`;
}
