"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { MANIFESTO_DISTANCE } from "../manifesto-content";

export function LabDistanceVisual() {
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
      { threshold: 0.35 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="lab-distance-stage" data-active="false">
      <div className="lab-distance-glow" aria-hidden />

      <div className="lab-distance-copy">
        <span className="lab-chip">Mesafe</span>
        <p className="lab-distance-lead">{MANIFESTO_DISTANCE.lead}</p>
        <p className="lab-distance-body">{MANIFESTO_DISTANCE.body}</p>
      </div>

      <div className="lab-distance-bridge" aria-hidden>
        <svg className="lab-distance-bridge-svg" viewBox="0 0 420 120" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="lab-bridge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c6bf0" />
              <stop offset="45%" stopColor="#ffb8a8" />
              <stop offset="100%" stopColor="#c4b5fd" />
            </linearGradient>
            <filter id="lab-bridge-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            className="lab-distance-bridge-track"
            d="M 52 60 Q 210 18 368 60"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            className="lab-distance-bridge-path"
            d="M 52 60 Q 210 18 368 60"
            fill="none"
            stroke="url(#lab-bridge-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#lab-bridge-glow)"
          />
          <circle className="lab-distance-bridge-pulse" cx="210" cy="34" r="4" fill="#ffb8a8" />
        </svg>

        <div className="lab-distance-node lab-distance-node--today">
          <span className="lab-distance-node-ring" />
          <span className="lab-distance-node-core" />
          <span className="lab-distance-node-label">Bugünkü sen</span>
        </div>

        <div className="lab-distance-node lab-distance-node--future">
          <span className="lab-distance-node-ring" />
          <span className="lab-distance-node-core" />
          <span className="lab-distance-node-label">Gelecekteki sen</span>
        </div>
      </div>

      <blockquote className="lab-distance-emphasis">
        <span className="lab-distance-emphasis-intro">{MANIFESTO_DISTANCE.intro}</span>
        <span className="lab-distance-emphasis-text">{MANIFESTO_DISTANCE.emphasis}</span>
      </blockquote>

      <ul className="lab-distance-promises">
        {MANIFESTO_DISTANCE.bullets.map((item, i) => (
          <li key={item} style={{ "--promise-i": i } as CSSProperties}>
            <span className="lab-distance-promise-icon" aria-hidden>
              ✦
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
