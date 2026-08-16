import { APP_TAGLINE, SPACE_TYPES, type SpaceType } from "@yuvmi/shared";

export const LANDING_NAV = [
  { label: "Nasıl Çalışır", href: "#nasil-calisir" },
  { label: "Alanlar", href: "#alanlar" },
  { label: "Manifesto", href: "/manifesto" },
] as const;

export const LANDING_HERO = {
  kicker: "AI destekli kişisel gelişim",
  headline: APP_TAGLINE,
  subhead:
    "Yuvmi, bugün nerede olduğunu görmeni sağlar; yapay zeka hedeflerini günlük, uygulanabilir görevlere dönüştürür. Her adım ölçülebilir, her ilerleme görünür.",
  ctaPrimary: { label: "Bekleme listesine katıl", href: "#bekleme" },
  ctaSecondary: { label: "Nasıl çalışır?", href: "#nasil-calisir" },
} as const;

export type AlignmentDomainKey = "career" | "relationships" | "peace";

export const ALIGNMENT_PREVIEW = {
  overallScore: 68,
  todayLabel: "Bugün",
  futureLabel: "Gelecekteki Sen",
  alignmentLabel: "Hizalanma",
  domains: [
    { key: "career" as AlignmentDomainKey, current: 52, future: 76 },
    { key: "relationships" as AlignmentDomainKey, current: 74, future: 84 },
    { key: "peace" as AlignmentDomainKey, current: 41, future: 72 },
  ],
} as const;

export const HOW_IT_WORKS = {
  id: "nasil-calisir",
  title: "Aradaki yol, üç adımda",
  subtitle:
    "Büyük hedefler tek başına bunaltıcı olabilir. Yuvmi süreci netleştirir; AI her adımı günlük ritmine uygun hale getirir.",
  steps: [
    {
      number: "01",
      title: "Bugünü Gör",
      body: "Hayatının önemli alanlarında bugün nerede olduğunu kaydet. Check-in ve hizalanma skoru, başlangıç noktanı şeffaf kılar.",
    },
    {
      number: "02",
      title: "Geleceğini Tanımla",
      body: "Gelecekteki Ben profilini oluştur; kariyer, ilişki, huzur gibi alanlarda hedeflediğin kişiyi somutlaştır.",
    },
    {
      number: "03",
      title: "Yolu İnşa Et",
      body: "AI, hedeflerini 30 günlük plana ve günlük kişiselleştirilmiş görevlere böler. Her görev gelecekteki sana bir adım daha yaklaştırır.",
    },
  ],
} as const;

export const PRODUCT_EXPERIENCE = {
  id: "urun-deneyimi",
  title: "Her gün dokunabileceğin bir yolculuk",
  subtitle:
    "Plan, görev, değerlendirme ve arşiv — tek bir akışta. Web ve mobilde aynı veri, aynı ilerleme.",
  items: [
    {
      id: "future-self",
      title: "Gelecekteki Ben profili",
      description: "Hedeflediğin kişiyi alan alan tanımla; hizalanma skoru bu vizyonla bugünkü halini karşılaştırır.",
      preview: "future-self",
    },
    {
      id: "plan",
      title: "30 günlük plan",
      description: "Şablon veya AI önerisiyle yol haritanı oluştur; haftalık döngüyle güncellenir.",
      preview: "plan",
    },
    {
      id: "daily-task",
      title: "Günlük kişiselleştirilmiş görev",
      description: "Bugünün tek odak görevi — net, küçük ve gelecekteki sana hizmet eden.",
      preview: "task",
    },
    {
      id: "weekly-review",
      title: "Haftalık AI değerlendirmesi",
      description: "İlerlemeni özetler, momentumunu koruman için bir sonraki haftaya yön verir.",
      preview: "review",
    },
    {
      id: "archive",
      title: "Görsel ve belge arşivi",
      description: "Vizyon panosu, notlar ve belgeler — izninle, alan bazlı görünürlükle.",
      preview: "archive",
    },
  ],
} as const;

const COUPLE_DISPLAY_LABEL = "Çift";

export function spaceDisplayLabel(type: SpaceType): string {
  if (type === "couple") return COUPLE_DISPLAY_LABEL;
  return SPACE_TYPES[type].label.tr;
}

export const LIFE_SPACES = {
  id: "alanlar",
  title: "Senin alanın, senin kuralların",
  subtitle:
    "Kişisel yolculuktan çift uyumuna, arkadaş desteğinden aile hedeflerine — her alan farklı deneyim sunar.",
  footnote:
    "Arkadaş ekleyerek paylaşımlı alanları açabilir, birlikte ilerlemeyi takip edebilirsin.",
} as const;

export const PRIVACY_SECTION = {
  id: "gizlilik",
  title: "Sosyal ama mahrem",
  subtitle:
    "Bağ kurmak için paylaşım gerekir; mahremiyet ise pazarlık konusu değildir. Yuvmi ikisini bir arada tasarlandı.",
  points: [
    {
      title: "Kullanıcı onayı",
      body: "Paylaşım, senin açık onayın olmadan başlamaz. Varsayılan: senin kontrolün.",
    },
    {
      title: "Alan bazlı görünürlük",
      body: "Kişisel, çift, arkadaş ve aile alanlarında neyin kime görüneceğini ayrı ayrı belirlersin.",
    },
    {
      title: "İzinsiz AI işleme yok",
      body: "Görsel ve belgeler, açık iznin olmadan AI tarafından analiz edilmez.",
    },
    {
      title: "Geri çekilebilir izinler",
      body: "Verdiğin her izni istediğin zaman geri alabilirsin; paylaşım anında durur.",
    },
  ],
} as const;

export const MANIFESTO_BRIDGE = {
  title: "Neden varız?",
  body: "Yuvmi bir uygulama değil yalnızca — bugünkü halinle hayalindeki gelecekteki sen arasındaki mesafeyi onurlandıran bir duruş. Manifestomuzda bu yolculuğun felsefesini anlatıyoruz.",
  cta: { label: "Manifestoyu oku", href: "/manifesto" },
} as const;

export const WAITLIST_SECTION = {
  id: "bekleme",
  title: "Yolculuk başlıyor",
  body: "Yuvmi şu an geliştirme aşamasında. Bekleme listesine katıl; erken erişim ve ürün yol haritasından haberdar ol.",
  emailPlaceholder: "E-posta adresin",
  emailLabel: "E-posta adresi",
  submitLabel: "Bekleme listesine katıl",
  submitLabelSubmitting: "Gönderiliyor...",
  consentLabel:
    "Erken erişim ve Yuvmi ile ilgili bilgilendirmeleri almak için e-posta adresimin kullanılmasını kabul ediyorum.",
  consentRequired: "Devam etmek için onay kutusunu işaretle.",
  helperText: "E-postanı yalnızca erken erişim ve ürün güncellemeleri için kullanırız.",
  successPrimary: "Bekleme listesine eklendin.",
  successSecondary: "Yuvmi hazır olduğunda sana haber vereceğiz.",
  validationError: "Geçerli bir e-posta adresi gir ve onay kutusunu işaretle.",
  rateLimitError: "Çok fazla deneme yaptın. Lütfen biraz sonra tekrar dene.",
  serverError: "Şu anda kaydını alamıyoruz. Lütfen biraz sonra tekrar dene.",
  configurationError: "Erken erişim kaydı şu anda kullanılamıyor.",
} as const;
