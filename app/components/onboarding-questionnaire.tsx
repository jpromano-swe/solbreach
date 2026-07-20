"use client";

import { AlertCircle, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useState } from "react";

import { submitOnboardingResponse } from "../lib/onboarding";
import {
  OnboardingSuccess,
  QuestionnaireProgress,
} from "./onboarding-questionnaire-fields";
import {
  buildOnboardingSubmission,
  INITIAL_ONBOARDING_FORM,
  ONBOARDING_STEPS,
  type OnboardingFormErrors,
  type OnboardingFormState,
  validateOnboardingStep,
} from "./onboarding-questionnaire-model";
import { QuestionnaireStep } from "./onboarding-questionnaire-steps";

export function OnboardingQuestionnaire() {
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<OnboardingFormErrors>({});
  const [form, setForm] = useState<OnboardingFormState>(
    INITIAL_ONBOARDING_FORM
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  function updateField<K extends keyof OnboardingFormState>(
    field: K,
    value: OnboardingFormState[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validateCurrentStep(step: number) {
    const nextErrors = validateOnboardingStep(form, step);
    setErrors(nextErrors);
    focusFirstError(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goToNextStep() {
    if (!validateCurrentStep(currentStep)) return;
    setCurrentStep((step) => Math.min(step + 1, ONBOARDING_STEPS.length - 1));
  }

  function goToPreviousStep() {
    setErrors({});
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateCurrentStep(ONBOARDING_STEPS.length - 1)) return;

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
        <OnboardingBriefing />

        <div className="px-6 py-8 sm:px-10 lg:px-12 lg:py-12">
          {isSubmitted ? (
            <OnboardingSuccess />
          ) : (
            <form aria-busy={isSubmitting} noValidate onSubmit={handleSubmit}>
              <QuestionnaireProgress currentStep={currentStep} />
              <div className="mt-10 min-h-[390px]">
                <QuestionnaireStep
                  currentStep={currentStep}
                  errors={errors}
                  form={form}
                  updateField={updateField}
                />
              </div>

              <SubmissionError message={errors.submission} />
              <QuestionnaireNavigation
                currentStep={currentStep}
                isSubmitting={isSubmitting}
                onBack={goToPreviousStep}
                onContinue={goToNextStep}
              />
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function OnboardingBriefing() {
  return (
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
        Tell us where you are in your Solana security journey. We review each
        application before opening access.
      </p>

      <div className="mt-10 space-y-4 border-t border-border pt-6 text-sm text-muted">
        {[
          "Four short steps",
          "No wallet required",
          "Applications are reviewed manually",
        ].map((detail) => (
          <p key={detail} className="flex items-start gap-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#14f195]" />
            {detail}
          </p>
        ))}
      </div>
    </div>
  );
}

function SubmissionError({ message }: { message?: string }) {
  return message ? (
    <div
      role="alert"
      className="mt-6 flex items-start gap-3 rounded-lg border border-red-400/20 bg-red-500/[0.06] px-4 py-3 text-sm leading-6 text-red-200"
    >
      <AlertCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-medium">Application not submitted</p>
        <p className="text-red-200/75">{message}</p>
      </div>
    </div>
  ) : null;
}

function QuestionnaireNavigation({
  currentStep,
  isSubmitting,
  onBack,
  onContinue,
}: {
  currentStep: number;
  isSubmitting: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <div className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6">
      <button
        type="button"
        onClick={onBack}
        disabled={currentStep === 0 || isSubmitting}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-muted transition enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </button>

      <button
        type={isLastStep ? "submit" : "button"}
        onClick={isLastStep ? undefined : onContinue}
        disabled={isSubmitting}
        className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#9945ff]/35 bg-[#9945ff] px-5 text-sm font-semibold text-white transition hover:bg-[#8b35f6] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        {isSubmitting
          ? "Submitting..."
          : isLastStep
            ? "Request Beta Access"
            : "Continue"}
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
