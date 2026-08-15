import { PRODUCT_EXPERIENCE } from "./landing-content";

function ProductPreview({ variant }: { variant: string }) {
  switch (variant) {
    case "future-self":
      return (
        <div className="landing-product-mock">
          <p className="landing-product-mock-label">Gelecekteki Ben</p>
          <p className="landing-product-mock-quote">
            &ldquo;Sabahları sakin, odaklı ve kendine güvenen biri olmak istiyorum.&rdquo;
          </p>
          <ul className="landing-product-mock-tags">
            <li>Kariyer</li>
            <li>Huzur</li>
            <li>İlişkiler</li>
          </ul>
        </div>
      );
    case "plan":
      return (
        <div className="landing-product-mock">
          <p className="landing-product-mock-label">30 günlük plan</p>
          <ol className="landing-product-mock-steps">
            <li>Hafta 1 — Farkındalık</li>
            <li>Hafta 2 — Ritim</li>
            <li>Hafta 3 — Derinleşme</li>
          </ol>
          <p className="landing-product-mock-meta">Gün 12 / 30</p>
        </div>
      );
    case "task":
      return (
        <div className="landing-product-mock">
          <p className="landing-product-mock-label">Bugünün görevi</p>
          <p className="landing-product-mock-task">10 dakika sessiz odak — tek öncelik</p>
          <span className="landing-product-mock-badge">AI önerisi</span>
        </div>
      );
    case "review":
      return (
        <div className="landing-product-mock">
          <p className="landing-product-mock-label">Haftalık özet</p>
          <p className="landing-product-mock-review">
            Bu hafta hizalanma +4 puan. İlişkiler alanında istikrarlı ilerleme.
          </p>
        </div>
      );
    case "archive":
      return (
        <div className="landing-product-mock landing-product-mock--archive">
          <div className="landing-product-mock-thumb" aria-hidden="true" />
          <div className="landing-product-mock-thumb landing-product-mock-thumb--doc" aria-hidden="true" />
          <p className="landing-product-mock-meta">3 görsel · 1 belge</p>
        </div>
      );
    default:
      return null;
  }
}

export function ProductExperience() {
  return (
    <section
      id={PRODUCT_EXPERIENCE.id}
      className="landing-product mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-28"
      aria-labelledby="product-experience-title"
    >
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-gold">Ürün deneyimi</p>
        <h2 id="product-experience-title" className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
          {PRODUCT_EXPERIENCE.title}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted md:text-lg">
          {PRODUCT_EXPERIENCE.subtitle}
        </p>
      </header>

      <ul className="landing-product-grid mt-14 md:mt-16">
        {PRODUCT_EXPERIENCE.items.map((item) => (
          <li key={item.id}>
            <article className="landing-product-card glass h-full rounded-2xl p-6">
              <ProductPreview variant={item.preview} />
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
