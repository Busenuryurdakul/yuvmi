import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Eyebrow, Glass } from "@/components/ui/Glass";
import { TapRow } from "@/components/ui/TapRow";
import { useAuth } from "@/context/AuthContext";
import { fetchActiveGoal, fetchActivePlan, fetchPlans, fetchTodayAlignment } from "@/lib/api/yuvmi";
import type { AlignmentResponse, GoalResponse, PlanResponse } from "@/lib/api/types";
import { shortStamp } from "@/lib/formatDate";
import { theme } from "@/theme";

function healthCopy(alignment: AlignmentResponse | null) {
  if (!alignment) {
    return { title: "Ritim kuruluyor", body: "Günlük adımlar birikince planın nabzı burada görünecek." };
  }
  if (alignment.overallScore >= 75) return { title: "Ritim yerinde", body: alignment.summaryExplanation };
  if (alignment.overallScore >= 45) return { title: "Biraz yoğun", body: alignment.summaryExplanation };
  return { title: "Hafifletilebilir", body: alignment.summaryExplanation };
}

export default function JourneyScreen() {
  const { user } = useAuth();
  const [goal, setGoal] = useState<GoalResponse | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [alignment, setAlignment] = useState<AlignmentResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.token) return;
    Promise.allSettled([
      fetchActiveGoal(user.token),
      fetchActivePlan(user.token),
      fetchPlans(user.token),
      fetchTodayAlignment(user.token),
    ]).then(([g, p, , a]) => {
      setGoal(g.status === "fulfilled" ? g.value : null);
      setPlan(p.status === "fulfilled" ? p.value : null);
      setAlignment(a.status === "fulfilled" ? a.value : null);
      setLoading(false);
    });
  }, [user?.token]);

  if (loading) return <LoadingScreen />;

  const steps = plan?.steps ?? [];
  const health = healthCopy(alignment);

  return (
    <Screen tabBar>
      <PageHeader
        eyebrow={goal?.title ?? "Yolculuk"}
        eyebrowRight={plan ? `Plan v${plan.version}` : "Plan yok"}
        title="Yolculuk"
        subtitle="Vizyonun günlük hâli. Her adım bir ana bağlı."
      />

      {!goal ? (
        <EmptyState title="Aktif hedef yok" description="Onboarding'de bir hedef oluştur veya yeni hedef ekle." />
      ) : null}

      {steps.map((step, index) => (
        <TapRow
          key={step.id}
          title={`${String(index + 1).padStart(2, "0")} · ${step.title}`}
          subtitle={step.description || undefined}
          arrow="›"
          onPress={() =>
            router.push(`/intention/new?stepId=${step.id}` as Href)
          }
        />
      ))}

      <Pressable onPress={() => router.push("/intention/new" as Href)} style={styles.add}>
        <Text style={styles.addText}>+ Niyet ekle</Text>
      </Pressable>

      <Glass style={styles.health}>
        <Eyebrow>Plan sağlığı</Eyebrow>
        <Text style={styles.healthBig}>{health.title}</Text>
        <Text style={styles.healthBody}>{health.body}</Text>
      </Glass>

      <View style={{ height: 16 }} />
      <TapRow
        title="Haftalık değerlendirme"
        subtitle="Bu haftanın ritmi, örüntüler ve plan önerisi"
        onPress={() => router.push("/weekly-review")}
      />
      <TapRow
        title="Plan geçmişi"
        subtitle={plan ? `v${plan.version} · ${shortStamp(plan.createdAt)}'te kuruldu` : "Henüz plan yok"}
        onPress={() => router.push("/plan-history" as Href)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  add: {
    marginTop: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.color.blueLight,
    borderRadius: 14,
    padding: 13,
    alignItems: "center",
  },
  addText: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 13.5,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.blueDeep,
  },
  health: {
    padding: 16,
    marginTop: 16,
  },
  healthBig: {
    fontFamily: theme.font.sansExtra,
    fontSize: 19,
    fontWeight: theme.font.weight.extra,
    letterSpacing: -0.3,
    color: theme.color.ink,
    marginTop: 5,
    marginBottom: 4,
  },
  healthBody: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.color.ink70,
    lineHeight: 20,
  },
});
