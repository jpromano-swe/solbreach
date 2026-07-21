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
  type OnboardingFormErrors,
  type OnboardingFormState,
  type OnboardingPageId,
} from "./onboarding-questionnaire-model";
import type { OnboardingCopy } from "./onboarding-questionnaire-copy";

export type UpdateOnboardingField = <K extends keyof OnboardingFormState>(
  field: K,
  value: OnboardingFormState[K]
) => void;

type StepProps = {
  copy: OnboardingCopy;
  errors: OnboardingFormErrors;
  form: OnboardingFormState;
  updateField: UpdateOnboardingField;
};

export function QuestionnaireStep({
  pageId,
  ...props
}: StepProps & { pageId: OnboardingPageId }) {
  if (pageId === "contact") return <ContactStep {...props} />;
  if (pageId === "profileGroup") return <ProfileStep {...props} />;
  if (pageId === "learningGroup") return <LearningStep {...props} />;
  if (pageId === "betaGroup") return <BetaFitStep {...props} />;
  if (pageId === "review") return <ReviewStep {...props} />;
  if (
    pageId === "profile" ||
    pageId === "solanaLevel" ||
    pageId === "securityExperience"
  ) {
    return <ProfileQuestionStep {...props} question={pageId} />;
  }
  if (
    pageId === "mainGoal" ||
    pageId === "currentLearningSources" ||
    pageId === "guidedLabUsefulness"
  ) {
    return <LearningQuestionStep {...props} question={pageId} />;
  }
  if (pageId === "betaIntent" || pageId === "feedbackWillingness") {
    return <BetaQuestionStep {...props} question={pageId} />;
  }
  return <OptionalStep {...props} />;
}

function ContactStep({ copy, errors, form, updateField }: StepProps) {
  const contactPlaceholder =
    form.preferredContactChannel === "email" ? "you@example.com" : "@username";

  return (
    <div>
      <StepHeading
        title={copy.contact.title}
        description={copy.contact.description}
      />
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Field
          label={copy.contact.nameLabel}
          error={errors.name}
          fieldId="name"
        >
          <input
            id="onboarding-name"
            autoComplete="name"
            aria-invalid={errors.name ? "true" : undefined}
            aria-describedby={errorDescription("name", errors.name)}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder={copy.contact.namePlaceholder}
            spellCheck={false}
            value={form.name}
            className={inputClass(errors.name)}
          />
        </Field>

        <Field
          label={copy.contact.preferredLabel}
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
          </select>
        </Field>

        <div className="sm:col-span-2">
          <Field
            label={copy.contact.contactLabel}
            error={errors.contact}
            fieldId="contact"
          >
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

function ProfileStep({ copy, errors, form, updateField }: StepProps) {
  return (
    <div>
      <StepHeading
        title={copy.profile.title}
        description={copy.profile.description}
      />
      <div className="mt-8 space-y-8">
        <OptionGroup
          id="profile"
          legend={copy.profile.profileLegend}
          error={errors.profile}
          options={copy.options.profiles}
          value={form.profile}
          onChange={(value) =>
            updateField("profile", value as OnboardingProfile)
          }
        />
        <OptionGroup
          id="solanaLevel"
          legend={copy.profile.solanaLegend}
          error={errors.solanaLevel}
          options={copy.options.solanaLevels}
          value={form.solanaLevel}
          onChange={(value) => updateField("solanaLevel", value as SolanaLevel)}
        />
        <OptionGroup
          id="securityExperience"
          legend={copy.profile.securityLegend}
          error={errors.securityExperience}
          options={copy.options.security}
          value={form.securityExperience}
          onChange={(value) =>
            updateField("securityExperience", value as SecurityExperience)
          }
        />
      </div>
    </div>
  );
}

function ProfileQuestionStep({
  copy,
  errors,
  form,
  question,
  updateField,
}: StepProps & {
  question: "profile" | "securityExperience" | "solanaLevel";
}) {
  if (question === "profile") {
    return (
      <div>
        <StepHeading
          title={copy.profile.profileLegend}
          description={copy.profile.description}
        />
        <div className="mt-8">
          <OptionGroup
            hideLegend
            id="profile"
            legend={copy.profile.profileLegend}
            error={errors.profile}
            options={copy.options.profiles}
            value={form.profile}
            onChange={(value) =>
              updateField("profile", value as OnboardingProfile)
            }
          />
        </div>
      </div>
    );
  }

  if (question === "solanaLevel") {
    return (
      <div>
        <StepHeading
          title={copy.profile.solanaLegend}
          description={copy.profile.description}
        />
        <div className="mt-8">
          <OptionGroup
            hideLegend
            id="solanaLevel"
            legend={copy.profile.solanaLegend}
            error={errors.solanaLevel}
            options={copy.options.solanaLevels}
            value={form.solanaLevel}
            onChange={(value) =>
              updateField("solanaLevel", value as SolanaLevel)
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <StepHeading
        title={copy.profile.securityLegend}
        description={copy.profile.description}
      />
      <div className="mt-8">
        <OptionGroup
          hideLegend
          id="securityExperience"
          legend={copy.profile.securityLegend}
          error={errors.securityExperience}
          options={copy.options.security}
          value={form.securityExperience}
          onChange={(value) =>
            updateField("securityExperience", value as SecurityExperience)
          }
        />
      </div>
    </div>
  );
}

function LearningStep({ copy, errors, form, updateField }: StepProps) {
  return (
    <div>
      <StepHeading
        title={copy.learning.title}
        description={copy.learning.description}
      />
      <div className="mt-8 space-y-8">
        <MultiOptionGroup
          id="mainGoal"
          legend={copy.learning.goalsLegend}
          error={errors.mainGoal}
          options={copy.options.goals}
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
          legend={copy.learning.sourcesLegend}
          error={errors.currentLearningSources}
          options={copy.options.learningSources}
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
          copy={copy}
          error={errors.guidedLabUsefulness}
          value={form.guidedLabUsefulness}
          onChange={(value) => updateField("guidedLabUsefulness", value)}
        />
      </div>
    </div>
  );
}

function LearningQuestionStep({
  copy,
  errors,
  form,
  question,
  updateField,
}: StepProps & {
  question: "currentLearningSources" | "guidedLabUsefulness" | "mainGoal";
}) {
  if (question === "mainGoal") {
    return (
      <div>
        <StepHeading
          title={copy.learning.goalsLegend}
          description={copy.learning.description}
        />
        <div className="mt-8">
          <MultiOptionGroup
            hideLegend
            id="mainGoal"
            legend={copy.learning.goalsLegend}
            error={errors.mainGoal}
            options={copy.options.goals}
            values={form.mainGoal}
            onToggle={(value) =>
              updateField(
                "mainGoal",
                toggleArrayValue(form.mainGoal, value as MainGoal)
              )
            }
          />
        </div>
      </div>
    );
  }

  if (question === "currentLearningSources") {
    return (
      <div>
        <StepHeading
          title={copy.learning.sourcesLegend}
          description={copy.learning.description}
        />
        <div className="mt-8">
          <LearningSourcesGroup
            copy={copy}
            errors={errors}
            form={form}
            hideLegend
            updateField={updateField}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <StepHeading
        title={copy.learning.ratingLegend}
        description={copy.learning.description}
      />
      <div className="mt-8">
        <RatingGroup
          copy={copy}
          error={errors.guidedLabUsefulness}
          hideLegend
          value={form.guidedLabUsefulness}
          onChange={(value) => updateField("guidedLabUsefulness", value)}
        />
      </div>
    </div>
  );
}

function BetaFitStep({ copy, errors, form, updateField }: StepProps) {
  return (
    <div>
      <StepHeading
        title={copy.beta.title}
        description={copy.beta.description}
      />
      <div className="mt-8 space-y-8">
        <OptionGroup
          id="betaIntent"
          legend={copy.beta.intentLegend}
          error={errors.betaIntent}
          options={copy.options.betaIntent}
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
          legend={copy.beta.feedbackLegend}
          error={errors.feedbackWillingness}
          options={copy.options.feedback}
          value={form.feedbackWillingness}
          onChange={(value) =>
            updateField(
              "feedbackWillingness",
              value as OnboardingFormState["feedbackWillingness"]
            )
          }
        />
        <OptionalFields copy={copy} form={form} updateField={updateField} />
      </div>
    </div>
  );
}

function BetaQuestionStep({
  copy,
  errors,
  form,
  question,
  updateField,
}: StepProps & {
  question: "betaIntent" | "feedbackWillingness";
}) {
  const isIntent = question === "betaIntent";
  const title = isIntent ? copy.beta.intentLegend : copy.beta.feedbackLegend;

  return (
    <div>
      <StepHeading title={title} description={copy.beta.description} />
      <div className="mt-8">
        <OptionGroup
          hideLegend
          id={question}
          legend={title}
          error={isIntent ? errors.betaIntent : errors.feedbackWillingness}
          options={isIntent ? copy.options.betaIntent : copy.options.feedback}
          value={isIntent ? form.betaIntent : form.feedbackWillingness}
          onChange={(value) =>
            updateField(question, value as OnboardingFormState[typeof question])
          }
        />
      </div>
    </div>
  );
}

function OptionalStep({
  copy,
  form,
  updateField,
}: Pick<StepProps, "copy" | "form" | "updateField">) {
  return (
    <div>
      <StepHeading
        title={copy.beta.optionalTitle}
        description={copy.beta.optionalDescription}
      />
      <div className="mt-8">
        <OptionalFields copy={copy} form={form} updateField={updateField} />
      </div>
    </div>
  );
}

function ReviewStep({ copy, form }: Pick<StepProps, "copy" | "form">) {
  const details = [
    { label: copy.review.nameLabel, value: form.name.trim() },
    { label: copy.review.contactLabel, value: form.contact.trim() },
    {
      label: copy.review.companyLabel,
      value: form.organizationName.trim() || copy.review.notProvided,
    },
  ];

  return (
    <div>
      <StepHeading
        title={copy.review.title}
        description={copy.review.description}
      />
      <dl className="mt-8 divide-y divide-border border-y border-border">
        {details.map((detail) => (
          <div
            key={detail.label}
            className="grid gap-1 py-4 sm:grid-cols-[140px_1fr] sm:items-center"
          >
            <dt
              data-language-line
              className="text-xs font-semibold uppercase tracking-[0.16em] text-muted"
            >
              {detail.label}
            </dt>
            <dd className="break-words text-sm font-medium text-foreground sm:text-right">
              {detail.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function LearningSourcesGroup({
  copy,
  errors,
  form,
  hideLegend = false,
  updateField,
}: StepProps & { hideLegend?: boolean }) {
  return (
    <MultiOptionGroup
      hideLegend={hideLegend}
      id="currentLearningSources"
      legend={copy.learning.sourcesLegend}
      error={errors.currentLearningSources}
      options={copy.options.learningSources}
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
  );
}

function OptionalFields({
  copy,
  form,
  updateField,
}: Pick<StepProps, "copy" | "form" | "updateField">) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label={copy.beta.organizationLabel} fieldId="organizationName">
        <input
          id="onboarding-organizationName"
          autoComplete="organization"
          maxLength={200}
          onChange={(event) =>
            updateField("organizationName", event.target.value)
          }
          placeholder={copy.beta.organizationPlaceholder}
          value={form.organizationName}
          className={inputClass()}
        />
      </Field>
      <Field label={copy.beta.futureLabsLabel} fieldId="futureLabsInterest">
        <input
          id="onboarding-futureLabsInterest"
          maxLength={1000}
          onChange={(event) =>
            updateField("futureLabsInterest", event.target.value)
          }
          placeholder={copy.beta.futureLabsPlaceholder}
          value={form.futureLabsInterest}
          className={inputClass()}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label={copy.beta.additionalLabel} fieldId="additionalNotes">
          <textarea
            id="onboarding-additionalNotes"
            maxLength={1000}
            onChange={(event) =>
              updateField("additionalNotes", event.target.value)
            }
            placeholder={copy.beta.additionalPlaceholder}
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
