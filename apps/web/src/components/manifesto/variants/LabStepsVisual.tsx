"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { MANIFESTO_PACE, MANIFESTO_STEPS } from "../manifesto-content";

export function LabStepsVisual() {
  const ref = useRef<HTMLDivElement>(null);

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
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="lab-steps-stage" data-active="false">
      <div className="lab-steps-glow" aria-hidden />

      <header className="lab-steps-header">
        <span className="lab-chip">{MANIFESTO_PACE.chip}</span>
        <h2 className="lab-steps-title">
          {MANIFESTO_PACE.title}{" "}
          <span className="lab-steps-title-accent">{MANIFESTO_PACE.titleAccent}</span>
        </h2>
        <p className="lab-steps-lead">{MANIFESTO_PACE.lead}</p>
      </header>

      <div className="lab-steps-spectrum" aria-hidden>
        <div className="lab-steps-spectrum-track">
          <div className="lab-steps-spectrum-fill" />
        </div>
        <div className="lab-steps-spectrum-mark lab-steps-spectrum-mark--a" />
        <div className="lab-steps-spectrum-mark lab-steps-spectrum-mark--b" />
        <div className="lab-steps-spectrum-mark lab-steps-spectrum-mark--c" />
      </div>

      <div className="lab-steps-cards">
        {MANIFESTO_STEPS.map((step, i) => (
          <article
            key={step.label}
            className={`lab-steps-card lab-steps-card--${step.accent}`}
            style={{ "--card-i": i } as CSSProperties}
          >
            <div className="lab-steps-card-top">
              <span className="lab-steps-card-icon" aria-hidden>
                {step.icon}
              </span>
              <span className="lab-steps-card-tier">{step.tier}</span>
            </div>
            <p className="lab-steps-card-time">{step.time}</p>
            <p className="lab-steps-card-label">{step.label}</p>
            <div className="lab-steps-card-shine" aria-hidden />
          </article>
        ))}
      </div>

      <div className="lab-steps-message">
        <p className="lab-steps-body">{MANIFESTO_PACE.body}</p>
        <blockquote className="lab-steps-emphasis">{MANIFESTO_PACE.emphasis}</blockquote>
      </div>
    </div>
  );
}
