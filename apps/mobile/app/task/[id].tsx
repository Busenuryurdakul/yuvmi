import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { alert } from "@/lib/alert";
import { Eyebrow } from "@/components/ui/Glass";
import { useAuth } from "@/context/AuthContext";
import { completeTask, fetchTodayTask, skipTask } from "@/lib/api/yuvmi";
import type { DailyTaskResponse } from "@/lib/api/types";
import { longDate } from "@/lib/formatDate";
import { theme } from "@/theme";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [task, setTask] = useState<DailyTaskResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.token) return;
    fetchTodayTask()
      .then((t) => setTask(t.id === id ? t : t))
      .catch(() => alert("Hata", "Görev yüklenemedi."))
      .finally(() => setLoading(false));
  }, [user?.token, id]);

  async function act(action: "complete" | "skip") {
    if (!user?.token || !task) return;
    try {
      if (action === "complete") await completeTask(task.id);
      else await skipTask(task.id);
      router.back();
    } catch (e) {
      alert("Hata", e instanceof Error ? e.message : "İşlem başarısız.");
    }
  }

  if (loading) return <LoadingScreen />;

  const done = task?.status === "completed" || task?.status === "skipped";

  return (
    <Screen>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Eyebrow>{longDate()}</Eyebrow>
        <View style={styles.titleRow}>
          <Text style={styles.kickerTitle}>Odak</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.title}>{task?.title}</Text>
      {task?.description ? <Text style={styles.body}>{task.description}</Text> : null}
      <View style={styles.actions}>
        {done ? (
          <Text style={styles.status}>
            {task?.status === "completed" ? "Tamamlandı" : "Bugün atlandı"}
          </Text>
        ) : (
          <>
            <Button label="Yaptım" onPress={() => void act("complete")} />
            <Button label="Bugün olmadı" variant="secondary" onPress={() => void act("skip")} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.space.xxl,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  kickerTitle: {
    color: theme.color.ink,
    fontFamily: theme.font.sansExtra,
    fontSize: theme.font.size.display,
    fontWeight: theme.font.weight.extra,
    letterSpacing: -0.8,
  },
  close: {
    color: theme.color.ink40,
    fontSize: 22,
  },
  title: {
    fontFamily: theme.font.sansBold,
    fontSize: 21,
    fontWeight: theme.font.weight.bold,
    color: theme.color.ink,
    marginBottom: theme.space.md,
  },
  body: {
    fontFamily: theme.font.sans,
    fontSize: 14.5,
    lineHeight: 22,
    color: theme.color.ink70,
  },
  actions: { marginTop: theme.space.xxxl, gap: theme.space.sm },
  status: {
    color: theme.color.ink70,
    fontFamily: theme.font.sans,
    fontSize: theme.font.size.md,
    textAlign: "center",
  },
});
