import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { PlanDiffView } from "@/components/plan/PlanDiffView";
import { useAuth } from "@/context/AuthContext";
import {
  applyWeeklyReview,
  fetchCurrentWeeklyReview,
  fetchPlanDiff,
  fetchPlans,
  updateWeeklyReview,
} from "@/lib/api/yuvmi";
import type { PlanDiffResponse, PlanResponse, WeeklyReviewResponse } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";
import { theme } from "@/theme";

export default function WeeklyReviewScreen() {
  const { user } = useAuth();
  const [review, setReview] = useState<WeeklyReviewResponse | null>(null);
  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [diff, setDiff] = useState<PlanDiffResponse | null>(null);
  const [reflection, setReflection] = useState("");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const [reviewData, planList] = await Promise.all([
        fetchCurrentWeeklyReview(user.token),
        fetchPlans(user.token),
      ]);
      setReview(reviewData);
      setReflection(reviewData.reflection);
      setPlans(planList);

      const active = planList.find((p) => p.status === "active");
      const previous = planList.find((p) => p.status === "superseded");
      if (active && previous) {
        const diffData = await fetchPlanDiff(user.token, previous.id, active.id);
        setDiff(diffData);
      } else {
        setDiff(null);
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === 404) {
        setReview(null);
      } else {
        Alert.alert("Yüklenemedi", error instanceof Error ? error.message : "Bir hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSaveReflection() {
    if (!user?.token || !review) return;
    try {
      const updated = await updateWeeklyReview(user.token, review.id, reflection);
      setReview(updated);
    } catch (error) {
      Alert.alert("Kaydedilemedi", error instanceof Error ? error.message : "Bir hata oluştu.");
    }
  }

  async function handleApply() {
    if (!user?.token || !review) return;
    setApplying(true);
    try {
      const plan = await applyWeeklyReview(user.token, review.id);
      Alert.alert("Plan güncellendi", `Plan v${plan.version} aktif.`);
      router.back();
    } catch (error) {
      Alert.alert("Uygulanamadı", error instanceof Error ? error.message : "Bir hata oluştu.");
    } finally {
      setApplying(false);
    }
  }

  if (loading) return <LoadingScreen />;

  if (!review) {
    return (
      <Screen>
        <PageHeader title="Haftalık değerlendirme" subtitle="7 günlük veri birikince otomatik oluşur." />
        <Card>
          <Text style={styles.body}>
            Henüz haftalık değerlendirme hazır değil. Check-in ve görevlerini tamamladıkça metrikler birikecek.
          </Text>
          <Button label="Yenile" variant="secondary" onPress={() => void load()} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title="Haftalık değerlendirme" subtitle={`Hafta başlangıcı: ${review.weekStartDate}`} />

      <Card title="Özet">
        <Text style={styles.body}>{review.summary}</Text>
      </Card>

      <Card title="Metrikler" style={styles.gap}>
        <Text style={styles.meta}>
          {review.metrics.daysActive} aktif gün · {review.metrics.checkinCount} check-in ·{" "}
          {review.metrics.taskCompleted} tamamlanan · {review.metrics.taskSkipped} atlanan
        </Text>
        {review.metrics.avgMood > 0 ? (
          <Text style={styles.meta}>
            Ort. ruh hâli {review.metrics.avgMood.toFixed(1)}/5 · enerji {review.metrics.avgEnergy.toFixed(1)}/5
          </Text>
        ) : null}
        {review.metrics.avgAlignment > 0 ? (
          <Text style={styles.meta}>Ort. hizalanma {review.metrics.avgAlignment.toFixed(0)}</Text>
        ) : null}
      </Card>

      <Card title="Önerilen uyarlama" style={styles.gap}>
        {review.adaptations.map((item) => (
          <Text key={item} style={styles.bullet}>
            • {item}
          </Text>
        ))}
      </Card>

      {diff ? (
        <Card title="Plan farkı" style={styles.gap}>
          <PlanDiffView diff={diff} />
        </Card>
      ) : null}

      {plans.length > 1 ? (
        <Card title="Plan geçmişi" style={styles.gap}>
          {plans.slice(0, 4).map((plan) => (
            <Text key={plan.id} style={styles.meta}>
              v{plan.version} · {plan.status} · {plan.title}
            </Text>
          ))}
        </Card>
      ) : null}

      <Card title="Yansıman" style={styles.gap}>
        <TextInput
          style={styles.input}
          value={reflection}
          onChangeText={setReflection}
          multiline
          placeholder="Bu hafta senin için ne ifade ediyor?"
          placeholderTextColor={theme.color.text.tertiary}
        />
        <Button label="Yansımayı kaydet" variant="secondary" onPress={() => void handleSaveReflection()} />
      </Card>

      {review.status !== "applied" && review.nextPlanVersion ? (
        <Button
          label={`Plan v${review.nextPlanVersion} onayla`}
          loading={applying}
          onPress={() => void handleApply()}
        />
      ) : (
        <Text style={styles.applied}>Bu değerlendirme uygulandı.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: theme.font.size.sm, lineHeight: 22, color: theme.color.text.secondary },
  meta: { fontSize: theme.font.size.sm, color: theme.color.text.secondary, marginBottom: theme.space.xs },
  bullet: { fontSize: theme.font.size.sm, color: theme.color.text.primary, lineHeight: 22, marginBottom: theme.space.xs },
  gap: { marginTop: theme.space.lg },
  input: {
    borderWidth: 1,
    borderColor: theme.color.line.firm,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: theme.font.size.md,
    color: theme.color.text.primary,
    marginBottom: theme.space.md,
  },
  applied: {
    textAlign: "center",
    color: theme.color.text.secondary,
    fontSize: theme.font.size.sm,
    marginTop: theme.space.lg,
  },
});
