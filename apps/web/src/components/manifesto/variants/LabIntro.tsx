"use client";

import { useEffect, useState } from "react";
import { YuvmiLogo } from "./YuvmiLogo";

type LabIntroProps = {
  sceneReady: boolean;
  onComplete: () => void;
};

const MIN_MS = 180;
const MAX_MS = 700;
const EXIT_MS = 200;

export function LabIntro({ sceneReady, onComplete }: LabIntroProps) {
  const [phase, setPhase] = useState<"loading" | "exit">("loading");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onComplete();
      return;
    }

    const start = Date.now();
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      setProgress(1);
      setPhase("exit");
      window.setTimeout(onComplete, EXIT_MS);
    };

    const tick = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const timeP = Math.min(elapsed / MIN_MS, 1);
      setProgress(sceneReady ? Math.min(timeP + 0.08, 1) : timeP * 0.88);

      if ((elapsed >= MIN_MS && sceneReady) || elapsed >= MAX_MS) {
        window.clearInterval(tick);
        finish();
      }
    }, 32);

    return () => window.clearInterval(tick);
  }, [sceneReady, onComplete]);

  return (
    <div className={`lab-intro ${phase === "exit" ? "is-exiting" : ""}`} aria-live="polite">
      <div className="lab-intro-backdrop" />
      <div className="lab-intro-card">
        <div className="lab-intro-shimmer" aria-hidden />
        <div className="lab-intro-logo">
          <YuvmiLogo size={40} />
        </div>
        <p className="lab-intro-brand">Yuvmi</p>
        <div className="lab-intro-bar">
          <div className="lab-intro-bar-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
