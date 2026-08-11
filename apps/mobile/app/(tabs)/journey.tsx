import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { AlignmentRing } from "@/components/alignment/AlignmentRing";
import { useAuth } from "@/context/AuthContext";
import { fetchActiveGoal, fetchActivePlan, fetchPlans, fetchTodayAlignment } from "@/lib/api/yuvmi";
import type { AlignmentResponse, GoalResponse, PlanResponse } from "@/lib/api/types";
import { theme } from "@/theme";

export default function JourneyScreen() {
  const { user } = useAuth();
  const [goal, setGoal] = useState<GoalResponse | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [alignment, setAlignment] = useState<AlignmentResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.token) return;
    Promise.allSettled([
      fetchActiveGoal(user.token),
      fetchActivePlan(user.token),
      fetchPlans(user.token),
      fetchTodayAlignment(user.token),
    ]).then(([g, p, pl, a]) => {
      setGoal(g.status === "fulfilled" ? g.value : null);
      setPlan(p.status === "fulfilled" ? p.value : null);
      setPlans(pl.status === "fulfilled" ? pl.value : []);
      setAlignment(a.status === "fulfilled" ? a.value : null);
      setLoading(false);
    });
  }, [user?.token]);

  if (loading) return <LoadingScreen />;

  const supersededCount = plans.filter((p) => p.status === "superseded").length;

  return (
    <Screen>
      <PageHeader title="Yolculuk" subtitle="Hedef, plan ve hizalanma." />

      {goal ? (
        <Card title="Aktif hedef">
          <Text style={styles.title}>{goal.title}</Text>
          <Text style={styles.body}>{goal.description}</Text>
        </Card>
      ) : (
        <Card>
          <EmptyState
            emoji="🧭"
            title="Aktif hedef yok"
            description="Onboarding'de bir hedef oluştur veya yeni hedef ekle."
          />
        </Card>
      )}

      {plan ? (
        <Card title={`Plan v${plan.version}`} style={styles.gap}>
          <Text style={styles.body}>{plan.description ?? plan.title}</Text>
          <Text style={styles.meta}>{plan.steps.length} adım tanımlı</Text>
          {supersededCount > 0 ? (
            <Text style={styles.meta}>{supersededCount} önceki plan sürümü</Text>
          ) : null}
        </Card>
      ) : null}

      <Card title="Haftalık döngü" style={styles.gap}>
        <Text style={styles.body}>7 günlük veriden haftalık özet ve plan v2 önerisi.</Text>
        <Button label="Haftalık değerlendirme" onPress={() => router.push("/weekly-review")} />
      </Card>

      <Card title="Hizalanma" style={styles.gap}>
        {alignment ? (
          <>
            <AlignmentRing alignment={alignment} compact />
            <Button label="Faktör detayı" variant="secondary" onPress={() => router.push("/alignment")} />
          </>
        ) : (
          <EmptyState emoji="📈" title="Henüz hesaplanmadı" description="Check-in ve görevlerle oluşur." />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: theme.font.size.lg, fontWeight: theme.font.weight.semibold, color: theme.color.text.primary },
  body: { fontSize: theme.font.size.sm, lineHeight: 22, color: theme.color.text.secondary, marginTop: theme.space.sm },
  meta: { marginTop: theme.space.sm, fontSize: theme.font.size.xs, color: theme.color.text.tertiary },
  gap: { marginTop: theme.space.lg },
});
