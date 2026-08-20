import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";
import { stampDate } from "@/lib/formatDate";
import { InkSheet } from "@/components/ui/InkSheet";
import type { AlignmentResponse, CheckinResponse, DailyTaskResponse } from "@/lib/api/types";

type InkRow = {
  label: string;
  value?: string;
  done: boolean;
  onPress: () => void;
};

type InkTodaySheetProps = {
  checkin: CheckinResponse | null;
  task: DailyTaskResponse | null;
  alignment: AlignmentResponse | null;
  pendingCount?: number;
  error?: string | null;
  onHal: () => void;
  onOdak: () => void;
  onHiza: () => void;
  onRetry?: () => void;
};

export function InkTodaySheet({
  checkin,
  task,
  alignment,
  pendingCount = 0,
  error,
  onHal,
  onOdak,
  onHiza,
  onRetry,
}: InkTodaySheetProps) {
  const taskDone = task?.status === "completed" || task?.status === "skipped";
  const taskValue =
    task?.status === "skipped"
      ? "Atlandı"
      : task?.status === "completed"
        ? "Tamamlandı"
        : task
          ? task.title
          : undefined;

  const rows: InkRow[] = [
    {
      label: "Hal",
      value: checkin ? `${checkin.mood}/5` : undefined,
      done: Boolean(checkin),
      onPress: onHal,
    },
    {
      label: "Odak",
      value: taskValue,
      done: Boolean(taskDone),
      onPress: onOdak,
    },
    {
      label: "Hiza",
      value: alignment ? String(alignment.overallScore) : undefined,
      done: Boolean(alignment),
      onPress: onHiza,
    },
  ];

  return (
    <InkSheet>
      <View style={styles.header}>
        <Text style={styles.title}>Bugün</Text>
        <View style={styles.stamp}>
          <Text style={styles.stampText}>{stampDate()}</Text>
        </View>
      </View>

      {error ? (
        <Pressable onPress={onRetry} style={styles.message}>
          <Text style={styles.error}>{error}</Text>
          <Text style={styles.retry}>Tekrar dene</Text>
        </Pressable>
      ) : null}

      {pendingCount > 0 ? (
        <Text style={styles.pending}>{pendingCount} çevrimdışı işlem bekliyor</Text>
      ) : null}

      <View style={styles.list}>
        {rows.map((row) => (
          <Pressable key={row.label} onPress={row.onPress} style={styles.row}>
            <Text style={[styles.check, row.done && styles.checkDone]}>{row.done ? "✓" : ""}</Text>
            <Text style={styles.label}>{row.label}</Text>
            {row.value ? (
              <Text style={styles.value} numberOfLines={1}>
                {row.value}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </View>
    </InkSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.space.lg,
  },
  title: {
    fontSize: theme.font.size.xxl,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.onInk,
  },
  stamp: {
    backgroundColor: theme.color.blue,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 52,
    alignItems: "center",
  },
  stampText: {
    color: theme.color.onInk,
    fontSize: 10,
    fontWeight: theme.font.weight.bold,
    letterSpacing: 0.4,
    textAlign: "center",
  },
  message: {
    marginBottom: theme.space.md,
  },
  error: {
    color: theme.color.blue,
    fontSize: theme.font.size.sm,
    marginBottom: 4,
  },
  retry: {
    color: theme.color.onInkMuted,
    fontSize: theme.font.size.xs,
  },
  pending: {
    color: theme.color.onInkMuted,
    fontSize: theme.font.size.xs,
    marginBottom: theme.space.md,
  },
  list: {
    gap: theme.space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.color.inkRaised,
    borderRadius: theme.radius.md,
    minHeight: 48,
    paddingHorizontal: theme.space.md,
    gap: theme.space.sm,
  },
  check: {
    width: 18,
    fontSize: 14,
    color: theme.color.ink40,
  },
  checkDone: {
    color: theme.color.onInkMuted,
  },
  label: {
    flex: 1,
    color: theme.color.onInk,
    fontSize: theme.font.size.md,
  },
  value: {
    maxWidth: "46%",
    color: theme.color.onInkMuted,
    fontSize: theme.font.size.sm,
    textAlign: "right",
  },
});
