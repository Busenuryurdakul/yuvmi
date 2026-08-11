import { useCallback, useState } from "react";
import { Alert, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { DailyTaskHero } from "@/components/task/DailyTaskHero";
import { AlignmentRing } from "@/components/alignment/AlignmentRing";
import { useAuth } from "@/context/AuthContext";
import { useTodayDashboard } from "@/hooks/useTodayDashboard";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { completeTask, skipTask } from "@/lib/api/yuvmi";
import { theme } from "@/theme";

export default function TodayScreen() {
  const { user } = useAuth();
  const { checkin, task, alignment, loading, error, refresh } = useTodayDashboard();
  const { pendingCount, enqueue } = useOfflineQueue(user?.token);
  const [taskLoading, setTaskLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function handleComplete() {
    if (!user?.token || !task) return;
    setTaskLoading(true);
    try {
      await completeTask(user.token, task.id);
      await refresh();
    } catch (e) {
      await enqueue({ type: "task_complete", payload: { taskId: task.id } });
      Alert.alert("Çevrimdışı kaydedildi", "Bağlantı gelince görev tamamlanacak.");
    } finally {
      setTaskLoading(false);
    }
  }

  async function handleSkip() {
    if (!user?.token || !task) return;
    setTaskLoading(true);
    try {
      await skipTask(user.token, task.id);
      await refresh();
    } catch (e) {
      await enqueue({ type: "task_skip", payload: { taskId: task.id } });
      Alert.alert("Çevrimdışı kaydedildi", "Bağlantı gelince görev atlanacak.");
    } finally {
      setTaskLoading(false);
    }
  }

  if (loading && !task && !checkin) return <LoadingScreen />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}>
      <PageHeader
        title="Bugün"
        subtitle={`Merhaba${user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}`}
      />

      {pendingCount > 0 ? (
        <Card>
          <Text style={styles.meta}>{pendingCount} çevrimdışı işlem senkron bekliyor.</Text>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
          <Button label="Tekrar dene" variant="secondary" onPress={() => void refresh()} />
        </Card>
      ) : null}

      <Card title="Check-in">
        {checkin ? (
          <View>
            <Text style={styles.meta}>
              Ruh hâli {checkin.mood}/5 · Enerji {checkin.energy}/5
            </Text>
            <Button label="Güncelle" variant="secondary" onPress={() => router.push("/check-in")} />
          </View>
        ) : (
          <View>
            <EmptyState
              emoji="☀️"
              title="Henüz bugünkü kaydın yok"
              description="Kısa bir check-in ile gününe başla."
            />
            <Button label="Check-in başlat" onPress={() => router.push("/check-in")} />
          </View>
        )}
      </Card>

      {task ? (
        <DailyTaskHero
          task={task}
          loading={taskLoading}
          onComplete={() => void handleComplete()}
          onSkip={() => void handleSkip()}
        />
      ) : (
        <Card title="Günün adımı">
          <EmptyState emoji="👣" title="Bugün için görev yok" description="Planın aktif mi kontrol et." />
        </Card>
      )}

      {alignment ? (
        <Card title="Hizalanma">
          <AlignmentRing alignment={alignment} compact />
          <Button label="Detay" variant="ghost" onPress={() => router.push("/alignment")} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: theme.color.destructive, marginBottom: theme.space.md },
  meta: { fontSize: theme.font.size.sm, color: theme.color.text.secondary, marginBottom: theme.space.md },
});
