import Link from "next/link";
import {
  APP_NAME,
  APP_TAGLINE,
  LIFE_DOMAINS,
  SPACE_TYPES,
} from "@yuvmi/shared";

const features = [
  {
    title: "Bugün & Gelecek",
    description:
      "Her gün nerede olduğunu kaydet. Gelecekteki halinle arandaki mesafeyi görsel olarak takip et.",
    icon: "◎",
  },
  {
    title: "Gelecekteki Sen",
    description:
      "Hayalindeki yaşamı tanımla — kariyer, ilişki, huzur. Onun sesiyle günlük ritüeller oluştur.",
    icon: "✦",
  },
  {
    title: "Vizyon Panosu",
    description:
      "Çektiğin hayatı görselleştir. Ne kadar tanıdık görünürse, o kadar ulaşılabilir olur.",
    icon: "◈",
  },
  {
    title: "Minnet & Yansıma",
    description:
      "Kısa günlük girişlerle hikâyeni değiştir. Bugünün küçük kazanımlarını kaydet.",
    icon: "♡",
  },
];

const differentiators = [
  {
    title: "Sosyal ama mahrem",
    text: "Arkadaş ekle, sevgilinle ortak alan aç — ama her şey senin kontrolünde.",
  },
  {
    title: "Web + Mobil",
    text: "Evde web'den, yolda mobilde. Verilerin her yerde senkron.",
  },
  {
    title: "Şeffaf değer",
    text: "Temel özellikler erişilebilir. Agresif paywall yok — gerçek dönüşüm odaklı.",
  },
  {
    title: "Kişiye özel alanlar",
    text: "Kişisel, çift, arkadaş ve aile alanları — her ilişki için ayrı deneyim.",
  },
];

export default function Home() {
  return (
    <div className="gradient-hero min-h-full">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-lg text-white">
            y
          </span>
          <span className="text-xl font-semibold tracking-tight">{APP_NAME}</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <Link href="/manifesto" className="hover:text-foreground transition-colors">
            Manifesto
          </Link>
          <a href="#ozellikler" className="hover:text-foreground transition-colors">
            Özellikler
          </a>
          <a href="#alanlar" className="hover:text-foreground transition-colors">
            Alanlar
          </a>
          <a href="#neden" className="hover:text-foreground transition-colors">
            Neden Yuvmi?
          </a>
        </nav>
        <Link
          href="#bekleme"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Erken Erişim
        </Link>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 text-center md:pt-24">
          <p className="mb-4 inline-block rounded-full bg-accent-soft px-4 py-1.5 text-sm font-medium text-accent">
            Kişisel gelişim · Manifestasyon · Bağ
          </p>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            {APP_TAGLINE}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            Yuvmi, bugünkü halinle hayalindeki gelecekteki sen arasındaki yolculuğu
            görünür kılar. Tek başına veya sevdiklerinle — kendi hızında, kendi
            alanında.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="#bekleme"
              className="w-full rounded-full bg-accent px-8 py-3.5 text-base font-medium text-white transition hover:opacity-90 sm:w-auto"
            >
              Bekleme listesine katıl
            </Link>
            <a
              href="#ozellikler"
              className="w-full rounded-full border border-foreground/10 px-8 py-3.5 text-base font-medium transition hover:bg-surface sm:w-auto"
            >
              Nasıl çalışır?
            </a>
          </div>

          <div className="glass mx-auto mt-16 max-w-3xl rounded-3xl p-8 text-left shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm font-medium text-muted">Hizalanma skoru</span>
              <span className="rounded-full bg-teal/15 px-3 py-1 text-sm font-semibold text-teal">
                %68
              </span>
            </div>
            <div className="space-y-4">
              {(["career", "relationships", "peace"] as const).map((domain) => (
                <div key={domain}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span>
                      {LIFE_DOMAINS[domain].emoji} {LIFE_DOMAINS[domain].label.tr}
                    </span>
                    <span className="text-muted">Bugün → Hedef</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-foreground/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-teal"
                      style={{ width: domain === "career" ? "72%" : domain === "relationships" ? "65%" : "81%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="ozellikler" className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">
            Dört sütun, bir yolculuk
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted">
            Aya&apos;nın ses-vizyon-minnet üçlüsünden ilham aldık. Azora&apos;nın
            kişisel içgörü derinliğini ekledik. Üzerine sosyal bağ katmanını
            koyduk.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="glass rounded-2xl p-6 transition hover:shadow-md"
              >
                <span className="text-2xl text-accent">{feature.icon}</span>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="alanlar" className="bg-surface/50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">
              Senin alanın, senin kuralların
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted">
              Kişisel yolculuğundan çift uyumluluğuna, arkadaş desteğinden aile
              hedeflerine — her alan farklı özellikler sunar.
            </p>
            <div className="mt-14 grid gap-6 md:grid-cols-2">
              {(Object.keys(SPACE_TYPES) as Array<keyof typeof SPACE_TYPES>).map(
                (type) => (
                  <article
                    key={type}
                    className="rounded-2xl border border-foreground/8 bg-background p-8"
                  >
                    <h3 className="text-xl font-semibold">
                      {SPACE_TYPES[type].label.tr}
                    </h3>
                    <p className="mt-2 text-muted">
                      {SPACE_TYPES[type].description.tr}
                    </p>
                  </article>
                ),
              )}
            </div>
            <p className="mt-10 text-center text-sm text-muted">
              Arkadaş ekleyerek paylaşımlı alanları açabilir, birlikte ilerlemeyi
              takip edebilirsin.
            </p>
          </div>
        </section>

        <section id="neden" className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">
            Rakiplerin önünde ne var?
          </h2>
          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {differentiators.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-teal/20 bg-teal/5 p-6"
              >
                <h3 className="font-semibold text-teal">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="bekleme" className="mx-auto max-w-2xl px-6 pb-24 pt-8 text-center">
          <div className="glass rounded-3xl p-10">
            <h2 className="text-2xl font-semibold">Yolculuk başlıyor</h2>
            <p className="mt-3 text-muted">
              Yuvmi şu an geliştirme aşamasında. Ana hatları birlikte
              şekillendireceğiz — sen detayları aktar, biz inşa edelim.
            </p>
            <form className="mt-8 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="E-posta adresin"
                className="flex-1 rounded-full border border-foreground/10 bg-background px-5 py-3 text-sm outline-none focus:border-accent"
                aria-label="E-posta adresi"
              />
              <button
                type="submit"
                className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Haberdar ol
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-foreground/8 py-8 text-center text-sm text-muted">
        <p>© {new Date().getFullYear()} {APP_NAME}. Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
}
