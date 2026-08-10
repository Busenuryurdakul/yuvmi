"use client";

import { useEffect, useId, useRef, type CSSProperties } from "react";
import { MANIFESTO_TRACES } from "../manifesto-content";

const NODE_LAYOUT = [
  { cx: 200, cy: 42, item: 0 },
  { cx: 318, cy: 98, item: 1 },
  { cx: 278, cy: 218, item: 2 },
  { cx: 122, cy: 218, item: 3 },
  { cx: 82, cy: 98, item: 4 },
] as const;

export function LabTracesVisual() {
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
    <div ref={ref} className="lab-traces-stage" data-active="false">
      <div className="lab-traces-glow" aria-hidden />

      <header className="lab-traces-header">
        <span className="lab-chip">{MANIFESTO_TRACES.title}</span>
        <p className="lab-traces-lead">{MANIFESTO_TRACES.lead}</p>
        <p className="lab-traces-lead-accent">{MANIFESTO_TRACES.leadAccent}</p>
      </header>

      <div className="lab-traces-constellation" aria-hidden>
        <svg className="lab-traces-constellation-svg" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id={`${gradId}-thread`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c6bf0" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#ffb8a8" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#5ec4b6" stopOpacity="0.85" />
            </linearGradient>
            <radialGradient id={`${gradId}-core`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffb8a8" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#7c6bf0" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#5ec4b6" stopOpacity="0" />
            </radialGradient>
          </defs>

          <ellipse className="lab-traces-core-glow" cx="200" cy="130" rx="72" ry="52" fill={`url(#${gradId}-core)`} />

          {NODE_LAYOUT.map(({ cx, cy }, i) => (
            <line
              key={`thread-${i}`}
              className="lab-traces-thread"
              x1="200"
              y1="130"
              x2={cx}
              y2={cy}
              stroke={`url(#${gradId}-thread)`}
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{ "--thread-i": i } as CSSProperties}
            />
          ))}

          <circle className="lab-traces-core" cx="200" cy="130" r="10" fill="#eef0ff" />

          {NODE_LAYOUT.map(({ cx, cy, item }, i) => (
            <g key={`node-${item}`} className="lab-traces-node" style={{ "--node-i": i } as CSSProperties}>
              <circle className="lab-traces-node-ring" cx={cx} cy={cy} r="14" fill="none" />
              <circle className="lab-traces-node-core" cx={cx} cy={cy} r="5.5" />
            </g>
          ))}
        </svg>
      </div>

      <div className="lab-traces-grid">
        {MANIFESTO_TRACES.items.map((item, i) => (
          <article
            key={item.title}
            className={`lab-traces-card lab-traces-card--${item.accent}`}
            style={{ "--card-i": i } as CSSProperties}
          >
            <div className="lab-traces-card-top">
              <span className="lab-traces-card-icon" aria-hidden>
                {item.icon}
              </span>
              <span className="lab-traces-card-index">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <h3 className="lab-traces-card-title">{item.title}</h3>
            <p className="lab-traces-card-desc">{item.desc}</p>
            <div className="lab-traces-card-shine" aria-hidden />
          </article>
        ))}
      </div>
    </div>
  );
}
