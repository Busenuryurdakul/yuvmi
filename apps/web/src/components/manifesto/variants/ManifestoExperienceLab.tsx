"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { LabCloseVisual } from "./LabCloseVisual";
import { LabDistanceVisual } from "./LabDistanceVisual";
import { LabHeroVisual } from "./LabHeroVisual";
import { LabListenVisual } from "./LabListenVisual";
import { LabStepsVisual } from "./LabStepsVisual";
import { LabTrustVisual } from "./LabTrustVisual";
import { LabTogetherVisual } from "./LabTogetherVisual";
import { LabTracesVisual } from "./LabTracesVisual";
import { LabDots, LabHeader, LabKeyboardNav, LabSection } from "./LabChrome";
import { LabIntro } from "./LabIntro";
import { LabScene3D } from "./LabScene3D";

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function LabExperienceInner() {
  const searchParams = useSearchParams();
  const forceIntro = searchParams.get("replay") === "1";
  const [sceneReady, setSceneReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (forceIntro || reduceMotion) return;
    try {
      if (sessionStorage.getItem("lab-intro-seen") === "1") {
        setIntroDone(true);
      }
    } catch {
      /* sessionStorage unavailable */
    }
  }, [forceIntro, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) setIntroDone(true);
  }, [reduceMotion]);

  const handleIntroComplete = useCallback(() => {
    try {
      sessionStorage.setItem("lab-intro-seen", "1");
    } catch {
      /* sessionStorage unavailable */
    }
    setIntroDone(true);
  }, []);

  const handleReplay = useCallback(() => {
    try {
      sessionStorage.removeItem("lab-intro-seen");
    } catch {
      /* sessionStorage unavailable */
    }

    const url = new URL(window.location.href);
    url.searchParams.set("replay", "1");
    window.history.replaceState({}, "", url.toString());

    setIntroDone(false);
    document.getElementById("lab-open")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const showIntro = !introDone && !reduceMotion;

  return (
    <div className={`lab-root ${showIntro ? "is-intro-active" : ""} ${reduceMotion ? "is-reduced-motion" : ""}`}>
      <div className="lab-backdrop" aria-hidden>
        <LabScene3D onReady={() => setSceneReady(true)} />
        <div className="lab-ambient">
          <div className="lab-orb lab-orb-a" />
          <div className="lab-orb lab-orb-b" />
          <div className="lab-orb lab-orb-c" />
        </div>
        <div className="lab-vignette" />
        <div className="lab-gradient-overlay" />
      </div>

      <div className="lab-motion-field" aria-hidden>
        <div className="lab-motion-blob lab-motion-blob-a" />
        <div className="lab-motion-blob lab-motion-blob-b" />
        <div className="lab-motion-blob lab-motion-blob-c" />
      </div>

      <div className="lab-readability-scrim" aria-hidden />
      <div className="lab-grain" aria-hidden />

      {showIntro && <LabIntro sceneReady={sceneReady} onComplete={handleIntroComplete} />}

      <div className="lab-content">
        <LabHeader />
        <LabDots />
        <LabKeyboardNav />

        <main className="lab-scroll">
          <LabSection ready={introDone} id="lab-open" className="lab-section-hero">
            <LabHeroVisual ready={introDone} onExplore={() => scrollToSection("lab-distance")} />
          </LabSection>

          <LabSection ready={introDone} id="lab-distance" className="lab-section-distance">
            <LabDistanceVisual />
          </LabSection>

          <LabSection ready={introDone} id="lab-listen" className="lab-section-listen">
            <LabListenVisual />
          </LabSection>

          <LabSection ready={introDone} id="lab-steps" className="lab-section-steps">
            <LabStepsVisual />
          </LabSection>

          <LabSection ready={introDone} id="lab-traces" className="lab-section-traces">
            <LabTracesVisual />
          </LabSection>

          <LabSection ready={introDone} id="lab-together" className="lab-section-together">
            <LabTogetherVisual />
          </LabSection>

          <LabSection ready={introDone} id="lab-trust" className="lab-section-trust">
            <LabTrustVisual />
          </LabSection>

          <LabSection ready={introDone} id="lab-close" className="lab-section-close">
            <LabCloseVisual onReplay={handleReplay} />
          </LabSection>
        </main>
      </div>
    </div>
  );
}

export function ManifestoExperienceLab() {
  return (
    <Suspense fallback={<div className="lab-root lab-root-loading" aria-busy="true" />}>
      <LabExperienceInner />
    </Suspense>
  );
}
