import { PRIVACY_SECTION } from "./landing-content";

export function PrivacySection() {
  return (
    <section
      id={PRIVACY_SECTION.id}
      className="landing-privacy mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-28"
      aria-labelledby="privacy-title"
    >
      <div className="landing-privacy-inner rounded-3xl border border-teal/20 bg-teal/5 p-8 md:p-12">
        <header className="mx-auto max-w-2xl text-center">
          <h2 id="privacy-title" className="text-3xl font-semibold tracking-tight md:text-4xl">
            {PRIVACY_SECTION.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted md:text-lg">
            {PRIVACY_SECTION.subtitle}
          </p>
        </header>

        <ul className="landing-privacy-grid mt-12">
          {PRIVACY_SECTION.points.map((point) => (
            <li key={point.title}>
              <article className="landing-privacy-card h-full rounded-2xl border border-foreground/8 bg-background/80 p-6">
                <h3 className="font-semibold text-teal">{point.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{point.body}</p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
