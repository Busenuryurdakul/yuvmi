import type { LifeDomain } from "../types/user";

export type PlanTemplateStep = {
  dayOffset: number;
  title: string;
  description: string;
};

export type PlanTemplate = {
  id: string;
  domain: LifeDomain;
  title: string;
  description: string;
  steps: PlanTemplateStep[];
};

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: "morning-routine",
    domain: "personal_growth",
    title: "Sabah rutini",
    description: "30 gün boyunca disiplinli bir sabah rutini oluştur",
    steps: [
      { dayOffset: 0, title: "10 dakika sabah günlüğü yaz", description: "Bugünkü niyetini ve odak noktanı yaz" },
      { dayOffset: 1, title: "5 dakika nefes egzersizi", description: "Sakin bir başlangıç için derin nefes al" },
      { dayOffset: 2, title: "15 dakika hareket", description: "Yürüyüş, esneme veya hafif egzersiz" },
    ],
  },
  {
    id: "health-basics",
    domain: "health",
    title: "Sağlık temelleri",
    description: "Su, uyku ve hareket alışkanlıkları",
    steps: [
      { dayOffset: 0, title: "8 bardak su iç", description: "Gün boyunca su tüketimini takip et" },
      { dayOffset: 1, title: "23:00'da ekranı kapat", description: "Uyku kalitesi için dijital detoks" },
      { dayOffset: 2, title: "20 dakika yürüyüş", description: "Temponu kendin belirle" },
    ],
  },
  {
    id: "career-focus",
    domain: "career",
    title: "Kariyer odağı",
    description: "Derin çalışma ve beceri geliştirme",
    steps: [
      { dayOffset: 0, title: "25 dakika derin çalışma", description: "Tek bir önemli göreve odaklan" },
      { dayOffset: 1, title: "Bir beceri pratiği yap", description: "15 dakika öğrenme veya pratik" },
      { dayOffset: 2, title: "Haftalık hedefi gözden geçir", description: "İlerlemeni not al" },
    ],
  },
];
