import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import type { DailyTaskResponse } from "@/lib/api/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { theme } from "@/theme";

type DailyTaskHeroProps = {
  task: DailyTaskResponse;
  onComplete: () => void;
  onSkip: () => void;
  loading?: boolean;
};

export function DailyTaskHero({ task, onComplete, onSkip, loading }: DailyTaskHeroProps) {
  const done = task.status === "completed" || task.status === "skipped";

  return (
    <Card title="Bugünün adımı" subtitle="Tek odak — baskı yok.">
      <Text style={styles.title}>{task.title}</Text>
      {task.description ? <Text style={styles.description}>{task.description}</Text> : null}
      {done ? (
        <Text style={styles.status}>
          {task.status === "completed" ? "Tamamlandı ✓" : "Bugün atlandı — yarın devam ederiz"}
        </Text>
      ) : (
        <View style={styles.actions}>
          <Button label="Tamamladım" loading={loading} onPress={onComplete} />
          <Button label="Bugün atla" variant="secondary" disabled={loading} onPress={onSkip} />
          <Button
            label="Detay"
            variant="ghost"
            onPress={() => router.push(`/task/${task.id}`)}
          />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text.primary,
    marginBottom: theme.space.sm,
  },
  description: {
    fontSize: theme.font.size.sm,
    lineHeight: 22,
    color: theme.color.text.secondary,
    marginBottom: theme.space.lg,
  },
  status: {
    fontSize: theme.font.size.sm,
    color: theme.color.brand.tealText,
    fontWeight: theme.font.weight.medium,
  },
  actions: { gap: theme.space.sm },
});
