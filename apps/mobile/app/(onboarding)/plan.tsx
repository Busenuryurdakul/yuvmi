import { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getRecommendedPlanTemplates, type PlanTemplate } from "@yuvmi/shared";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { PlanTemplatePicker } from "@/components/plan/PlanTemplatePicker";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { activatePlan, createPlan, fetchCurrentGoal, fetchFutureSelf } from "@/lib/api/yuvmi";
import { theme } from "@/theme";

/**
 * TODO(AI): Plan kartları kurulum adım 1–3 verisine göre AI ile üretilecek.
 * @see docs/PRD-AI.md — "Onboarding adım 4 — AI plan önerileri"
 * Girdi: FutureSelf + Goal (title, description, targetDate, domains)
 * Fallback: getRecommendedPlanTemplates(domains)
 */

export default function OnboardingPlanScreen() {
  const { user, markOnboardingComplete, refreshProfile } = useAuth();
  const { goalId, setGoalId, setPlanId } = useOnboarding();
  const [goalTitle, setGoalTitle] = useState<string | null>(null);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [selected, setSelected] = useState<PlanTemplate | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasRecommendations = useMemo(
    () => templates.some((t) => t.domain !== "generic"),
    [templates],
  );

  const loadContext = useCallback(async () => {
    if (!user?.token) {
      setInitializing(false);
      return;
    }
    setInitializing(true);
    try {
      const [goalResult, fsResult] = await Promise.allSettled([
        fetchCurrentGoal(user.token),
        fetchFutureSelf(user.token),
      ]);
      const goal = goalResult.status === "fulfilled" ? goalResult.value : null;
      const fs = fsResult.status === "fulfilled" ? fsResult.value : null;
      setGoalTitle(goal?.title ?? null);
      if (goal?.id) setGoalId(goal.id);
      const recommended = getRecommendedPlanTemplates(fs?.domains ?? []);
      setTemplates(recommended);
      setSelected((prev) => {
        if (prev && recommended.some((t) => t.id === prev.id)) return prev;
        return recommended[0] ?? null;
      });
    } finally {
      setInitializing(false);
    }
  }, [user?.token]);

  useFocusEffect(
    useCallback(() => {
      void loadContext();
    }, [loadContext]),
  );

  async function handleActivate() {
    if (!user?.token || !goalId || !selected) {
      const message = "Hedef veya plan şablonu bulunamadı.";
      setError(message);
      Alert.alert("Hata", message);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const plan = await createPlan(user.token, {
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
      await activatePlan(user.token, plan.id);
      markOnboardingComplete();
      await refreshProfile();
      router.replace("/(onboarding)/complete");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bir hata oluştu.";
      setError(message);
      Alert.alert("Plan aktifleştirilemedi", message);
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
        <PlanTemplatePicker
          templates={templates}
          selectedId={selected?.id}
          onSelect={setSelected}
          recommended={hasRecommendations}
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
