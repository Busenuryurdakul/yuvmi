import { SPACE_TYPES, type SpaceType } from "@yuvmi/shared";
import { LIFE_SPACES, spaceDisplayLabel } from "./landing-content";

const SPACE_ORDER: SpaceType[] = ["personal", "couple", "friends", "family"];

export function LifeSpaces() {
  return (
    <section
      id={LIFE_SPACES.id}
      className="landing-spaces bg-surface/50 py-20 md:py-28"
      aria-labelledby="life-spaces-title"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-teal">Yaşam alanları</p>
          <h2 id="life-spaces-title" className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            {LIFE_SPACES.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">{LIFE_SPACES.subtitle}</p>
        </header>

        <ul className="landing-spaces-grid mt-14 md:mt-16">
          {SPACE_ORDER.map((type) => (
            <li key={type}>
              <article className="landing-space-card h-full rounded-2xl border border-foreground/8 bg-background p-7 md:p-8">
                <h3 className="text-xl font-semibold">{spaceDisplayLabel(type)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {SPACE_TYPES[type].description.tr}
                </p>
              </article>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center text-sm text-muted">{LIFE_SPACES.footnote}</p>
      </div>
    </section>
  );
}
