import Link from "next/link";
import { LANDING_HERO } from "./landing-content";
import { HeroAlignmentPreview } from "./HeroAlignmentPreview";

export function LandingHero() {
  return (
    <section className="landing-hero mx-auto max-w-6xl px-5 pb-20 pt-12 sm:px-6 md:pb-28 md:pt-20">
      <div className="landing-hero-grid">
        <div className="landing-hero-copy">
          <p className="landing-hero-kicker">{LANDING_HERO.kicker}</p>
          <h1 className="landing-hero-headline">{LANDING_HERO.headline}</h1>
          <p className="landing-hero-subhead">{LANDING_HERO.subhead}</p>
          <div className="landing-hero-actions">
            <Link
              href={LANDING_HERO.ctaPrimary.href}
              className="landing-focus-ring inline-flex w-full items-center justify-center rounded-full bg-accent px-7 py-3.5 text-base font-medium text-white transition hover:opacity-90 sm:w-auto"
            >
              {LANDING_HERO.ctaPrimary.label}
            </Link>
            <a
              href={LANDING_HERO.ctaSecondary.href}
              className="landing-focus-ring inline-flex w-full items-center justify-center rounded-full border border-foreground/12 bg-surface/60 px-7 py-3.5 text-base font-medium transition hover:bg-surface sm:w-auto"
            >
              {LANDING_HERO.ctaSecondary.label}
            </a>
          </div>
        </div>

        <div className="landing-hero-visual">
          <HeroAlignmentPreview />
        </div>
      </div>
    </section>
  );
}
