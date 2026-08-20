import type { LifeDomain } from "../types/user";

export type PlanTemplateStep = {
  dayOffset: number;
  title: string;
  description: string;
};

export type PlanTemplate = {
  id: string;
  /** Yaşam alanı — öneri sıralaması için kullanılır */
  domain: LifeDomain | "generic";
  title: string;
  description: string;
  steps: PlanTemplateStep[];
};

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: "morning-routine",
    domain: "personal_growth",
    title: "Sabah çapası",
    description: "Her sabah küçük bir ritüelle günü bilinçli başlat",
    steps: [
      { dayOffset: 0, title: "3 cümle sabah niyeti", description: "Bugün nasıl hissetmek istediğini yaz" },
      { dayOffset: 1, title: "5 dakika nefes", description: "Telefona dokunmadan önce sakinleş" },
      { dayOffset: 2, title: "10 dakika hareket", description: "Yürüyüş, esneme veya hafif egzersiz" },
      { dayOffset: 7, title: "Haftalık mini değerlendirme", description: "Ne işe yaradı, neyi küçültelim?" },
    ],
  },
  {
    id: "health-basics",
    domain: "health",
    title: "Sağlık temelleri",
    description: "Su, uyku ve hareket — enerjini koruyan üçlü",
    steps: [
      { dayOffset: 0, title: "Su takibi", description: "Gün boyunca en az 6–8 bardak su" },
      { dayOffset: 1, title: "Yatmadan 30 dk ekransız", description: "Uyku kalitesi için dijital sınır" },
      { dayOffset: 2, title: "20 dakika hareket", description: "Tempo sana kalsın — yürüyüş yeterli" },
      { dayOffset: 7, title: "Enerji notu", description: "Bu hafta ne seni yordu, ne iyi geldi?" },
    ],
  },
  {
    id: "career-focus",
    domain: "career",
    title: "Kariyer odağı",
    description: "Derin çalışma ve görünür ilerleme alışkanlığı",
    steps: [
      { dayOffset: 0, title: "25 dk derin çalışma", description: "Tek önemli göreve odaklan, bildirimleri kapat" },
      { dayOffset: 1, title: "15 dk beceri pratiği", description: "Öğrenme, portfolyo veya network — birini seç" },
      { dayOffset: 3, title: "İlerleme kaydı", description: "Bugün ne ürettin? Bir cümle yeter" },
      { dayOffset: 7, title: "Haftalık öncelik netleştir", description: "Gelecek haftanın tek ana odağını yaz" },
    ],
  },
  {
    id: "learning-sprint",
    domain: "learning",
    title: "Öğrenme sprinti",
    description: "Kısa, düzenli pratikle yeni bir beceriye yaklaş",
    steps: [
      { dayOffset: 0, title: "20 dk odaklı pratik", description: "Video, kitap veya alıştırma — bir kanal seç" },
      { dayOffset: 1, title: "1 şey not al", description: "Öğrendiğini kendi cümlelerinle yaz" },
      { dayOffset: 3, title: "Mini uygulama", description: "Öğrendiğini küçük bir örnekle dene" },
      { dayOffset: 7, title: "Haftalık özet", description: "Ne oturdu, ne tekrar etsin?" },
    ],
  },
  {
    id: "finance-clarity",
    domain: "finance",
    title: "Finans netliği",
    description: "Harcama farkındalığı ve küçük birikim adımları",
    steps: [
      { dayOffset: 0, title: "Bugünkü harcamaları yaz", description: "Zorunlu / isteğe bağlı diye ayır" },
      { dayOffset: 2, title: "Bir gereksizi kes", description: "Bu hafta vazgeçeceğin tek harcamayı seç" },
      { dayOffset: 4, title: "Mini birikim", description: "Küçük de olsa bir tutarı kenara ayır" },
      { dayOffset: 7, title: "Haftalık bakış", description: "Para stresini ne tetikledi?" },
    ],
  },
  {
    id: "relationship-presence",
    domain: "relationships",
    title: "İlişkide varlık",
    description: "Kaliteli zaman ve açık iletişim için küçük adımlar",
    steps: [
      { dayOffset: 0, title: "Bir kişiye mesaj", description: "Sadece merhaba de — gündem taşıma" },
      { dayOffset: 2, title: "15 dk telefonsuz sohbet", description: "Yakınında biriyle gerçekten dinle" },
      { dayOffset: 4, title: "Minnettarlık cümlesi", description: "Bir ilişkide neye şükrettiğini yaz" },
      { dayOffset: 7, title: "Haftalık bağlantı", description: "Kimle daha çok vakit istiyorsun?" },
    ],
  },
  {
    id: "peace-reset",
    domain: "peace",
    title: "Zihin molası",
    description: "Stresi küçült, gün içinde nefes alacak boşluk aç",
    steps: [
      { dayOffset: 0, title: "5 dk sessizlik", description: "Gözler kapalı, sadece nefes" },
      { dayOffset: 1, title: "1 endişeyi yaz", description: "Kontrol edebileceğin tek adımı seç" },
      { dayOffset: 3, title: "Doğa / gün ışığı", description: "10 dk dışarı çık veya pencere kenarı" },
      { dayOffset: 7, title: "Haftalık huzur notu", description: "Ne seni sakinleştirdi?" },
    ],
  },
  {
    id: "creative-spark",
    domain: "creativity",
    title: "Yaratıcı kıvılcım",
    description: "Mükemmel olmadan üretmeye başla",
    steps: [
      { dayOffset: 0, title: "10 dk serbest çizim / yazı", description: "Sonuç değil, süreç — yargısız" },
      { dayOffset: 2, title: "Bir ilham kaydı", description: "Beğendiğin bir eseri veya fikri not al" },
      { dayOffset: 4, title: "Mini proje parçası", description: "Başladığın şeye 15 dk daha ekle" },
      { dayOffset: 7, title: "Haftalık vitrin", description: "Bu hafta ne ürettin? Kendine göster" },
    ],
  },
  {
    id: "gentle-start",
    domain: "generic",
    title: "Yumuşak başlangıç",
    description: "Alan fark etmeksizin — küçük, sürdürülebilir üç adım",
    steps: [
      { dayOffset: 0, title: "Bugünün minimumu", description: "5 dakikada yapabileceğin en küçük adım" },
      { dayOffset: 1, title: "Dünkü adımı tekrarla", description: "Aynısı veya biraz daha fazlası" },
      { dayOffset: 3, title: "İlerleme işareti", description: "Ne değişti? Bir cümle yaz" },
      { dayOffset: 7, title: "Haftalık nazik bakış", description: "Kendine sert değil, net ol" },
    ],
  },
];

const DOMAIN_ORDER: LifeDomain[] = [
  "personal_growth",
  "health",
  "career",
  "finance",
  "relationships",
  "learning",
  "peace",
  "creativity",
];

const byId = new Map(PLAN_TEMPLATES.map((t) => [t.id, t]));

/** Kullanıcının seçtiği yaşam alanlarına göre plan şablonlarını sırala */
export function getRecommendedPlanTemplates(domains: string[]): PlanTemplate[] {
  const known = new Set<LifeDomain>(DOMAIN_ORDER);
  const userDomains = domains.filter((d): d is LifeDomain => known.has(d as LifeDomain));

  const matched: PlanTemplate[] = [];
  const seen = new Set<string>();

  for (const domain of userDomains) {
    const template = PLAN_TEMPLATES.find((t) => t.domain === domain);
    if (template && !seen.has(template.id)) {
      matched.push(template);
      seen.add(template.id);
    }
  }

  const generic = byId.get("gentle-start");
  if (matched.length === 0) {
    return generic ? [generic] : PLAN_TEMPLATES.slice(0, 3);
  }

  if (generic && !seen.has(generic.id)) {
    matched.push(generic);
  }

  return matched;
}

function normTitle(value: string) {
  return value.trim().toLocaleLowerCase("tr").replace(/\s+/g, " ");
}

const cannedPlanTitles = new Set(PLAN_TEMPLATES.map((t) => normTitle(t.title)));
const cannedStepTitles = new Set(PLAN_TEMPLATES.flatMap((t) => t.steps.map((s) => normTitle(s.title))));
const cannedStepDescriptions = new Set(
  PLAN_TEMPLATES.flatMap((t) => t.steps.map((s) => normTitle(s.description))),
);

export function isCannedPlanTitle(title: string) {
  return cannedPlanTitles.has(normTitle(title));
}

export function isCannedPlanStepTitle(title: string) {
  return cannedStepTitles.has(normTitle(title));
}

export function isCannedPlanStep(step: { title: string; description?: string }) {
  if (isCannedPlanStepTitle(step.title)) return true;
  if (step.description && cannedStepDescriptions.has(normTitle(step.description))) return true;
  return false;
}
