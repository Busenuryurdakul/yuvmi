import type { PlanTemplate } from "@yuvmi/shared";
import type { PlanTemplateSuggestion } from "@/lib/api/types";

/**
 * Adapts AI plan output to the shape PlanTemplatePicker renders, so onboarding
 * and the Yuvmi tab present a generated plan identically.
 *
 * domain "generic": the `domain` field exists only to order the static
 * template list. An AI suggestion is already built from the user's own domains,
 * so it needs no reordering — and inventing a domain here would make the
 * picker's "recommended" badge claim something that was never computed.
 */
export function toPlanTemplates(suggestions: PlanTemplateSuggestion[]): PlanTemplate[] {
  return suggestions.map((tpl, i) => ({
    id: `ai-${i}`,
    domain: "generic" as const,
    title: tpl.title,
    description: tpl.description,
    steps: tpl.steps.map((s) => ({
      dayOffset: s.dayOffset,
      title: s.title,
      description: s.description,
    })),
  }));
}

/** True for templates produced by toPlanTemplates — the id prefix is what
 *  separates "took the AI card" from "took a static one" when reporting the
 *  user's decision back for training. */
export function isAITemplate(id: string): boolean {
  return id.startsWith("ai-");
}
