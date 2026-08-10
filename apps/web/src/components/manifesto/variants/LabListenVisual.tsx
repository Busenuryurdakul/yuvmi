"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { MANIFESTO_AI_FLOW, MANIFESTO_LISTEN } from "../manifesto-content";

export function LabListenVisual() {
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
    <div ref={ref} className="lab-listen-stage" data-active="false">
      <div className="lab-listen-glow" aria-hidden />
      <div className="lab-listen-orb" aria-hidden />

      <header className="lab-listen-header">
        <span className="lab-chip">{MANIFESTO_LISTEN.chip}</span>
        <h2 className="lab-listen-title">
          {MANIFESTO_LISTEN.title}{" "}
          <span className="lab-listen-title-accent">{MANIFESTO_LISTEN.titleAccent}</span>
        </h2>
        <p className="lab-listen-body">{MANIFESTO_LISTEN.body}</p>
      </header>

      <div className="lab-listen-pipeline">
        <div className="lab-listen-rail" aria-hidden>
          <div className="lab-listen-rail-fill" />
        </div>

        <ol className="lab-listen-steps">
          {MANIFESTO_AI_FLOW.map((item, i) => (
            <li
              key={item.label}
              className="lab-listen-step"
              style={{ "--step-i": i } as CSSProperties}
            >
              <div className="lab-listen-node">
                <span className="lab-listen-node-ring" aria-hidden />
                <span className="lab-listen-node-icon" aria-hidden>
                  {item.icon}
                </span>
              </div>
              <article className="lab-listen-card">
                <span className="lab-listen-card-num">{item.step}</span>
                <h3 className="lab-listen-card-label">{item.label}</h3>
                <p className="lab-listen-card-desc">{item.desc}</p>
              </article>
            </li>
          ))}
        </ol>
      </div>

      <p className="lab-listen-footnote">{MANIFESTO_LISTEN.footnote}</p>
    </div>
  );
}
