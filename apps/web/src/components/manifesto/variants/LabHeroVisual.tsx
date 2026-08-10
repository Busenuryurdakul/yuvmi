"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { MANIFESTO_HERO } from "../manifesto-content";

type LabHeroVisualProps = {
  ready: boolean;
  onExplore: () => void;
};

export function LabHeroVisual({ ready, onExplore }: LabHeroVisualProps) {
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
      { threshold: 0.25 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="lab-hero-stage lab-hero-stage--horizon" data-active={ready ? "true" : "false"}>
      <div className="lab-hero-horizon" aria-hidden>
        <div className="lab-hero-horizon-glow" />
        <div className="lab-hero-horizon-line" />
        <div className="lab-hero-horizon-pulse" />
      </div>

      <p className="lab-hero-overline">{MANIFESTO_HERO.overline}</p>

      <h1 className="lab-hero-title lab-hero-title--horizon">
        <span className="lab-hero-line lab-hero-line-a">{MANIFESTO_HERO.title}</span>
        <span className="lab-hero-line lab-hero-line-b">{MANIFESTO_HERO.highlight}</span>
      </h1>

      <p className="lab-hero-sub">{MANIFESTO_HERO.subtitle}</p>

      <div className="lab-hero-actions">
        <Link href="/#bekleme" className="lab-btn-hero-primary">
          {MANIFESTO_HERO.ctaPrimary}
        </Link>
        <button type="button" className="lab-btn-hero-ghost" onClick={onExplore}>
          {MANIFESTO_HERO.ctaSecondary}
        </button>
      </div>

      <button type="button" className="lab-hero-scroll-cue" onClick={onExplore} aria-label={MANIFESTO_HERO.scrollCue}>
        <span>{MANIFESTO_HERO.scrollCue}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
