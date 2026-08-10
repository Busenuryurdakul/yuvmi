export const MANIFESTO_HERO = {
  kicker: "Manifesto",
  overline: "Yuvmi · dijital yuvan",
  chip: "Dijital yuvan",
  title: "Bugünkü seni keşfet.",
  highlight: "Gelecekteki seni inşa et.",
  subtitle:
    "Yuvmi, olmak istediğin kişiyle bugünkü hâlin arasındaki yolu görünür kılar ve hedeflerini her gün atabileceğin küçük adımlara dönüştürür.",
  ctaPrimary: "Gelecekteki Ben'imi Oluştur",
  ctaSecondary: "Manifestoyu Keşfet",
  scrollCue: "Keşfetmeye başla",
  pillars: [
    { icon: "◎", label: "Seni dinler", accent: "teal" as const },
    { icon: "◈", label: "Hayatının izleri", accent: "violet" as const },
    { icon: "♡", label: "Birlikte büyü", accent: "peach" as const },
  ],
};

export const MANIFESTO_DISTANCE = {
  lead: "Hepimizin içinde, henüz tam olarak yaşayamadığımız bir hayat vardır.",
  body: "Çoğu zaman ne istediğimizi biliriz — ama nereden başlayacağımızı bilemeyiz.",
  intro: "Yuvmi, tam olarak bu mesafe için doğdu:",
  emphasis: "Bugünkü sen ile gelecekteki sen arasındaki mesafe.",
  bullets: [
    "Kim olman gerektiğini söylemez.",
    "Seni başkalarıyla karşılaştırmaz.",
    "Geleceğini tahmin ettiğini iddia etmez.",
  ],
} as const;

export const MANIFESTO_LISTEN = {
  chip: "Yapay Zekâ",
  title: "Seni",
  titleAccent: "dinler.",
  body: "Nasıl bir hayat istediğini, neyi değiştirmeye çalıştığını ve içinde büyüttüğün hayalleri anlamaya çalışır.",
  footnote: "Karar her zaman senin — Yuvmi yalnızca yolunu görünür kılar.",
} as const;

export const MANIFESTO_AI_FLOW = [
  { step: "01", label: "Seni dinler", icon: "◎", desc: "Cevaplarını ve hayallerini anlar." },
  { step: "02", label: "Gelecekteki seni tanımlar", icon: "✦", desc: "Olmak istediğin kişiyi netleştirir." },
  { step: "03", label: "Plan oluşturur", icon: "▤", desc: "Büyük hedefleri adımlara böler." },
  { step: "04", label: "Her gün planı sana göre yeniler", icon: "↻", desc: "Tempo ve enerjine göre ayarlar." },
] as const;

export const MANIFESTO_STEPS = [
  { label: "Bir saatlik çalışma", time: "60 dk", icon: "◉", tier: "Derin odak", accent: "violet" as const },
  { label: "Sekiz dakikalık bir başlangıç", time: "8 dk", icon: "◈", tier: "Hızlı başlangıç", accent: "peach" as const },
  { label: "Durup yönünü yeniden hatırlamak", time: "∞", icon: "↺", tier: "Yeniden hizalan", accent: "teal" as const },
] as const;

export const MANIFESTO_PACE = {
  chip: "Kendi Tempon",
  title: "Kendi hızında",
  titleAccent: "ilerle.",
  lead: "Herkes aynı hızda ilerlemek zorunda değil.",
  body: "Enerjinin düşük olduğu günlerde daha küçük bir adım atabilirsin. Yol değişebilir, plan yeniden kurulabilir.",
  emphasis: "Yuvmi mükemmelliği değil, geri dönme cesaretini önemser.",
} as const;

export const MANIFESTO_TRACES = {
  title: "Hayatının İzleri",
  lead: "Fotoğrafların, belgelerin, notların ve başarıların yalnızca saklanmaz.",
  leadAccent: "Değişiminin yaşayan parçalarına dönüşür.",
  items: [
    {
      icon: "◻",
      title: "Fotoğraflar",
      desc: "Anılarını ve dönüm noktalarını kaydet.",
      accent: "violet" as const,
    },
    {
      icon: "▤",
      title: "Belgeler",
      desc: "Sözleşmeler, notlar ve kişisel kayıtlar.",
      accent: "peach" as const,
    },
    {
      icon: "◆",
      title: "Sertifikalar",
      desc: "Başarıların somut kanıtları.",
      accent: "teal" as const,
    },
    {
      icon: "◎",
      title: "Vizyon panosu",
      desc: "Geleceğini görsel olarak inşa et.",
      accent: "violet" as const,
    },
    {
      icon: "◈",
      title: "Gelişim arşivi",
      desc: "Geçmişini, bugününü ve yolculuğunu bir arada gör.",
      accent: "peach" as const,
    },
  ],
} as const;

export const MANIFESTO_TOGETHER = {
  title: "Birlikte Büyü",
  lead: "Bazı yollar kişiseldir. Bazıları sevdiğin insanlarla anlam kazanır.",
  note: "Yuvmi'de birlikte büyümek, aynı kişiye dönüşmek değildir.",
  items: [
    {
      icon: "♡",
      title: "Partner & arkadaş",
      desc: "Sevdiklerini davet et, yolculuğunu paylaş.",
      accent: "peach" as const,
    },
    {
      icon: "◎",
      title: "Ortak hedefler",
      desc: "Birlikte hayal kur, birlikte küçük adımlar at.",
      accent: "violet" as const,
    },
    {
      icon: "◈",
      title: "Özel alanlar",
      desc: "Kişisel, çift ve arkadaş alanları — her ilişki için ayrı.",
      accent: "teal" as const,
    },
  ],
} as const;

export const MANIFESTO_TRUST = {
  title: "Güven",
  headline: "Hayatın sana aittir.",
  body: "Neyi paylaşacağına, kimin göreceğine ve AI'ın hangi bilgileri kullanabileceğine yalnızca sen karar verirsin.",
  controls: [
    { icon: "◌", label: "Paylaşım", accent: "violet" as const },
    { icon: "◎", label: "Görünürlük", accent: "peach" as const },
    { icon: "◈", label: "AI verisi", accent: "teal" as const },
  ],
  lines: ["Güven olmadan bağ kurulmaz.", "Mahremiyet olmadan yuva olmaz."],
} as const;

export const MANIFESTO_CLOSING = {
  title: "Kapanış",
  lead: "Geleceğin bir gün kendiliğinden gelmez.",
  emphasis: "Bugün attığın küçük adımlarla kurulur.",
  taglineParts: [
    "Bugünkü seni gör.",
    "Gelecekteki seni inşa et.",
    "Sevdiklerinle birlikte büyü.",
  ],
  cta: "İlk Adımımı At",
  replay: "Tekrar izle",
  emailPrompt: "İlk adımın burada başlıyor — e-postanı bırak, seni haberdar edelim.",
  emailPlaceholder: "E-posta adresin",
  emailSubmit: "Haberdar ol",
  emailSuccess: "Harika. İlk adımını attın — yolculuk başladığında seni haberdar edeceğiz.",
  emailError: "Geçerli bir e-posta adresi gir.",
} as const;
