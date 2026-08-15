import { HOW_IT_WORKS } from "./landing-content";

export function HowItWorks() {
  return (
    <section
      id={HOW_IT_WORKS.id}
      className="landing-journey mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-28"
      aria-labelledby="how-it-works-title"
    >
      <header className="landing-journey-header mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-teal">Nasıl çalışır</p>
        <h2 id="how-it-works-title" className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
          {HOW_IT_WORKS.title}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted md:text-lg">{HOW_IT_WORKS.subtitle}</p>
      </header>

      <ol className="landing-journey-steps mt-14 md:mt-16">
        {HOW_IT_WORKS.steps.map((step, index) => (
          <li key={step.number} className="landing-journey-step">
            <div className="landing-journey-step-marker" aria-hidden="true">
              <span className="landing-journey-step-number">{step.number}</span>
              {index < HOW_IT_WORKS.steps.length - 1 ? (
                <span className="landing-journey-step-connector" />
              ) : null}
            </div>
            <article className="landing-journey-step-body">
              <h3 className="text-xl font-semibold tracking-tight md:text-2xl">{step.title}</h3>
              <p className="mt-3 max-w-md text-base leading-relaxed text-muted">{step.body}</p>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
