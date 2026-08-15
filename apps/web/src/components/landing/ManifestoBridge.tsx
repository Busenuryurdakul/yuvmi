import Link from "next/link";
import { MANIFESTO_BRIDGE } from "./landing-content";

export function ManifestoBridge() {
  return (
    <section className="landing-manifesto mx-auto max-w-6xl px-5 py-16 sm:px-6 md:py-24" aria-labelledby="manifesto-bridge-title">
      <div className="landing-manifesto-inner relative overflow-hidden rounded-3xl border border-foreground/8 bg-surface p-8 text-center md:p-14">
        <div className="landing-manifesto-glow" aria-hidden="true" />
        <h2 id="manifesto-bridge-title" className="relative text-2xl font-semibold tracking-tight md:text-3xl">
          {MANIFESTO_BRIDGE.title}
        </h2>
        <p className="relative mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
          {MANIFESTO_BRIDGE.body}
        </p>
        <Link
          href={MANIFESTO_BRIDGE.cta.href}
          className="landing-focus-ring relative mt-8 inline-flex items-center justify-center rounded-full border border-accent/30 bg-accent-soft px-7 py-3.5 text-base font-medium text-accent transition hover:bg-accent hover:text-white"
        >
          {MANIFESTO_BRIDGE.cta.label}
        </Link>
      </div>
    </section>
  );
}
