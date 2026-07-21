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
  type BetaInterest,
  type CustomerProfile,
  type LearningAction,
  type LearningBlocker,
  type LearningFormat,
  type OnboardingFormErrors,
  type OnboardingFormState,
  type OnboardingQuestionId,
  type PracticeSignal,
  type RealExperience,
  type SecurityLearningAttempt,
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
}: StepProps & { pageId: OnboardingQuestionId }) {
  switch (pageId) {
    case "profile":
      return <ProfileStep {...props} />;
    case "realExperience":
      return <RealExperienceStep {...props} />;
    case "securityLearningAttempt":
      return <SecurityLearningStep {...props} />;
    case "learningActions":
      return <LearningActionsStep {...props} />;
    case "learningBlockers":
      return <LearningBlockersStep {...props} />;
    case "hardestPracticeStep":
      return <HardestPracticeStep {...props} />;
    case "preferredFormats":
      return <PreferredFormatsStep {...props} />;
    case "practiceSignals":
      return <PracticeSignalsStep {...props} />;
    case "problemIntensity":
      return <ProblemIntensityStep {...props} />;
    case "betaIntent":
      return <BetaIntentStep {...props} />;
    case "review":
      return <ReviewStep {...props} />;
  }
}

function ProfileStep({ copy, errors, form, updateField }: StepProps) {
  const question = copy.questions.profile;
  return (
    <QuestionFrame title={question.title} description={question.description}>
      <OptionGroup
        hideLegend
        id="profile"
        legend={question.title}
        error={errors.profile}
        options={copy.options.profiles}
        value={form.profile}
        onChange={(value) => updateField("profile", value as CustomerProfile)}
      />
    </QuestionFrame>
  );
}

function RealExperienceStep({ copy, errors, form, updateField }: StepProps) {
  const question = copy.questions.realExperience;
  return (
    <QuestionFrame title={question.title} description={question.description}>
      <MultiOptionGroup
        hideLegend
        id="realExperience"
        legend={question.title}
        error={errors.realExperience}
        options={copy.options.realExperience}
        values={form.realExperience}
        onToggle={(value) =>
          updateField(
            "realExperience",
            exclusiveToggle(
              form.realExperience,
              value as RealExperience,
              "not_built_anything"
            )
          )
        }
      />
    </QuestionFrame>
  );
}

function SecurityLearningStep({ copy, errors, form, updateField }: StepProps) {
  const question = copy.questions.securityLearningAttempt;
  return (
    <QuestionFrame title={question.title} description={question.description}>
      <OptionGroup
        hideLegend
        id="securityLearningAttempt"
        legend={question.title}
        error={errors.securityLearningAttempt}
        options={copy.options.securityLearningAttempt}
        value={form.securityLearningAttempt}
        onChange={(value) =>
          updateField(
            "securityLearningAttempt",
            value as SecurityLearningAttempt
          )
        }
      />
    </QuestionFrame>
  );
}

function LearningActionsStep({ copy, errors, form, updateField }: StepProps) {
  const question = copy.questions.learningActions;
  return (
    <QuestionFrame title={question.title} description={question.description}>
      <MultiOptionGroup
        hideLegend
        id="learningActions"
        legend={question.title}
        error={errors.learningActions}
        options={copy.options.learningActions}
        values={form.learningActions}
        onToggle={(value) =>
          updateField(
            "learningActions",
            exclusiveToggle(
              form.learningActions,
              value as LearningAction,
              "nothing_concrete"
            )
          )
        }
      />
    </QuestionFrame>
  );
}

function LearningBlockersStep({ copy, errors, form, updateField }: StepProps) {
  const question = copy.questions.learningBlockers;
  return (
    <QuestionFrame title={question.title} description={question.description}>
      <MultiOptionGroup
        hideLegend
        id="learningBlockers"
        legend={question.title}
        error={errors.learningBlockers}
        options={copy.options.learningBlockers}
        values={form.learningBlockers}
        onToggle={(value) =>
          updateField(
            "learningBlockers",
            exclusiveToggle(
              form.learningBlockers,
              value as LearningBlocker,
              "not_stuck"
            )
          )
        }
      />
    </QuestionFrame>
  );
}

function HardestPracticeStep({ copy, errors, form, updateField }: StepProps) {
  const question = copy.questions.hardestPracticeStep;
  return (
    <QuestionFrame title={question.title} description={question.description}>
      <Field
        label={question.title}
        error={errors.hardestPracticeStep}
        fieldId="hardestPracticeStep"
      >
        <textarea
          id="onboarding-hardestPracticeStep"
          aria-invalid={errors.hardestPracticeStep ? "true" : undefined}
          aria-describedby={errorDescription(
            "hardestPracticeStep",
            errors.hardestPracticeStep
          )}
          maxLength={600}
          onChange={(event) =>
            updateField("hardestPracticeStep", event.target.value)
          }
          placeholder={question.placeholder}
          rows={7}
          value={form.hardestPracticeStep}
          className={`${inputClass(errors.hardestPracticeStep)} min-h-44 resize-y py-3 leading-6`}
        />
      </Field>
    </QuestionFrame>
  );
}

function PreferredFormatsStep({ copy, errors, form, updateField }: StepProps) {
  const question = copy.questions.preferredFormats;
  return (
    <QuestionFrame title={question.title} description={question.description}>
      <MultiOptionGroup
        hideLegend
        id="preferredFormats"
        legend={question.title}
        error={errors.preferredFormats}
        options={copy.options.preferredFormats}
        values={form.preferredFormats}
        onToggle={(value) =>
          updateField(
            "preferredFormats",
            toggleArrayValue(form.preferredFormats, value as LearningFormat)
          )
        }
      />
    </QuestionFrame>
  );
}

function PracticeSignalsStep({ copy, errors, form, updateField }: StepProps) {
  const question = copy.questions.practiceSignals;
  return (
    <QuestionFrame title={question.title} description={question.description}>
      <MultiOptionGroup
        hideLegend
        id="practiceSignals"
        legend={question.title}
        error={errors.practiceSignals}
        options={copy.options.practiceSignals}
        values={form.practiceSignals}
        onToggle={(value) =>
          updateField(
            "practiceSignals",
            toggleArrayValue(form.practiceSignals, value as PracticeSignal)
          )
        }
      />
    </QuestionFrame>
  );
}

function ProblemIntensityStep({ copy, errors, form, updateField }: StepProps) {
  const question = copy.questions.problemIntensity;
  return (
    <QuestionFrame title={question.title} description={question.description}>
      <div className="space-y-7">
        <RatingGroup
          hideLegend
          id="problemIntensity"
          legend={question.title}
          error={errors.problemIntensity}
          maxLabel={question.max}
          minLabel={question.min}
          value={form.problemIntensity}
          onChange={(value) => updateField("problemIntensity", value)}
        />
        <Field label={question.reasonLabel} fieldId="problemIntensityReason">
          <input
            id="onboarding-problemIntensityReason"
            maxLength={240}
            onChange={(event) =>
              updateField("problemIntensityReason", event.target.value)
            }
            placeholder={question.reasonPlaceholder}
            value={form.problemIntensityReason}
            className={inputClass()}
          />
        </Field>
      </div>
    </QuestionFrame>
  );
}

function BetaIntentStep({ copy, errors, form, updateField }: StepProps) {
  const question = copy.questions.betaIntent;
  const needsContact = Boolean(
    form.betaIntent && form.betaIntent !== "not_now"
  );

  return (
    <QuestionFrame title={question.title} description={question.description}>
      <div className="space-y-7">
        <OptionGroup
          hideLegend
          id="betaIntent"
          legend={question.title}
          error={errors.betaIntent}
          options={copy.options.betaIntent}
          value={form.betaIntent}
          onChange={(value) => updateField("betaIntent", value as BetaInterest)}
        />
        {needsContact ? (
          <div className="border-t border-border pt-6">
            <Field
              label={question.contactLabel}
              error={errors.contact}
              fieldId="contact"
            >
              <input
                id="onboarding-contact"
                autoComplete="off"
                aria-invalid={errors.contact ? "true" : undefined}
                aria-describedby={errorDescription("contact", errors.contact)}
                maxLength={320}
                onChange={(event) => updateField("contact", event.target.value)}
                placeholder={question.contactPlaceholder}
                spellCheck={false}
                value={form.contact}
                className={inputClass(errors.contact)}
              />
            </Field>
          </div>
        ) : null}
      </div>
    </QuestionFrame>
  );
}

function ReviewStep({ copy, form }: StepProps) {
  const details = [
    {
      label: copy.review.labels.profile,
      value: optionLabel(copy.options.profiles, form.profile),
    },
    {
      label: copy.review.labels.realExperience,
      value: optionLabels(copy.options.realExperience, form.realExperience),
    },
    {
      label: copy.review.labels.securityLearningAttempt,
      value: optionLabel(
        copy.options.securityLearningAttempt,
        form.securityLearningAttempt
      ),
    },
    {
      label: copy.review.labels.learningActions,
      value: optionLabels(copy.options.learningActions, form.learningActions),
    },
    {
      label: copy.review.labels.learningBlockers,
      value: optionLabels(copy.options.learningBlockers, form.learningBlockers),
    },
    {
      label: copy.review.labels.hardestPracticeStep,
      value: form.hardestPracticeStep.trim(),
    },
    {
      label: copy.review.labels.preferredFormats,
      value: optionLabels(copy.options.preferredFormats, form.preferredFormats),
    },
    {
      label: copy.review.labels.practiceSignals,
      value: optionLabels(copy.options.practiceSignals, form.practiceSignals),
    },
    {
      label: copy.review.labels.problemIntensity,
      value: form.problemIntensity
        ? `${form.problemIntensity}/5${
            form.problemIntensityReason.trim()
              ? ` — ${form.problemIntensityReason.trim()}`
              : ""
          }`
        : copy.review.notProvided,
    },
    {
      label: copy.review.labels.betaIntent,
      value: optionLabel(copy.options.betaIntent, form.betaIntent),
    },
    {
      label: copy.review.contactLabel,
      value:
        form.betaIntent === "not_now"
          ? copy.review.notProvided
          : form.contact.trim() || copy.review.notProvided,
    },
  ];

  return (
    <div>
      <StepHeading
        title={copy.review.title}
        description={copy.review.description}
      />
      <dl className="mt-8 max-h-[430px] divide-y divide-border overflow-y-auto border-y border-border pr-3">
        {details.map((detail) => (
          <div
            key={detail.label}
            className="grid gap-2 py-4 sm:grid-cols-[170px_1fr]"
          >
            <dt
              data-language-line
              className="text-xs font-semibold uppercase tracking-[0.14em] text-muted"
            >
              {detail.label}
            </dt>
            <dd
              data-language-line
              className="break-words text-sm leading-6 text-foreground sm:text-right"
            >
              {detail.value || copy.review.notProvided}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function QuestionFrame({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div>
      <StepHeading title={title} description={description} />
      <div className="mt-8">{children}</div>
    </div>
  );
}

function optionLabel(
  options: readonly { label: string; value: string }[],
  value: string
) {
  return options.find((option) => option.value === value)?.label ?? "";
}

function optionLabels(
  options: readonly { label: string; value: string }[],
  values: string[]
) {
  return values
    .map((value) => optionLabel(options, value))
    .filter(Boolean)
    .join(" · ");
}

function exclusiveToggle<T extends string>(
  values: T[],
  value: T,
  exclusiveValue: T
) {
  if (value === exclusiveValue) {
    return values.includes(value) ? [] : [value];
  }
  return toggleArrayValue(
    values.filter((item) => item !== exclusiveValue),
    value
  );
}

function toggleArrayValue<T extends string>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}
