import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SubpageScreen } from "@/components/ui/SubpageScreen";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { BigStat, StatBlock } from "@/components/today/StatBlock";
import { alert } from "@/lib/alert";
import { useAuth } from "@/context/AuthContext";
import { applyWeeklyReview, fetchCurrentWeeklyReview } from "@/lib/api/yuvmi";
import type { WeeklyReviewResponse } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";
import { theme } from "@/theme";

export default function WeeklyReviewScreen() {
  const { user } = useAuth();
  const [review, setReview] = useState<WeeklyReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      setReview(await fetchCurrentWeeklyReview());
    } catch (error) {
      if (error instanceof ApiError && error.code === 404) setReview(null);
      else alert("Yüklenemedi", error instanceof Error ? error.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApply() {
    if (!user?.token || !review) return;
    setApplying(true);
    try {
      const plan = await applyWeeklyReview(review.id);
      alert("Plan güncellendi", `Plan v${plan.version} aktif.`);
      router.back();
    } catch (error) {
      alert("Uygulanamadı", error instanceof Error ? error.message : "Bir hata oluştu.");
    } finally {
      setApplying(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <SubpageScreen title="Haftalık değerlendirme">
      <Text style={styles.sub}>
        {review ? `${review.weekStartDate} · planın bu haftası.` : "7 günlük veri birikince otomatik oluşur."}
      </Text>

      {review ? (
        <>
          <View style={styles.duo}>
            <StatBlock label="Dolu gün" style={styles.duoItem}>
              <BigStat value={review.metrics.daysActive} suffix="/7" />
            </StatBlock>
            <StatBlock label="Küçük hâl" style={styles.duoItem}>
              <BigStat value={review.metrics.taskSkipped} suffix="gün" />
            </StatBlock>
          </View>
          <StatBlock label="Bu hafta görünen örüntü">
            <Text style={styles.body}>{review.summary || "Henüz yeterince örüntü yok."}</Text>
          </StatBlock>
          <StatBlock label="Öneri">
            <Text style={styles.body}>
              {review.adaptations[0] ?? "Plan sana uymuyorsa plan değişir. Sen değil."}
            </Text>
            {review.status !== "applied" && review.nextPlanVersion ? (
              <Button
                label="Planı güncelle"
                loading={applying}
                style={{ marginTop: 12 }}
                onPress={() => void handleApply()}
              />
            ) : null}
            <Button label="Bu hafta böyle kalsın" variant="secondary" style={{ marginTop: 8 }} onPress={() => router.back()} />
          </StatBlock>
        </>
      ) : (
        <StatBlock label="Henüz hazır değil">
          <Text style={styles.body}>Günlük kontrol ve niyetlerin birikince değerlendirme burada oluşur.</Text>
          <Button label="Yenile" variant="secondary" style={{ marginTop: 12 }} onPress={() => void load()} />
        </StatBlock>
      )}
    </SubpageScreen>
  );
}

const styles = StyleSheet.create({
  sub: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.color.ink70,
    lineHeight: 21,
    marginBottom: 18,
  },
  duo: {
    flexDirection: "row",
    gap: 9,
  },
  duoItem: {
    flex: 1,
  },
  body: {
    marginTop: 6,
    fontFamily: theme.font.sans,
    fontSize: 13.5,
    lineHeight: 21,
    color: theme.color.ink70,
  },
});
