"use client";

import { FormEvent, useId, useState } from "react";
import { isApiConfigured } from "@/lib/api/config";
import { submitWaitlistSignup, WaitlistError } from "@/lib/api/waitlist";
import { WAITLIST_SECTION } from "./landing-content";

type FormState =
  | "idle"
  | "submitting"
  | "success"
  | "validation_error"
  | "rate_limited"
  | "server_error"
  | "configuration_error";

function initialFormState(): FormState {
  return isApiConfigured() ? "idle" : "configuration_error";
}

export function WaitlistSection() {
  const consentId = useId();
  const emailErrorId = useId();
  const consentErrorId = useId();
  const statusId = useId();

  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isSubmitting = formState === "submitting";
  const isSuccess = formState === "success";
  const isConfigurationError = formState === "configuration_error";

  function resetFieldErrors() {
    setEmailError(null);
    setConsentError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFieldErrors();
    setStatusMessage(null);

    if (isSubmitting || isConfigurationError) {
      return;
    }

    if (!consent) {
      setConsentError(WAITLIST_SECTION.consentRequired);
      setFormState("validation_error");
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError(WAITLIST_SECTION.validationError);
      setFormState("validation_error");
      return;
    }

    setFormState("submitting");

    try {
      const result = await submitWaitlistSignup(trimmedEmail, true);
      setFormState("success");
      setStatusMessage(result.message);
      setEmail("");
      setConsent(false);
    } catch (error) {
      if (error instanceof WaitlistError) {
        switch (error.kind) {
          case "VALIDATION":
            setEmailError(WAITLIST_SECTION.validationError);
            setFormState("validation_error");
            break;
          case "RATE_LIMIT":
            setStatusMessage(WAITLIST_SECTION.rateLimitError);
            setFormState("rate_limited");
            break;
          case "CONFIGURATION":
            setStatusMessage(WAITLIST_SECTION.configurationError);
            setFormState("configuration_error");
            break;
          case "SERVER":
          case "NETWORK":
            setStatusMessage(WAITLIST_SECTION.serverError);
            setFormState("server_error");
            break;
        }
        return;
      }

      setStatusMessage(WAITLIST_SECTION.serverError);
      setFormState("server_error");
    }
  }

  const showErrorStatus =
    formState === "rate_limited" ||
    formState === "server_error" ||
    formState === "configuration_error";

  const showSuccessStatus = isSuccess;

  return (
    <section
      id={WAITLIST_SECTION.id}
      className="landing-waitlist mx-auto max-w-2xl px-5 pb-24 pt-4 text-center sm:px-6"
      aria-labelledby="waitlist-title"
    >
      <div className="landing-waitlist-card glass rounded-3xl p-8 sm:p-10">
        <h2 id="waitlist-title" className="text-2xl font-semibold md:text-3xl">
          {WAITLIST_SECTION.title}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted">{WAITLIST_SECTION.body}</p>

        <form className="landing-waitlist-form mt-8" onSubmit={handleSubmit} noValidate>
          <div className="landing-waitlist-fields flex w-full flex-col gap-3">
            <div className="landing-waitlist-email-field text-left">
              <label className="sr-only" htmlFor="waitlist-email">
                {WAITLIST_SECTION.emailLabel}
              </label>
              <input
                id="waitlist-email"
                type="email"
                name="email"
                required
                maxLength={255}
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (emailError) {
                    setEmailError(null);
                  }
                  if (formState === "validation_error") {
                    setFormState("idle");
                  }
                }}
                disabled={isSubmitting || isConfigurationError}
                placeholder={WAITLIST_SECTION.emailPlaceholder}
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? emailErrorId : undefined}
                className="landing-focus-ring landing-waitlist-input w-full rounded-full border border-foreground/10 bg-background px-5 py-3 text-sm"
              />
              {emailError ? (
                <p id={emailErrorId} className="mt-2 text-left text-sm text-accent" role="alert">
                  {emailError}
                </p>
              ) : null}
            </div>

            <label
              htmlFor={consentId}
              className="landing-waitlist-consent landing-focus-ring flex items-start gap-3 rounded-2xl border border-foreground/8 bg-background/70 px-4 py-3 text-left text-sm leading-relaxed text-muted"
            >
              <input
                id={consentId}
                type="checkbox"
                name="consent"
                checked={consent}
                onChange={(event) => {
                  setConsent(event.target.checked);
                  if (consentError) {
                    setConsentError(null);
                  }
                  if (formState === "validation_error") {
                    setFormState("idle");
                  }
                }}
                disabled={isSubmitting || isConfigurationError}
                aria-invalid={consentError ? true : undefined}
                aria-describedby={consentError ? consentErrorId : undefined}
                className="landing-waitlist-consent-checkbox mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
              />
              <span>{WAITLIST_SECTION.consentLabel}</span>
            </label>
            {consentError ? (
              <p id={consentErrorId} className="-mt-1 text-left text-sm text-accent" role="alert">
                {consentError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || isConfigurationError}
              aria-busy={isSubmitting}
              className="landing-focus-ring landing-waitlist-submit rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? WAITLIST_SECTION.submitLabelSubmitting : WAITLIST_SECTION.submitLabel}
            </button>
          </div>
        </form>

        <div id={statusId} className="mt-4 text-sm" aria-live="polite" role="status">
          {showSuccessStatus ? (
            <>
              <p className="font-medium text-foreground">
                {statusMessage ?? WAITLIST_SECTION.successPrimary}
              </p>
              <p className="mt-1 text-muted">{WAITLIST_SECTION.successSecondary}</p>
            </>
          ) : null}

          {showErrorStatus && statusMessage ? (
            <p className="font-medium text-accent">{statusMessage}</p>
          ) : null}

          {!showSuccessStatus && !showErrorStatus ? (
            <p className="text-xs text-muted">{WAITLIST_SECTION.helperText}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
