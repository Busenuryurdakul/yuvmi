"use client";

import { useEffect, useId, useRef, type CSSProperties } from "react";
import { MANIFESTO_TOGETHER } from "../manifesto-content";

const NODE_LAYOUT = [
  { cx: 200, cy: 42, item: 0 },
  { cx: 78, cy: 168, item: 1 },
  { cx: 322, cy: 168, item: 2 },
] as const;

const TRIANGLE_PATH = "M 200 42 L 78 168 L 322 168 Z";

export function LabTogetherVisual() {
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
    <div ref={ref} className="lab-together-stage" data-active="false">
      <div className="lab-together-glow" aria-hidden />

      <header className="lab-together-header">
        <span className="lab-chip">{MANIFESTO_TOGETHER.title}</span>
        <p className="lab-together-lead">{MANIFESTO_TOGETHER.lead}</p>
        <blockquote className="lab-together-note">{MANIFESTO_TOGETHER.note}</blockquote>
      </header>

      <div className="lab-together-network" aria-hidden>
        <svg className="lab-together-network-svg" viewBox="0 0 400 210" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id={`${gradId}-bond`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffb8a8" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#7c6bf0" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#5ec4b6" stopOpacity="0.9" />
            </linearGradient>
            <radialGradient id={`${gradId}-hub`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffb8a8" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#7c6bf0" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#5ec4b6" stopOpacity="0" />
            </radialGradient>
          </defs>

          <ellipse className="lab-together-hub-glow" cx="200" cy="118" rx="68" ry="48" fill={`url(#${gradId}-hub)`} />

          <path
            className="lab-together-triangle"
            d={TRIANGLE_PATH}
            fill="none"
            stroke={`url(#${gradId}-bond)`}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />

          {NODE_LAYOUT.map(({ cx, cy }, i) => (
            <line
              key={`spoke-${i}`}
              className="lab-together-spoke"
              x1="200"
              y1="118"
              x2={cx}
              y2={cy}
              stroke={`url(#${gradId}-bond)`}
              strokeWidth="1.25"
              strokeLinecap="round"
              style={{ "--spoke-i": i } as CSSProperties}
            />
          ))}

          <circle className="lab-together-hub" cx="200" cy="118" r="9" fill="#eef0ff" />

          {NODE_LAYOUT.map(({ cx, cy, item }, i) => (
            <g key={`node-${item}`} className="lab-together-node" style={{ "--node-i": i } as CSSProperties}>
              <circle className="lab-together-node-ring" cx={cx} cy={cy} r="15" fill="none" />
              <circle className="lab-together-node-core" cx={cx} cy={cy} r="6" />
            </g>
          ))}
        </svg>
      </div>

      <div className="lab-together-cards">
        {MANIFESTO_TOGETHER.items.map((item, i) => (
          <article
            key={item.title}
            className={`lab-together-card lab-together-card--${item.accent}`}
            style={{ "--card-i": i } as CSSProperties}
          >
            <div className="lab-together-card-top">
              <span className="lab-together-card-icon" aria-hidden>
                {item.icon}
              </span>
            </div>
            <h3 className="lab-together-card-title">{item.title}</h3>
            <p className="lab-together-card-desc">{item.desc}</p>
            <div className="lab-together-card-shine" aria-hidden />
          </article>
        ))}
      </div>
    </div>
  );
}
