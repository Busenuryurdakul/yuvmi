"use client";

import { useEffect, useId, useRef, type CSSProperties } from "react";
import { MANIFESTO_TRUST } from "../manifesto-content";

const RING_NODES = [
  { cx: 200, cy: 58, item: 0 },
  { cx: 322, cy: 152, item: 1 },
  { cx: 78, cy: 152, item: 2 },
] as const;

export function LabTrustVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const gradId = useId().replace(/:/g, "");

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

  return (
    <div ref={ref} className="lab-trust-stage" data-active="false">
      <div className="lab-trust-glow" aria-hidden />

      <header className="lab-trust-header">
        <span className="lab-chip">{MANIFESTO_TRUST.title}</span>
        <h2 className="lab-trust-headline">{MANIFESTO_TRUST.headline}</h2>
        <p className="lab-trust-body">{MANIFESTO_TRUST.body}</p>
      </header>

      <div className="lab-trust-sanctuary" aria-hidden>
        <svg className="lab-trust-sanctuary-svg" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id={`${gradId}-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c6bf0" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#ffb8a8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#5ec4b6" stopOpacity="0.85" />
            </linearGradient>
            <radialGradient id={`${gradId}-core`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#eef0ff" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#7c6bf0" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#5ec4b6" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle className="lab-trust-ring lab-trust-ring--outer" cx="200" cy="118" r="92" fill="none" />
          <circle className="lab-trust-ring lab-trust-ring--mid" cx="200" cy="118" r="64" fill="none" />
          <circle className="lab-trust-ring lab-trust-ring--inner" cx="200" cy="118" r="36" fill="none" />

          {RING_NODES.map(({ cx, cy }, i) => (
            <line
              key={`link-${i}`}
              className="lab-trust-link"
              x1="200"
              y1="118"
              x2={cx}
              y2={cy}
              stroke={`url(#${gradId}-ring)`}
              strokeWidth="1.25"
              strokeLinecap="round"
              style={{ "--link-i": i } as CSSProperties}
            />
          ))}

          <circle className="lab-trust-core-glow" cx="200" cy="118" r="28" fill={`url(#${gradId}-core)`} />
          <circle className="lab-trust-core" cx="200" cy="118" r="11" fill="#eef0ff" />

          {RING_NODES.map(({ cx, cy, item }, i) => (
            <g key={`node-${item}`} className="lab-trust-node" style={{ "--node-i": i } as CSSProperties}>
              <circle className="lab-trust-node-ring" cx={cx} cy={cy} r="14" fill="none" />
              <circle className="lab-trust-node-core" cx={cx} cy={cy} r="5.5" />
            </g>
          ))}
        </svg>
      </div>

      <div className="lab-trust-controls">
        {MANIFESTO_TRUST.controls.map((control, i) => (
          <span
            key={control.label}
            className={`lab-trust-control lab-trust-control--${control.accent}`}
            style={{ "--control-i": i } as CSSProperties}
          >
            <span className="lab-trust-control-icon" aria-hidden>
              {control.icon}
            </span>
            {control.label}
          </span>
        ))}
      </div>

      <div className="lab-trust-lines">
        {MANIFESTO_TRUST.lines.map((line, i) => (
          <blockquote
            key={line}
            className="lab-trust-line"
            style={{ "--line-i": i } as CSSProperties}
          >
            {line}
          </blockquote>
        ))}
      </div>
    </div>
  );
}
