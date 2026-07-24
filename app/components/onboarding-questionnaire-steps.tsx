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
  type BlockchainSecurityProfile,
  type CustomerProfile,
  type DifficultArea,
  type LearningFormat,
  type OnboardingFormErrors,
  type OnboardingFormState,
  type OnboardingQuestionId,
  type PracticeSignal,
  type RealExperience,
  type SecurityLearningAttempt,
  type StudyTechnique,
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
    case "preferredFormats":
      return <PreferredFormatsStep {...props} />;
    case "blockchainSecurityProfile":
      return <BlockchainSecurityProfileStep {...props} />;
    case "securityLearningAttempt":
      return <SecurityLearningStep {...props} />;
    case "studyTechniques":
      return <StudyTechniquesStep {...props} />;
    case "difficultAreas":
      return <DifficultAreasStep {...props} />;
    case "hardestPracticeStep":
      return <HardestPracticeStep {...props} />;
    case "practiceSignals":
      return <PracticeSignalsStep {...props} />;
    case "securityRelevance":
      return <SecurityRelevanceStep {...props} />;
    case "betaIntent":
      return <BetaIntentStep {...props} />;
    case "contactDetails":
      return <ContactDetailsStep {...props} />;
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

function BlockchainSecurityProfileStep({
  copy,
  errors,
  form,
  updateField,
}: StepProps) {
  const question = copy.questions.blockchainSecurityProfile;
  return (
    <QuestionFrame title={question.title} description={question.description}>
      <OptionGroup
        hideLegend
        id="blockchainSecurityProfile"
        legend={question.title}
        error={errors.blockchainSecurityProfile}
        options={copy.options.blockchainSecurityProfile}
        value={form.blockchainSecurityProfile}
        onChange={(value) =>
          updateField(
            "blockchainSecurityProfile",
            value as BlockchainSecurityProfile
          )
        }
      />
    </QuestionFrame>
  );
}

function StudyTechniquesStep({ copy, errors, form, updateField }: StepProps) {
  const question = copy.questions.studyTechniques;
  return (
    <QuestionFrame title={question.title} description={question.description}>
      <MultiOptionGroup
        hideLegend
        id="studyTechniques"
        legend={question.title}
        error={errors.studyTechniques}
        options={copy.options.studyTechniques}
        values={form.studyTechniques}
        onToggle={(value) =>
          updateField(
            "studyTechniques",
            toggleArrayValue(form.studyTechniques, value as StudyTechnique)
          )
        }
      />
    </QuestionFrame>
  );
}

function DifficultAreasStep({ copy, errors, form, updateField }: StepProps) {
  const question = copy.questions.difficultAreas;
  return (
    <QuestionFrame title={question.title} description={question.description}>
      <MultiOptionGroup
        hideLegend
        id="difficultAreas"
        legend={question.title}
        error={errors.difficultAreas}
        options={copy.options.difficultAreas}
        values={form.difficultAreas}
        onToggle={(value) =>
          updateField(
            "difficultAreas",
            toggleArrayValue(form.difficultAreas, value as DifficultArea)
          )
        }
      />
    </QuestionFrame>
  );
}

function HardestPracticeStep({ copy, errors, form, updateField }: StepProps) {
  const question = copy.questions.hardestPracticeStep;
  const remainingCharacters = 100 - form.hardestPracticeStep.length;

  return (
    <QuestionFrame title={question.title} description={question.description}>
      <Field
        label={copy.review.labels.hardestPracticeStep}
        error={errors.hardestPracticeStep}
        fieldId="hardestPracticeStep"
      >
        <div className="relative pt-2">
          <textarea
            id="onboarding-hardestPracticeStep"
            aria-invalid={errors.hardestPracticeStep ? "true" : undefined}
            aria-describedby={errorDescription(
              "hardestPracticeStep",
              errors.hardestPracticeStep
            )}
            maxLength={100}
            onChange={(event) =>
              updateField("hardestPracticeStep", event.target.value)
            }
            placeholder={question.placeholder}
            rows={4}
            value={form.hardestPracticeStep}
            className={`${inputClass(errors.hardestPracticeStep)} min-h-28 resize-y py-3 pb-8 leading-6`}
          />
          <p className="pointer-events-none absolute bottom-3 right-3 text-xs tabular-nums text-muted">
            {remainingCharacters}/100
          </p>
        </div>
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

function SecurityRelevanceStep({ copy, errors, form, updateField }: StepProps) {
  const question = copy.questions.securityRelevance;
  return (
    <QuestionFrame title={question.title} description={question.description}>
      <RatingGroup
        hideLegend
        id="securityRelevance"
        legend={question.title}
        error={errors.securityRelevance}
        maxLabel={question.max}
        minLabel={question.min}
        value={form.securityRelevance}
        onChange={(value) => updateField("securityRelevance", value)}
      />
    </QuestionFrame>
  );
}

function BetaIntentStep({ copy, errors, form, updateField }: StepProps) {
  const question = copy.questions.betaIntent;

  return (
    <QuestionFrame title={question.title} description={question.description}>
      <OptionGroup
        hideLegend
        id="betaIntent"
        legend={question.title}
        error={errors.betaIntent}
        options={copy.options.betaIntent}
        value={form.betaIntent}
        onChange={(value) => {
          updateField("betaIntent", value as BetaInterest);
          if (value === "not_now") {
            updateField("preferredContactChannel", "");
            updateField("contactName", "");
            updateField("contact", "");
          }
        }}
      />
    </QuestionFrame>
  );
}

function ContactDetailsStep({ copy, errors, form, updateField }: StepProps) {
  const question = copy.questions.contactDetails;
  const hasContactChannel = Boolean(form.preferredContactChannel);
  const contactPlaceholder =
    form.preferredContactChannel === "telegram"
      ? question.contactPlaceholders.telegram
      : question.contactPlaceholders.email;
  const contactType =
    form.preferredContactChannel === "email" ? "email" : "text";
  const autocomplete =
    form.preferredContactChannel === "email" ? "email" : "off";

  return (
    <QuestionFrame title={question.title} description={question.description}>
      <div className="space-y-5">
        <Field
          label={question.contactChannelLabel}
          error={errors.preferredContactChannel}
          fieldId="preferredContactChannel"
        >
          <select
            id="onboarding-preferredContactChannel"
            aria-invalid={errors.preferredContactChannel ? "true" : undefined}
            aria-describedby={errorDescription(
              "preferredContactChannel",
              errors.preferredContactChannel
            )}
            onChange={(event) => {
              updateField(
                "preferredContactChannel",
                event.target
                  .value as OnboardingFormState["preferredContactChannel"]
              );
              updateField("contact", "");
            }}
            value={form.preferredContactChannel}
            className={inputClass(errors.preferredContactChannel)}
          >
            <option value="" disabled>
              {question.contactChannelLabel}
            </option>
            {copy.options.contactChannels.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
            hasContactChannel
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
          aria-hidden={!hasContactChannel}
        >
          <div className="overflow-hidden">
            {hasContactChannel ? (
              <div className="grid gap-5 pt-1 sm:grid-cols-2">
                <Field
                  label={question.contactNameLabel}
                  error={errors.contactName}
                  fieldId="contactName"
                >
                  <input
                    id="onboarding-contactName"
                    autoComplete="name"
                    aria-invalid={errors.contactName ? "true" : undefined}
                    aria-describedby={errorDescription(
                      "contactName",
                      errors.contactName
                    )}
                    maxLength={120}
                    onChange={(event) =>
                      updateField("contactName", event.target.value)
                    }
                    placeholder={question.contactNamePlaceholder}
                    spellCheck={false}
                    value={form.contactName}
                    className={inputClass(errors.contactName)}
                  />
                </Field>
                <Field
                  label={question.contactLabel}
                  error={errors.contact}
                  fieldId="contact"
                >
                  <input
                    key={form.preferredContactChannel}
                    id="onboarding-contact"
                    autoComplete={autocomplete}
                    type={contactType}
                    aria-invalid={errors.contact ? "true" : undefined}
                    aria-describedby={errorDescription(
                      "contact",
                      errors.contact
                    )}
                    maxLength={320}
                    onChange={(event) =>
                      updateField("contact", event.target.value)
                    }
                    placeholder={contactPlaceholder}
                    spellCheck={false}
                    value={form.contact}
                    className={`${inputClass(errors.contact)} transition-opacity duration-200 motion-reduce:transition-none`}
                  />
                </Field>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </QuestionFrame>
  );
}

function ReviewStep({ copy, form }: StepProps) {
  const details = [
    {
      label: copy.questions.contactDetails.contactNameLabel,
      value:
        form.betaIntent === "not_now"
          ? copy.review.notProvided
          : form.contactName.trim() || copy.review.notProvided,
    },
    {
      label: copy.review.contactChannelLabel,
      value:
        form.betaIntent === "not_now"
          ? copy.review.notProvided
          : optionLabel(
              copy.options.contactChannels,
              form.preferredContactChannel
            ),
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
