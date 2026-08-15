import type { LifeDomain, SpaceType } from "../types";

export const APP_NAME = "Yuvmi";

export const APP_TAGLINE = "Bugününü gör. Gelecekteki kendine yaklaş.";

export const APP_MANIFESTO = "Bugünkü seni keşfet. Gelecekteki seni inşa et.";

export const LIFE_DOMAINS: Record<
  LifeDomain,
  { label: { tr: string; en: string }; emoji: string }
> = {
  personal_growth: { label: { tr: "Kişisel Gelişim", en: "Personal Growth" }, emoji: "🌱" },
  health: { label: { tr: "Sağlık & Enerji", en: "Health & Energy" }, emoji: "🌿" },
  career: { label: { tr: "Kariyer", en: "Career" }, emoji: "💼" },
  finance: { label: { tr: "Finans", en: "Finance" }, emoji: "💰" },
  relationships: { label: { tr: "İlişkiler", en: "Relationships" }, emoji: "💕" },
  learning: { label: { tr: "Öğrenme & Beceri", en: "Learning & Skills" }, emoji: "📚" },
  peace: { label: { tr: "Zihin & Huzur", en: "Mind & Peace" }, emoji: "🕊️" },
  creativity: { label: { tr: "Yaratıcılık", en: "Creativity" }, emoji: "🎨" },
  freedom: { label: { tr: "Özgürlük", en: "Freedom" }, emoji: "✨" },
};

/** Onboarding seçicide gösterilen sıra — en çok seçilenler önce */
export const LIFE_DOMAIN_ORDER: LifeDomain[] = [
  "personal_growth",
  "health",
  "career",
  "finance",
  "relationships",
  "learning",
  "peace",
  "creativity",
];

export const SPACE_TYPES: Record<
  SpaceType,
  { label: { tr: string; en: string }; description: { tr: string; en: string } }
> = {
  personal: {
    label: { tr: "Kişisel", en: "Personal" },
    description: {
      tr: "Sadece senin için — bugünün ve gelecekteki halinin yolculuğu",
      en: "Just for you — your journey from today to your future self",
    },
  },
  couple: {
    label: { tr: "Sevgililer", en: "Couple" },
    description: {
      tr: "İkinizin ortak vizyonu, uyumluluk ve birlikte büyüme",
      en: "Shared vision, compatibility, and growing together",
    },
  },
  friends: {
    label: { tr: "Arkadaşlar", en: "Friends" },
    description: {
      tr: "Arkadaşlarınla ilerlemeni paylaş, birbirinizi destekleyin",
      en: "Share progress with friends and support each other",
    },
  },
  family: {
    label: { tr: "Aile", en: "Family" },
    description: {
      tr: "Aile üyelerinle ortak hedefler ve bağ",
      en: "Shared goals and connection with family",
    },
  },
};

/** Features available per space type */
export const SPACE_FEATURES_BY_TYPE: Record<SpaceType, string[]> = {
  personal: ["shared_vision_board", "private_notes"],
  couple: ["shared_vision_board", "joint_affirmations", "progress_comparison"],
  friends: ["progress_comparison", "joint_affirmations"],
  family: ["shared_vision_board", "progress_comparison"],
};

export { PLAN_TEMPLATES, getRecommendedPlanTemplates, isCannedPlanTitle, isCannedPlanStepTitle, isCannedPlanStep } from "./plan-templates";
export type { PlanTemplate, PlanTemplateStep } from "./plan-templates";
