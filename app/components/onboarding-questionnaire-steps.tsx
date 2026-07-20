import type {
  LearningSource,
  MainGoal,
  OnboardingProfile,
  PreferredContactChannel,
  SecurityExperience,
  SolanaLevel,
} from "../lib/onboarding";
import {
  errorDescription,
  Field,
  inputClass,
  MultiOptionGroup,
  OptionGroup,
  RatingGroup,
  StepHeading,
} from "./onboarding-questionnaire-fields";
import {
  BETA_INTENT_OPTIONS,
  FEEDBACK_OPTIONS,
  GOAL_OPTIONS,
  LEARNING_SOURCE_OPTIONS,
  PROFILE_OPTIONS,
  SECURITY_OPTIONS,
  SOLANA_LEVEL_OPTIONS,
  type OnboardingFormErrors,
  type OnboardingFormState,
} from "./onboarding-questionnaire-model";

export type UpdateOnboardingField = <K extends keyof OnboardingFormState>(
  field: K,
  value: OnboardingFormState[K]
) => void;

type StepProps = {
  errors: OnboardingFormErrors;
  form: OnboardingFormState;
  updateField: UpdateOnboardingField;
};

export function QuestionnaireStep({
  currentStep,
  ...props
}: StepProps & { currentStep: number }) {
  if (currentStep === 0) return <ContactStep {...props} />;
  if (currentStep === 1) return <ProfileStep {...props} />;
  if (currentStep === 2) return <LearningStep {...props} />;
  return <BetaFitStep {...props} />;
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
            aria-describedby={errorDescription("name", errors.name)}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Your name"
            spellCheck={false}
            value={form.name}
            className={inputClass(errors.name)}
          />
        </Field>

        <Field label="Preferred contact" fieldId="preferredContactChannel">
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
              aria-describedby={errorDescription("contact", errors.contact)}
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
            const current = form.currentLearningSources;
            const next =
              source === "no_clear_path"
                ? current.includes(source)
                  ? []
                  : [source]
                : toggleArrayValue(
                    current.filter((item) => item !== "no_clear_path"),
                    source
                  );
            updateField("currentLearningSources", next);
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
          onChange={(value) =>
            updateField(
              "betaIntent",
              value as OnboardingFormState["betaIntent"]
            )
          }
        />
        <OptionGroup
          id="feedbackWillingness"
          legend="How would you prefer to share feedback?"
          error={errors.feedbackWillingness}
          options={FEEDBACK_OPTIONS}
          value={form.feedbackWillingness}
          onChange={(value) =>
            updateField(
              "feedbackWillingness",
              value as OnboardingFormState["feedbackWillingness"]
            )
          }
        />
        <OptionalFields form={form} updateField={updateField} />
      </div>
    </div>
  );
}

function OptionalFields({
  form,
  updateField,
}: Pick<StepProps, "form" | "updateField">) {
  return (
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
  );
}

function toggleArrayValue<T extends string>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}
