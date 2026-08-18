import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getRecommendedPlanTemplates, type PlanTemplate } from "@yuvmi/shared";
import { isAITemplate, toPlanTemplates } from "@/lib/planSuggestions";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { alert } from "@/lib/alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { PlanTemplatePicker } from "@/components/plan/PlanTemplatePicker";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";
import {
  activatePlan,
  createPlan,
  fetchCurrentGoal,
  fetchFutureSelf,
  fetchPlanSuggestions,
} from "@/lib/api/yuvmi";
import { AISuggestionHeader } from "@/components/ai/AISuggestionHeader";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { reportDecision } from "@/lib/aiDecision";
import { theme } from "@/theme";

/**
 * Plan kartları: consent varsa AI, yoksa getRecommendedPlanTemplates(domains).
 * @see docs/PRD-AI.md — "Onboarding adım 4 — AI plan önerileri"
 */

export default function OnboardingPlanScreen() {
  const { user, markOnboardingComplete, refreshProfile } = useAuth();
  const { goalId, setGoalId, setPlanId } = useOnboarding();
  const [goalTitle, setGoalTitle] = useState<string | null>(null);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  // The id rather than the template itself, so the selection survives the list
  // being swapped from static to AI (see `selected` below).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    state: aiState,
    data: aiData,
    grantAndGenerate,
  } = useAISuggestions({
    scope: "ai_plan_generation",
    fetcher: fetchPlanSuggestions,
    // Both the profile and the goal feed this generation, and the goal is what
    // the plan is actually built around — so wait for goalId, not just the token.
    enabled: Boolean(user?.token) && Boolean(goalId),
  });

  const aiTemplates = useMemo(
    () => (aiData?.templates.length ? toPlanTemplates(aiData.templates) : null),
    [aiData],
  );

  const visibleTemplates = aiState === "ready" && aiTemplates ? aiTemplates : templates;

  const hasRecommendations = useMemo(
    () => templates.some((t) => t.domain !== "generic"),
    [templates],
  );

  // Derived, not stored: the list can be swapped underneath the user when AI
  // templates arrive seconds after the static ones. Resolving the id during
  // render means a selection that is no longer on offer falls back to the
  // first card on its own, with no effect syncing two pieces of state.
  const selected = useMemo(
    () => visibleTemplates.find((t) => t.id === selectedId) ?? visibleTemplates[0] ?? null,
    [visibleTemplates, selectedId],
  );

  const loadContext = useCallback(async () => {
    if (!user?.token) {
      setInitializing(false);
      return;
    }
    setInitializing(true);
    try {
      const [goalResult, fsResult] = await Promise.allSettled([
        fetchCurrentGoal(),
        fetchFutureSelf(),
      ]);
      const goal = goalResult.status === "fulfilled" ? goalResult.value : null;
      const fs = fsResult.status === "fulfilled" ? fsResult.value : null;
      setGoalTitle(goal?.title ?? null);
      if (goal?.id) setGoalId(goal.id);
      // Selection is owned by the effect above — setting it here too would
      // fight it on every refocus, snapping an AI choice back to the static list.
      setTemplates(getRecommendedPlanTemplates(fs?.domains ?? []));
    } finally {
      setInitializing(false);
    }
  }, [user?.token, setGoalId]);

  useFocusEffect(
    useCallback(() => {
      void loadContext();
    }, [loadContext]),
  );

  async function handleActivate() {
    if (!user?.token || !goalId || !selected) {
      const message = "Hedef veya plan şablonu bulunamadı.";
      setError(message);
      alert("Hata", message);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const plan = await createPlan({
        goalId,
        title: selected.title,
        description: selected.description,
        steps: selected.steps.map((s, i) => ({
          dayOffset: s.dayOffset,
          title: s.title,
          description: s.description,
          sortOrder: i,
        })),
      });
      setPlanId(plan.id);
      await activatePlan(plan.id);
      // The picker offers whole templates and no way to edit one, so the only
      // two outcomes are "took an AI card" and "took a static card instead" —
      // there is no edited case to report here.
      if (aiState === "ready" && aiData?.jobId && aiTemplates) {
        reportDecision(aiData.jobId, isAITemplate(selected.id) ? "accepted" : "rejected");
      }
      markOnboardingComplete();
      await refreshProfile();
      router.replace("/(onboarding)/complete");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bir hata oluştu.";
      setError(message);
      alert("Plan aktifleştirilemedi", message);
    } finally {
      setLoading(false);
    }
  }

  if (initializing) return <LoadingScreen />;

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <PageHeader
        title="Planın"
        subtitle="Hedefine uygun iskelet seç — plan onaylanınca ilk günün görevi otomatik atanır."
      />
      <Stepper current={4} total={4} label="Kurulum" compact />

      {goalTitle ? (
        <Card title="Hedefin" style={styles.goalCard}>
          <Text style={styles.goalBody}>{goalTitle}</Text>
        </Card>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AISuggestionHeader
          state={aiState}
          fallbackLabel=""
          aiLabel="Hedefine göre hazırlandı"
          consentPitch="Hedefine ve Gelecekteki Ben profiline göre sana özel plan önerileri hazırlayabiliriz."
          onGrant={() => void grantAndGenerate()}
        />
        <PlanTemplatePicker
          templates={visibleTemplates}
          selectedId={selected?.id}
          onSelect={(t) => setSelectedId(t.id)}
          // The picker's own "recommended" label only makes sense for the
          // static list; AI cards carry the AI badge above instead.
          recommended={aiState === "ready" && aiTemplates ? false : hasRecommendations}
        />
      </ScrollView>

      <View style={styles.footer}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label="Planı onayla"
          loading={loading}
          disabled={!selected}
          onPress={() => void handleActivate()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  goalCard: {
    marginBottom: theme.space.sm,
  },
  goalBody: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
    lineHeight: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.space.md,
  },
  footer: {
    paddingTop: theme.space.md,
    borderTopWidth: 1,
    borderTopColor: theme.color.line.soft,
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  error: {
    color: theme.color.danger,
    fontSize: theme.font.size.sm,
    marginBottom: theme.space.sm,
    lineHeight: 20,
  },
});
