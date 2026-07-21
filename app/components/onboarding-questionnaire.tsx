"use client";

import { AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { useMobileLayout } from "../hooks/use-mobile-layout";
import { submitOnboardingResponse } from "../lib/onboarding";
import { useOnboardingLanguageTransition } from "./onboarding-language-transition";
import {
  ONBOARDING_COPY,
  type OnboardingCopy,
  type OnboardingLocale,
} from "./onboarding-questionnaire-copy";
import {
  OnboardingSuccess,
  QuestionnaireProgress,
} from "./onboarding-questionnaire-fields";
import {
  buildOnboardingSubmission,
  DESKTOP_ONBOARDING_PAGES,
  INITIAL_ONBOARDING_FORM,
  MOBILE_ONBOARDING_PAGES,
  type OnboardingFormErrors,
  type OnboardingFormState,
  validateOnboardingQuestions,
} from "./onboarding-questionnaire-model";
import { QuestionnaireStep } from "./onboarding-questionnaire-steps";

export function OnboardingQuestionnaire() {
  const [locale, setLocale] = useState<OnboardingLocale>("es");
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<OnboardingFormErrors>({});
  const [form, setForm] = useState<OnboardingFormState>(
    INITIAL_ONBOARDING_FORM
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const isMobile = useMobileLayout();
  const copy = ONBOARDING_COPY[locale];
  const pages = isMobile ? MOBILE_ONBOARDING_PAGES : DESKTOP_ONBOARDING_PAGES;
  const stepLabels = isMobile ? copy.mobileSteps : copy.steps;
  const activeStep = Math.min(currentStep, pages.length - 1);
  const activePage = pages[activeStep];
  const languageContentRef = useOnboardingLanguageTransition(locale);

  function updateField<K extends keyof OnboardingFormState>(
    field: K,
    value: OnboardingFormState[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validateCurrentStep(step: number) {
    const nextErrors = validateOnboardingQuestions(
      form,
      pages[step].validation,
      copy.validation
    );
    setErrors(nextErrors);
    focusFirstError(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goToNextStep() {
    if (!validateCurrentStep(activeStep)) return;
    setCurrentStep((step) => Math.min(step + 1, pages.length - 1));
  }

  function goToPreviousStep() {
    setErrors({});
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeStep < pages.length - 1) goToNextStep();
  }

  async function submitResponse() {
    if (activePage.id !== "review" || isSubmitting) return;
    if (!validateCurrentStep(activeStep)) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const params = new URLSearchParams(window.location.search);
      await submitOnboardingResponse(buildOnboardingSubmission(form, params));
      setIsSubmitted(true);
    } catch (error) {
      setErrors({
        submission:
          error instanceof Error
            ? error.message
            : copy.submissionError.fallback,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      id="onboarding"
      lang={locale}
      aria-labelledby="onboarding-title"
      className="scroll-mt-24 border-y border-border bg-card/40"
    >
      <LanguageSelector
        copy={copy}
        locale={locale}
        onChange={(nextLocale) => {
          setLocale(nextLocale);
          setErrors({});
        }}
      />
      <div
        ref={languageContentRef}
        className="grid min-h-[620px] lg:grid-cols-[0.72fr_1.28fr]"
      >
        <OnboardingBriefing copy={copy} />

        <div className="px-6 py-8 sm:px-10 lg:px-12 lg:py-12">
          {isSubmitted ? (
            <OnboardingSuccess copy={copy} />
          ) : (
            <form
              aria-busy={isSubmitting}
              noValidate
              onSubmit={handleFormSubmit}
            >
              <QuestionnaireProgress
                copy={copy}
                currentStep={activeStep}
                steps={stepLabels}
              />
              <div
                key={activePage.id}
                className="mt-10 min-h-[360px] md:min-h-[390px]"
              >
                <QuestionnaireStep
                  copy={copy}
                  errors={errors}
                  form={form}
                  pageId={activePage.id}
                  updateField={updateField}
                />
              </div>

              <SubmissionError copy={copy} message={errors.submission} />
              <QuestionnaireNavigation
                copy={copy}
                currentStep={activeStep}
                isSubmitting={isSubmitting}
                onBack={goToPreviousStep}
                onConfirm={submitResponse}
                onContinue={goToNextStep}
                totalSteps={pages.length}
              />
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function LanguageSelector({
  copy,
  locale,
  onChange,
}: {
  copy: OnboardingCopy;
  locale: OnboardingLocale;
  onChange: (locale: OnboardingLocale) => void;
}) {
  return (
    <div className="flex justify-end px-6 pb-1 pt-5 sm:px-10 lg:px-12">
      <div
        role="group"
        aria-label={copy.languageLabel}
        className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em]"
      >
        <span className="mr-1 text-muted">{copy.languageLabel}</span>
        {(["es", "en"] as const).map((option, index) => (
          <span key={option} className="flex items-center gap-2">
            {index > 0 ? (
              <span className="text-border" aria-hidden="true">
                /
              </span>
            ) : null}
            <button
              type="button"
              aria-pressed={locale === option}
              onClick={() => onChange(option)}
              className={`rounded-sm px-1 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] ${
                locale === option
                  ? "text-[#14f195]"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {option.toUpperCase()}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function OnboardingBriefing({ copy }: { copy: OnboardingCopy }) {
  return (
    <div className="border-b border-border px-6 py-10 sm:px-10 lg:border-b-0 lg:border-r lg:py-12">
      <Image
        src="/logo_crop.png"
        alt="SolBreach"
        width={1480}
        height={304}
        priority
        className="h-11 w-auto"
      />
      <h2
        id="onboarding-title"
        data-language-line
        className="mt-5 max-w-md text-4xl font-semibold tracking-[-0.055em] sm:text-5xl"
      >
        {copy.briefing.title}
      </h2>
      <p
        data-language-line
        className="mt-5 max-w-md text-base leading-7 text-muted"
      >
        {copy.briefing.description}
      </p>
    </div>
  );
}

function SubmissionError({
  copy,
  message,
}: {
  copy: OnboardingCopy;
  message?: string;
}) {
  return message ? (
    <div
      role="alert"
      className="mt-6 flex items-start gap-3 rounded-lg border border-red-400/20 bg-red-500/[0.06] px-4 py-3 text-sm leading-6 text-red-200"
    >
      <AlertCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p data-language-line className="font-medium">
          {copy.submissionError.title}
        </p>
        <p data-language-line className="text-red-200/75">
          {message}
        </p>
      </div>
    </div>
  ) : null;
}

function QuestionnaireNavigation({
  copy,
  currentStep,
  isSubmitting,
  onBack,
  onConfirm,
  onContinue,
  totalSteps,
}: {
  copy: OnboardingCopy;
  currentStep: number;
  isSubmitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
  onContinue: () => void;
  totalSteps: number;
}) {
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6">
      <button
        type="button"
        onClick={onBack}
        disabled={currentStep === 0 || isSubmitting}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-muted transition enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span data-language-line>{copy.navigation.back}</span>
      </button>

      <button
        type="button"
        onClick={isLastStep ? onConfirm : onContinue}
        disabled={isSubmitting}
        className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-5 text-sm font-semibold text-white transition hover:bg-[#8b35f6] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        <span data-language-line>
          {isSubmitting
            ? copy.navigation.submitting
            : isLastStep
              ? copy.navigation.submit
              : copy.navigation.continue}
        </span>
        {!isSubmitting ? (
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        ) : null}
      </button>
    </div>
  );
}

function focusFirstError(errors: OnboardingFormErrors) {
  const firstField = Object.keys(errors)[0];
  if (!firstField || firstField === "submission") return;

  window.setTimeout(() => {
    document.getElementById(`onboarding-${firstField}`)?.focus();
  }, 0);
}
