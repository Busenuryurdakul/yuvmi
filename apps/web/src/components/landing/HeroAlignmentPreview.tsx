"use client";

import { LIFE_DOMAINS } from "@yuvmi/shared";
import { useEffect, useState } from "react";
import { ALIGNMENT_PREVIEW } from "./landing-content";

export function HeroAlignmentPreview() {
  const [hasMounted, setHasMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReduceMotion(mq.matches);
      setHasMounted(true);
    };

    const frame = requestAnimationFrame(apply);
    mq.addEventListener("change", apply);
    return () => {
      cancelAnimationFrame(frame);
      mq.removeEventListener("change", apply);
    };
  }, []);

  const motionClass = hasMounted ? (reduceMotion ? "is-static" : "is-ready") : "";

  return (
    <div
      className={`landing-alignment glass landing-alignment-panel rounded-3xl p-6 sm:p-8 ${motionClass}`}
      aria-label="Hizalanma önizlemesi"
    >
      <div className="landing-alignment-journey" aria-hidden="true">
        <div className="landing-alignment-node landing-alignment-node--today">
          <span className="landing-alignment-node-dot" />
          <span className="landing-alignment-node-label">{ALIGNMENT_PREVIEW.todayLabel}</span>
        </div>

        <div className="landing-alignment-bridge">
          <svg
            className="landing-alignment-bridge-svg"
            viewBox="0 0 120 200"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="landing-bridge-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--accent)" />
                <stop offset="50%" stopColor="var(--teal)" />
                <stop offset="100%" stopColor="var(--gold)" />
              </linearGradient>
            </defs>
            <path
              className="landing-alignment-bridge-track"
              d="M60 8 L60 192"
              stroke="color-mix(in srgb, var(--foreground) 10%, transparent)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              className="landing-alignment-bridge-path"
              d="M60 8 L60 192"
              stroke="url(#landing-bridge-grad)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          <div className="landing-alignment-score">
            <span className="landing-alignment-score-value">%{ALIGNMENT_PREVIEW.overallScore}</span>
            <span className="landing-alignment-score-label">{ALIGNMENT_PREVIEW.alignmentLabel}</span>
          </div>
        </div>

        <div className="landing-alignment-node landing-alignment-node--future">
          <span className="landing-alignment-node-dot landing-alignment-node-dot--future" />
          <span className="landing-alignment-node-label">{ALIGNMENT_PREVIEW.futureLabel}</span>
        </div>
      </div>

      <div className="landing-alignment-domains">
        <p className="landing-alignment-domains-title">Hayat alanları</p>
        <ul className="landing-alignment-domain-list">
          {ALIGNMENT_PREVIEW.domains.map((domain) => {
            const label = LIFE_DOMAINS[domain.key].label.tr;

            return (
              <li key={domain.key} className="landing-alignment-domain">
                <div className="landing-alignment-domain-head">
                  <span className="landing-alignment-domain-name">{label}</span>
                  <span className="landing-alignment-domain-values">
                    <span className="text-muted">{domain.current}</span>
                    <span aria-hidden="true" className="text-muted/60">
                      →
                    </span>
                    <span className="font-medium text-teal">{domain.future}</span>
                  </span>
                </div>
                <div
                  className="landing-alignment-domain-track"
                  style={
                    {
                      "--current": `${domain.current}%`,
                      "--future": `${domain.future}%`,
                    } as React.CSSProperties
                  }
                  aria-hidden="true"
                >
                  <span className="landing-alignment-domain-fill" />
                  <span className="landing-alignment-domain-marker landing-alignment-domain-marker--current" />
                  <span className="landing-alignment-domain-marker landing-alignment-domain-marker--future" />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
