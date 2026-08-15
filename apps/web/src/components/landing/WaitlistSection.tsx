"use client";

import { FormEvent, useState } from "react";
import { WAITLIST_SECTION } from "./landing-content";

export function WaitlistSection() {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(WAITLIST_SECTION.pendingPrimary);
  }

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
        <form className="landing-waitlist-form mt-8" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="waitlist-email">
            {WAITLIST_SECTION.emailLabel}
          </label>
          <input
            id="waitlist-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder={WAITLIST_SECTION.emailPlaceholder}
            className="landing-focus-ring landing-waitlist-input rounded-full border border-foreground/10 bg-background px-5 py-3 text-sm"
          />
          <button
            type="submit"
            className="landing-focus-ring landing-waitlist-submit rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            {WAITLIST_SECTION.submitLabel}
          </button>
        </form>
        {statusMessage ? (
          <div className="mt-4 text-sm" aria-live="polite" role="status">
            <p className="font-medium text-foreground">{statusMessage}</p>
            <p className="mt-1 text-muted">{WAITLIST_SECTION.pendingSecondary}</p>
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted">
            E-postanı yalnızca erken erişim ve ürün güncellemeleri için kullanırız.
          </p>
        )}
      </div>
    </section>
  );
}
