import { ArrowRight, Check, CheckCircle2 } from "lucide-react";

import { type QuestionnaireOption } from "./onboarding-questionnaire-model";
import type { OnboardingCopy } from "./onboarding-questionnaire-copy";

export function QuestionnaireProgress({
  copy,
  currentStep,
  steps,
}: {
  copy: OnboardingCopy;
  currentStep: number;
  steps: readonly string[];
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <p
          key={`step-count-${currentStep}-${steps.length}`}
          className="font-medium text-foreground"
        >
          {copy.progress.step} {currentStep + 1} {copy.progress.of}{" "}
          {steps.length}
        </p>
        <p key={`step-label-${currentStep}`} className="text-muted">
          {steps[currentStep]}
        </p>
      </div>
      <div
        className="mt-3 h-1 overflow-hidden rounded-full bg-accent"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-[#9945ff] transition-[width] duration-200"
          style={{
            width: `${((currentStep + 1) / steps.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

export function OnboardingSuccess({ copy }: { copy: OnboardingCopy }) {
  return (
    <div className="flex min-h-[520px] max-w-xl flex-col justify-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#14f195]/30 bg-[#14f195]/10 text-[#14f195]">
        <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
      </div>
      <p
        data-language-line
        className="mt-8 text-xs font-semibold uppercase tracking-[0.28em] text-[#14f195]"
      >
        {copy.success.eyebrow}
      </p>
      <h3
        data-language-line
        className="mt-4 text-4xl font-semibold tracking-[-0.05em]"
      >
        {copy.success.title}
      </h3>
      <p data-language-line className="mt-5 text-base leading-7 text-muted">
        {copy.success.description}
      </p>
      <a
        href="https://solbreach.gitbook.io/documentation"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-full border border-border bg-accent/70 px-5 text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14f195]"
      >
        <span data-language-line>{copy.success.documentation}</span>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  );
}

export function StepHeading({
  description,
  title,
}: {
  description?: string;
  title: string;
}) {
  return (
    <div>
      <h3
        data-language-line
        className="text-2xl font-semibold tracking-[-0.035em]"
      >
        {title}
      </h3>
      {description ? (
        <p data-language-line className="mt-2 text-sm leading-6 text-muted">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function Field({
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
        data-language-line
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

export function OptionGroup({
  error,
  hideLegend = false,
  id,
  legend,
  onChange,
  options,
  value,
}: {
  error?: string;
  hideLegend?: boolean;
  id: string;
  legend: string;
  onChange: (value: string) => void;
  options: readonly QuestionnaireOption[];
  value: string;
}) {
  return (
    <fieldset
      id={`onboarding-${id}`}
      aria-describedby={errorDescription(id, error)}
      tabIndex={-1}
    >
      <legend
        data-language-line
        className={
          hideLegend ? "sr-only" : "text-sm font-medium text-foreground"
        }
      >
        {legend}
      </legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={optionClass(value === option.value)}
          >
            <input
              type="radio"
              name={id}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="h-4 w-4 accent-[#9945ff]"
            />
            <span data-language-line>{option.label}</span>
          </label>
        ))}
      </div>
      <ErrorMessage id={id} error={error} />
    </fieldset>
  );
}

export function MultiOptionGroup({
  error,
  hideLegend = false,
  id,
  legend,
  onToggle,
  options,
  values,
}: {
  error?: string;
  hideLegend?: boolean;
  id: string;
  legend: string;
  onToggle: (value: string) => void;
  options: readonly QuestionnaireOption[];
  values: string[];
}) {
  return (
    <fieldset
      id={`onboarding-${id}`}
      aria-describedby={errorDescription(id, error)}
      tabIndex={-1}
    >
      <legend
        data-language-line
        className={
          hideLegend ? "sr-only" : "text-sm font-medium text-foreground"
        }
      >
        {legend}
      </legend>
      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
        {options.map((option) => {
          const checked = values.includes(option.value);
          return (
            <label
              key={option.value}
              className={`${optionClass(checked)} min-h-10 items-start rounded-xl py-2 leading-6 sm:items-center sm:rounded-full`}
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
              <span data-language-line>{option.label}</span>
            </label>
          );
        })}
      </div>
      <ErrorMessage id={id} error={error} />
    </fieldset>
  );
}

export function RatingGroup({
  error,
  hideLegend = false,
  id,
  legend,
  maxLabel,
  minLabel,
  onChange,
  value,
}: {
  error?: string;
  hideLegend?: boolean;
  id: string;
  legend: string;
  maxLabel: string;
  minLabel: string;
  onChange: (value: number) => void;
  value: number | null;
}) {
  return (
    <fieldset
      id={`onboarding-${id}`}
      aria-describedby={errorDescription(id, error)}
      tabIndex={-1}
    >
      <legend
        data-language-line
        className={
          hideLegend ? "sr-only" : "text-sm font-medium text-foreground"
        }
      >
        {legend}
      </legend>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <label
            key={score}
            className={`${optionClass(value === score)} justify-center`}
          >
            <input
              type="radio"
              name={id}
              checked={value === score}
              onChange={() => onChange(score)}
              className="sr-only"
            />
            {score}
          </label>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span data-language-line>{minLabel}</span>
        <span data-language-line>{maxLabel}</span>
      </div>
      <ErrorMessage id={id} error={error} />
    </fieldset>
  );
}

export function inputClass(error?: string) {
  return `min-h-11 w-full rounded-lg border bg-background/55 px-3 text-sm text-foreground outline-none transition placeholder:text-muted/55 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
    error
      ? "border-red-400/45"
      : "border-border focus-visible:border-[#9945ff]/50"
  }`;
}

export function errorDescription(id: string, error?: string) {
  return error ? `onboarding-${id}-error` : undefined;
}

function ErrorMessage({ error, id }: { error?: string; id: string }) {
  return error ? (
    <p id={`onboarding-${id}-error`} className="mt-2 text-xs text-red-300">
      {error}
    </p>
  ) : null;
}

function optionClass(selected: boolean) {
  return `flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition ${
    selected
      ? "border-[#9945ff]/55 bg-[#9945ff]/10 text-foreground"
      : "border-border bg-background/45 text-muted hover:border-white/20 hover:text-foreground"
  }`;
}
