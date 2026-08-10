"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { MANIFESTO_CLOSING } from "../manifesto-content";
import { YuvmiLogo } from "./YuvmiLogo";

type LabCloseVisualProps = {
  onReplay: () => void;
};

type CapturePhase = "idle" | "form" | "success";

const FINALE_STARS = [
  { cx: 42, cy: 38, r: 1.2, delay: 0 },
  { cx: 88, cy: 22, r: 1, delay: 1 },
  { cx: 312, cy: 28, r: 1.1, delay: 2 },
  { cx: 358, cy: 44, r: 0.9, delay: 3 },
  { cx: 130, cy: 52, r: 0.8, delay: 4 },
  { cx: 270, cy: 48, r: 0.85, delay: 5 },
] as const;

const FINALE_RAYS = [-20, -11, -4, 4, 11, 20] as const;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function LabCloseVisual({ onReplay }: LabCloseVisualProps) {
  const ref = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const gradId = useId().replace(/:/g, "");
  const [phase, setPhase] = useState<CapturePhase>("idle");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      el.dataset.active = "true";
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.dataset.active = "true";
          observer.disconnect();
        }
      },
      { threshold: 0.28 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (phase === "form") {
      emailRef.current?.focus({ preventScroll: true });
    }
  }, [phase]);

  function handleCtaClick() {
    setError("");
    setPhase("form");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();

    if (!isValidEmail(trimmed)) {
      setError(MANIFESTO_CLOSING.emailError);
      return;
    }

    setError("");
    try {
      localStorage.setItem("yuvmi-waitlist-email", trimmed);
    } catch {
      /* localStorage unavailable */
    }

    setPhase("success");
  }

  return (
    <div ref={ref} className="lab-close-stage" data-active="false">
      <div className="lab-close-ambient" aria-hidden>
        <div className="lab-close-orb lab-close-orb-a" />
        <div className="lab-close-orb lab-close-orb-b" />
      </div>

      <div className="lab-close-finale" aria-hidden>
        <svg className="lab-close-finale-svg" viewBox="0 0 480 200" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id={`${gradId}-arc`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5ec4b6" stopOpacity="0.35" />
              <stop offset="30%" stopColor="#7c6bf0" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#ffb8a8" stopOpacity="1" />
              <stop offset="70%" stopColor="#c4b5fd" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#5ec4b6" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id={`${gradId}-beam`} x1="50%" y1="100%" x2="50%" y2="0%">
              <stop offset="0%" stopColor="#ffb8a8" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#7c6bf0" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#5ec4b6" stopOpacity="0" />
            </linearGradient>
            <radialGradient id={`${gradId}-halo`} cx="50%" cy="72%" r="42%">
              <stop offset="0%" stopColor="#ffb8a8" stopOpacity="0.45" />
              <stop offset="45%" stopColor="#7c6bf0" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0a0e1c" stopOpacity="0" />
            </radialGradient>
          </defs>

          <ellipse className="lab-close-halo" cx="240" cy="148" rx="168" ry="72" fill={`url(#${gradId}-halo)`} />

          <path
            className="lab-close-ring lab-close-ring--outer"
            d="M 72 148 A 168 168 0 0 1 408 148"
            fill="none"
            stroke={`url(#${gradId}-arc)`}
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          <path
            className="lab-close-ring lab-close-ring--mid"
            d="M 112 148 A 128 128 0 0 1 368 148"
            fill="none"
            stroke="rgba(196, 181, 253, 0.35)"
            strokeWidth="1"
            strokeLinecap="round"
          />
          <path
            className="lab-close-ring lab-close-ring--inner"
            d="M 152 148 A 88 88 0 0 1 328 148"
            fill="none"
            stroke="rgba(255, 184, 168, 0.45)"
            strokeWidth="1"
            strokeLinecap="round"
          />

          <rect className="lab-close-beam" x="214" y="52" width="52" height="96" fill={`url(#${gradId}-beam)`} />

          <line
            className="lab-close-horizon"
            x1="56"
            y1="148"
            x2="424"
            y2="148"
            stroke={`url(#${gradId}-arc)`}
            strokeWidth="2"
            strokeLinecap="round"
          />

          <circle className="lab-close-sun" cx="240" cy="148" r="8" fill="#ffb8a8" />

          {FINALE_STARS.map((star) => (
            <circle
              key={`${star.cx}-${star.cy}`}
              className="lab-close-star"
              cx={star.cx}
              cy={star.cy}
              r={star.r}
              fill="#eef0ff"
              style={{ "--star-i": star.delay } as CSSProperties}
            />
          ))}
        </svg>

        <div className="lab-close-emblem">
          <span className="lab-close-emblem-orbit lab-close-emblem-orbit--a" aria-hidden />
          <span className="lab-close-emblem-orbit lab-close-emblem-orbit--b" aria-hidden />
          <YuvmiLogo size={34} />
        </div>
      </div>

      <div className="lab-close-rays" aria-hidden>
        {FINALE_RAYS.map((angle, i) => (
          <span
            key={angle}
            className="lab-close-ray"
            style={{ "--ray-angle": `${angle}deg`, "--ray-i": i } as CSSProperties}
          />
        ))}
      </div>

      <div className="lab-close-copy">
        <h2 className="lab-close-headline">
          <span className="lab-close-headline-soft">{MANIFESTO_CLOSING.lead}</span>
          <span className="lab-close-headline-bold">{MANIFESTO_CLOSING.emphasis}</span>
        </h2>

        <ul className="lab-close-mantras">
          {MANIFESTO_CLOSING.taglineParts.map((line, i) => (
            <li key={line} className="lab-close-mantra" style={{ "--mantra-i": i } as CSSProperties}>
              <span className="lab-close-mantra-mark" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className={`lab-close-actions ${phase !== "idle" ? "is-expanded" : ""}`}>
        {phase === "idle" && (
          <button type="button" className="lab-btn-close-primary" onClick={handleCtaClick}>
            {MANIFESTO_CLOSING.cta}
          </button>
        )}

        {phase === "form" && (
          <form className="lab-close-email" onSubmit={handleSubmit} noValidate>
            <p className="lab-close-email-prompt">{MANIFESTO_CLOSING.emailPrompt}</p>
            <div className="lab-close-email-row">
              <input
                ref={emailRef}
                type="email"
                name="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError("");
                }}
                placeholder={MANIFESTO_CLOSING.emailPlaceholder}
                className="lab-close-email-input"
                aria-label={MANIFESTO_CLOSING.emailPlaceholder}
                autoComplete="email"
                required
              />
              <button type="submit" className="lab-btn-close-primary lab-btn-close-submit">
                {MANIFESTO_CLOSING.emailSubmit}
              </button>
            </div>
            {error ? (
              <p className="lab-close-email-error" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        )}

        {phase === "success" && (
          <div className="lab-close-email-success" role="status">
            <span className="lab-close-email-success-icon" aria-hidden>
              ✓
            </span>
            <p>{MANIFESTO_CLOSING.emailSuccess}</p>
          </div>
        )}

        <button type="button" className="lab-btn-close-replay" onClick={onReplay}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0 0 14-2M19 5a9 9 0 0 0-14 2"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {MANIFESTO_CLOSING.replay}
        </button>
      </div>

      <p className="lab-close-signoff">Dijital yuvan</p>
    </div>
  );
}
