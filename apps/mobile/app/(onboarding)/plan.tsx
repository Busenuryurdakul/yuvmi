import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { PLAN_TEMPLATES, type PlanTemplate } from "@yuvmi/shared";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/Button";
import { PlanTemplatePicker } from "@/components/plan/PlanTemplatePicker";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { activatePlan, createPlan } from "@/lib/api/yuvmi";
import { theme } from "@/theme";

export default function OnboardingPlanScreen() {
  const { user, markOnboardingComplete, refreshProfile } = useAuth();
  const { goalId, setPlanId } = useOnboarding();
  const [selected, setSelected] = useState<PlanTemplate>(PLAN_TEMPLATES[0]);
  const [loading, setLoading] = useState(false);

  async function handleActivate() {
    if (!user?.token || !goalId) {
      Alert.alert("Hata", "Hedef bulunamadı. Geri dönüp hedefi kaydet.");
      return;
    }
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
    } catch (error) {
      Alert.alert("Plan aktifleştirilemedi", error instanceof Error ? error.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <PageHeader title="Planın" subtitle="Bir şablon seç, sonra dilediğin gibi düzenle." />
      <Stepper current={4} total={4} />
      <Text style={styles.hint}>İlk günün görevi plan onaylandığında otomatik atanır.</Text>
      <PlanTemplatePicker selectedId={selected.id} onSelect={setSelected} />
      <Button label="Planı onayla" loading={loading} onPress={() => void handleActivate()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
    marginBottom: theme.space.lg,
    lineHeight: 20,
  },
});
