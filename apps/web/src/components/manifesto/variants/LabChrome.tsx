"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { YuvmiLogo } from "./YuvmiLogo";

export const LAB_SECTIONS = [
  { id: "lab-open", label: "Başlangıç", navLabel: "Başlangıç" },
  { id: "lab-distance", label: "Mesafe", navLabel: "Mesafe" },
  { id: "lab-listen", label: "Dinler", navLabel: "Dinler" },
  { id: "lab-steps", label: "Adımlar", navLabel: "Adımlar" },
  { id: "lab-traces", label: "Hayatının İzleri", navLabel: "İzler" },
  { id: "lab-together", label: "Birlikte", navLabel: "Birlikte" },
  { id: "lab-trust", label: "Güven", navLabel: "Güven" },
  { id: "lab-close", label: "Kapanış", navLabel: "Kapanış" },
] as const;

export function scrollToLabSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function useLabActiveSection() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const scrollRoot = getLabScrollRoot();
    if (!scrollRoot) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = LAB_SECTIONS.findIndex((s) => s.id === entry.target.id);
            if (idx >= 0) setActive(idx);
          }
        }
      },
      { root: scrollRoot, threshold: 0.45 },
    );

    for (const s of LAB_SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return active;
}

export function getLabScrollRoot() {
  return document.querySelector(".lab-scroll");
}

function isVisibleInScrollRoot(el: Element, scrollRoot: Element) {
  const rootRect = scrollRoot.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  return rect.top < rootRect.bottom - 40 && rect.bottom > rootRect.top + 40;
}

export function LabHeader() {
  const active = useLabActiveSection();

  return (
    <header className="lab-header">
      <Link href="/" className="lab-brand">
        <span className="lab-brand-icon">
          <YuvmiLogo size={28} />
        </span>
        <p className="lab-brand-name">Yuvmi</p>
      </Link>
      <nav className="lab-header-nav" aria-label="Bölüm navigasyonu">
        {LAB_SECTIONS.map((section, i) => (
          <button
            key={section.id}
            type="button"
            className={`lab-header-section${i === active ? " is-active" : ""}`}
            aria-label={section.label}
            aria-current={i === active ? "true" : undefined}
            onClick={() => scrollToLabSection(section.id)}
          >
            {section.navLabel}
          </button>
        ))}
      </nav>
    </header>
  );
}

export function LabDots() {
  const active = useLabActiveSection();

  return (
    <nav className="lab-dots" aria-label="Bölüm navigasyonu">
      {LAB_SECTIONS.map((s, i) => (
        <button
          key={s.id}
          type="button"
          aria-label={s.label}
          aria-current={i === active ? "true" : undefined}
          className={i === active ? "is-active" : ""}
          onClick={() => scrollToLabSection(s.id)}
        >
          <span className="lab-dot-tooltip">{s.label}</span>
        </button>
      ))}
    </nav>
  );
}

type LabSectionProps = {
  id: string;
  children: React.ReactNode;
  className?: string;
  ready?: boolean;
};

export function LabSection({ id, children, className = "", ready = true }: LabSectionProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ready) return;

    const el = ref.current;
    const scrollRoot = getLabScrollRoot();
    if (!el || !scrollRoot) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reveal = () => el.classList.add("is-visible");

    if (reduced) {
      reveal();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) reveal();
      },
      { root: scrollRoot, threshold: 0.3 },
    );

    observer.observe(el);

    if (isVisibleInScrollRoot(el, scrollRoot)) {
      reveal();
    }

    return () => observer.disconnect();
  }, [id, ready]);

  return (
    <section ref={ref} id={id} className={`lab-section ${className}`}>
      <div className="lab-section-inner">{children}</div>
    </section>
  );
}

export function LabKeyboardNav() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();

      const scrollRoot = getLabScrollRoot();
      if (!scrollRoot) return;

      const rootRect = scrollRoot.getBoundingClientRect();
      const idx = LAB_SECTIONS.findIndex((s) => {
        const el = document.getElementById(s.id);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.top >= rootRect.top - 80 && rect.top < rootRect.top + rootRect.height * 0.5;
      });

      const next =
        e.key === "ArrowDown"
          ? LAB_SECTIONS[Math.min(idx + 1, LAB_SECTIONS.length - 1)]
          : LAB_SECTIONS[Math.max(idx - 1, 0)];

      document.getElementById(next.id)?.scrollIntoView({ behavior: "smooth" });
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
