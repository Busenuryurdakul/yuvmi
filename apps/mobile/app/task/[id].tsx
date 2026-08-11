import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useAuth } from "@/context/AuthContext";
import { completeTask, fetchTodayTask, skipTask } from "@/lib/api/yuvmi";
import type { DailyTaskResponse } from "@/lib/api/types";
import { theme } from "@/theme";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [task, setTask] = useState<DailyTaskResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.token) return;
    fetchTodayTask(user.token)
      .then((t) => setTask(t.id === id ? t : t))
      .catch(() => Alert.alert("Hata", "Görev yüklenemedi."))
      .finally(() => setLoading(false));
  }, [user?.token, id]);

  async function act(action: "complete" | "skip") {
    if (!user?.token || !task) return;
    try {
      if (action === "complete") await completeTask(user.token, task.id);
      else await skipTask(user.token, task.id);
      router.back();
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "İşlem başarısız.");
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <Screen>
      <PageHeader title="Günün adımı" />
      <Text style={styles.title}>{task?.title}</Text>
      <Text style={styles.body}>{task?.description}</Text>
      <View style={styles.actions}>
        <Button label="Tamamladım" onPress={() => void act("complete")} />
        <Button label="Bugün atla" variant="secondary" onPress={() => void act("skip")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: theme.font.size.xl,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text.primary,
    marginBottom: theme.space.md,
  },
  body: { fontSize: theme.font.size.md, lineHeight: 24, color: theme.color.text.secondary },
  actions: { marginTop: theme.space.xxxl, gap: theme.space.sm },
});
